import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db, { initDb } from './db.ts';
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026';
const PORT = 3000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const getGoogleAuth = (redirectUri: string) => {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

async function startServer() {
  try {
    initDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
  const app = express();
  app.set('trust proxy', true);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // WebSocket broadcast helper
  const broadcast = (businessId: string, type: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).businessId === businessId) {
        client.send(JSON.stringify({ type, data }));
      }
    });
  };

  wss.on('connection', (ws: any, req) => {
    // Simple auth for WS: extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        ws.businessId = decoded.businessId;
        ws.userId = decoded.id;
      } catch (err) {
        ws.close();
      }
    } else {
      ws.close();
    }
  });

  // Helper for Google Sheets Sync
  const syncToGoogleSheets = async (businessId: string, providedBaseUrl?: string) => {
    const integration = db.prepare('SELECT * FROM google_integrations WHERE business_id = ?').get(businessId) as any;
    if (!integration) return;

    // Use provided URL, then APP_URL, then localhost as fallback
    const baseUrl = providedBaseUrl || process.env.APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/integrations/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);
    
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.expiry_date
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
      console.log(`Starting sync to Google Sheets for business ${businessId} using redirectUri: ${redirectUri}`);
      let spreadsheetId = integration.spreadsheet_id;
      if (!spreadsheetId) {
        const resource = { properties: { title: `CRM - ${businessId}` } };
        const spreadsheet = await sheets.spreadsheets.create({ requestBody: resource, fields: 'spreadsheetId' });
        spreadsheetId = spreadsheet.data.spreadsheetId;
        db.prepare('UPDATE google_integrations SET spreadsheet_id = ? WHERE business_id = ?').run(spreadsheetId, businessId);
      }

      // Get spreadsheet metadata to check sheet names
      const ss = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetsList = ss.data.sheets || [];
      const sheetTitles = sheetsList.map(s => s.properties?.title);

      // Ensure 'Customers' sheet exists (rename first sheet if it's the default 'Sheet1')
      if (!sheetTitles.includes('Customers')) {
        if (sheetTitles.includes('Sheet1')) {
          const sheet1Id = sheetsList.find(s => s.properties?.title === 'Sheet1')?.properties?.sheetId;
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{ updateSheetProperties: { properties: { sheetId: sheet1Id, title: 'Customers' }, fields: 'title' } }]
            }
          });
        } else {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: [{ addSheet: { properties: { title: 'Customers' } } }] }
          });
        }
      }

      // Ensure 'Leads' sheet exists
      if (!sheetTitles.includes('Leads')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: 'Leads' } } }] }
        });
      }

      // Ensure 'Tasks' sheet exists
      if (!sheetTitles.includes('Tasks')) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: 'Tasks' } } }] }
        });
      }

      const customers = db.prepare('SELECT name, email, phone, company, status, created_at FROM customers WHERE business_id = ?').all(businessId) as any[];
      const leads = db.prepare('SELECT name, email, phone, status, source, value, created_at FROM leads WHERE business_id = ?').all(businessId) as any[];
      const tasks = db.prepare('SELECT title, description, status, due_date, priority, created_at FROM tasks WHERE business_id = ?').all(businessId) as any[];

      const customerRows = [['Name', 'Email', 'Phone', 'Company', 'Status', 'Created At'], ...customers.map(c => [c.name, c.email, c.phone, c.company, c.status, c.created_at])];
      const leadRows = [['Name', 'Email', 'Phone', 'Status', 'Source', 'Value', 'Created At'], ...leads.map(l => [l.name, l.email, l.phone, l.status, l.source, l.value, l.created_at])];
      const taskRows = [['Title', 'Description', 'Status', 'Due Date', 'Priority', 'Created At'], ...tasks.map(t => [t.title, t.description, t.status, t.due_date, t.priority, t.created_at])];

      // Update Customers Sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Customers!A1',
        valueInputOption: 'RAW',
        requestBody: { values: customerRows },
      });

      // Update Leads Sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Leads!A1',
        valueInputOption: 'RAW',
        requestBody: { values: leadRows },
      });

      // Update Tasks Sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Tasks!A1',
        valueInputOption: 'RAW',
        requestBody: { values: taskRows },
      });

      db.prepare("UPDATE google_integrations SET last_sync_at = CURRENT_TIMESTAMP WHERE business_id = ?").run(businessId);
      console.log(`Auto-sync successful for business ${businessId}`);
    } catch (err) {
      console.error('Auto-sync Error:', err);
    }
  };

  // --- Middleware ---

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Permission Middleware
  const checkPermission = (module: string, action: string) => {
    return (req: any, res: any, next: any) => {
      // Owners and Super Admins have all permissions
      if (req.user.role === 'owner' || req.user.role === 'super_admin') return next();
      
      try {
        const permissions = typeof req.user.permissions === 'string' 
          ? JSON.parse(req.user.permissions) 
          : req.user.permissions;
          
        if (!permissions) return res.status(403).json({ error: 'Forbidden: No permissions defined' });
        
        const modulePerms = permissions[module];
        if (modulePerms && modulePerms[action]) {
          return next();
        }
        
        res.status(403).json({ error: `Forbidden: Missing ${action} permission for ${module}` });
      } catch (err) {
        res.status(403).json({ error: 'Forbidden: Invalid permissions format' });
      }
    };
  };

  // --- API Routes ---

  // Google Login
  app.get('/api/auth/google/url', (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
      });
    }
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
      ],
      prompt: 'select_account'
    });

    res.json({ url });
  });

  app.get('/api/auth/google/callback', async (req: any, res) => {
    const { code } = req.query;
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email?.toLowerCase();
      const name = userInfo.data.name;

      if (!email) throw new Error('No email returned from Google');

      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      let business;

      if (!user) {
        // Create new business and user if not exists
        const businessId = randomUUID();
        const userId = randomUUID();
        const businessName = `${name}'s Business`;
        const passwordHash = bcrypt.hashSync(randomUUID(), 10);

        const insertBusiness = db.prepare('INSERT INTO businesses (id, name) VALUES (?, ?)');
        const insertUser = db.prepare('INSERT INTO users (id, business_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');

        const transaction = db.transaction(() => {
          insertBusiness.run(businessId, businessName);
          insertUser.run(userId, businessId, name, email, passwordHash, 'owner');
        });
        transaction();

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      }

      business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id) as any;
      const token = jwt.sign({ id: user.id, businessId: user.business_id, role: user.role, permissions: user.permissions }, JWT_SECRET, { expiresIn: '24h' });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_LOGIN_SUCCESS', 
                  token: '${token}',
                  user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions ? JSON.parse(user.permissions) : null })},
                  business: ${JSON.stringify(business)}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Login successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('Google Login Error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  // Auth
  app.post('/api/auth/register', (req, res) => {
    let { name, email, password, businessName } = req.body;
    email = email?.trim().toLowerCase();
    const businessId = randomUUID();
    const userId = randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered. Please login instead.' });
      }

      const defaultModules = JSON.stringify([
        'dashboard', 'customers', 'leads', 'quotes', 'subscriptions', 'invoices', 
        'projects', 'email-marketing', 'social-media', 'documents', 'tasks', 
        'notifications', 'automation', 'users-roles', 'integrations', 'reports'
      ]);

      const insertBusiness = db.prepare('INSERT INTO businesses (id, name, modules) VALUES (?, ?, ?)');
      const insertUser = db.prepare('INSERT INTO users (id, business_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');

      const transaction = db.transaction(() => {
        insertBusiness.run(businessId, businessName, defaultModules);
        insertUser.run(userId, businessId, name, email, hashedPassword, 'owner');
      });

      transaction();
      res.json({ success: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'An unexpected error occurred during registration.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();
    
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        return res.status(401).json({ error: 'No account found with this email. Please register first.' });
      }

      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id) as any;
      const token = jwt.sign({ id: user.id, businessId: user.business_id, role: user.role, permissions: user.permissions }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions ? JSON.parse(user.permissions) : null }, business });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'An unexpected error occurred during login.' });
    }
  });

  app.post('/api/auth/reset-password', (req, res) => {
    let { email, newPassword } = req.body;
    email = email?.trim().toLowerCase();

    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(404).json({ error: 'No account found with this email.' });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, user.id);

      res.json({ success: true, message: 'Password reset successfully. You can now login with your new password.' });
    } catch (err: any) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'An unexpected error occurred during password reset.' });
    }
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    try {
      const user = db.prepare('SELECT id, name, email, role, business_id FROM users WHERE id = ?').get(req.user.id) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id) as any;
      res.json({ user, business });
    } catch (err) {
      console.error('Auth me error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generic CRUD Helper
  const setupCrud = (entity: string, table: string, module: string, onCreated?: (item: any) => void, onUpdated?: (item: any) => void) => {
    app.get(`/api/${entity}`, authenticate, checkPermission(module, 'view'), (req: any, res: any) => {
      const items = db.prepare(`SELECT * FROM ${table} WHERE business_id = ? ORDER BY created_at DESC`).all(req.user.businessId);
      res.json(items);
    });

    app.post(`/api/${entity}`, authenticate, checkPermission(module, 'add'), async (req: any, res: any) => {
      const id = randomUUID();
      // Sanitize: convert empty strings to null
      const body = { ...req.body };
      Object.keys(body).forEach(key => {
        if (body[key] === '') body[key] = null;
      });

      const fields = Object.keys(body);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(f => body[f]);

      db.prepare(`INSERT INTO ${table} (id, business_id, ${fields.join(', ')}) VALUES (?, ?, ${placeholders})`)
        .run(id, req.user.businessId, ...values);
      
      const newItem = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      broadcast(req.user.businessId, `${entity}:created`, newItem);

      if (onCreated) onCreated({ ...newItem, business_Id: req.user.businessId, user: req.user });

      // Immediate Sync to Google Sheets (Database-First approach)
      const baseUrl = getBaseUrl(req);
      syncToGoogleSheets(req.user.businessId, baseUrl).catch(err => console.error('Auto-sync error:', err));

      res.json(newItem);
    });

    app.put(`/api/${entity}/:id`, authenticate, checkPermission(module, 'edit'), async (req: any, res: any) => {
      // Sanitize: convert empty strings to null
      const body = { ...req.body };
      Object.keys(body).forEach(key => {
        if (body[key] === '') body[key] = null;
      });

      const fields = Object.keys(body).filter(f => f !== 'id' && f !== 'business_id' && f !== 'created_at');
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => body[f]);

      db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ? AND business_id = ?`)
        .run(...values, req.params.id, req.user.businessId);
      
      const updatedItem = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id) as any;
      broadcast(req.user.businessId, `${entity}:updated`, updatedItem);

      if (onUpdated) onUpdated({ ...updatedItem, business_Id: req.user.businessId, user: req.user });

      // Automatic Lead to Customer Conversion
      if (entity === 'leads' && updatedItem.status === 'qualified') {
        try {
          const customerId = randomUUID();
          const transaction = db.transaction(() => {
            // Create Customer
            db.prepare(`
              INSERT INTO customers (id, business_id, name, email, phone, whatsapp, status, source, assigned_to)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              customerId, 
              req.user.businessId, 
              updatedItem.name, 
              updatedItem.email, 
              updatedItem.phone, 
              updatedItem.whatsapp,
              'active', 
              updatedItem.source || 'Auto Conversion (Qualified)',
              updatedItem.assigned_to
            );

            // Update Lead Status to closed_won (or keep as qualified if preferred, but usually conversion means winning)
            db.prepare('UPDATE leads SET status = ? WHERE id = ?').run('closed_won', req.params.id);

            // Audit Log
            db.prepare('INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(randomUUID(), req.user.businessId, req.user.id, 'convert', 'lead', req.params.id, `Automatically converted qualified lead ${updatedItem.name} to customer`);
          });

          transaction();

          const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
          broadcast(req.user.businessId, 'customers:created', newCustomer);
          broadcast(req.user.businessId, 'leads:updated', { id: req.params.id, status: 'closed_won' });
        } catch (err) {
          console.error('Auto-conversion Error:', err);
        }
      }

      // Immediate Sync to Google Sheets
      const baseUrl = getBaseUrl(req);
      syncToGoogleSheets(req.user.businessId, baseUrl).catch(err => console.error('Auto-sync error:', err));
      
      res.json(updatedItem);
    });

    app.delete(`/api/${entity}/:id`, authenticate, checkPermission(module, 'delete'), (req: any, res: any) => {
      db.prepare(`DELETE FROM ${table} WHERE id = ? AND business_id = ?`).run(req.params.id, req.user.businessId);
      broadcast(req.user.businessId, `${entity}:deleted`, { id: req.params.id });

      // Immediate Sync to Google Sheets
      const baseUrl = getBaseUrl(req);
      syncToGoogleSheets(req.user.businessId, baseUrl).catch(err => console.error('Auto-sync error:', err));

      res.json({ success: true });
    });
  };


  setupCrud('customers', 'customers', 'customers', (item) => triggerAutomation(item.business_Id, 'customer_created', item));
  setupCrud('leads', 'leads', 'leads', (item) => triggerAutomation(item.business_Id, 'lead_created', item), (item) => triggerAutomation(item.business_Id, 'lead_updated', item));
  setupCrud('subscriptions', 'subscriptions', 'invoices');
  setupCrud('invoices', 'invoices', 'invoices', (item) => triggerAutomation(item.business_Id, 'invoice_created', item));
  setupCrud('projects', 'projects', 'products');
  setupCrud('tasks', 'tasks', 'tasks', 
    (item) => {
      handleMentions(item.business_Id, item.description, item.id, item.title, item.user.id);
      triggerAutomation(item.business_Id, 'task_created', item);
    },
    (item) => {
      handleMentions(item.business_Id, item.description, item.id, item.title, item.user.id);
      triggerAutomation(item.business_Id, 'task_updated', item);
    }
  );
  setupCrud('reminder-templates', 'reminder_templates', 'social');
  setupCrud('email-campaigns', 'email_campaigns', 'social');
  setupCrud('quotes', 'quotes', 'leads', (item) => triggerAutomation(item.business_Id, 'quote_created', item));
  setupCrud('documents', 'documents', 'documents');
  setupCrud('social-posts', 'social_posts', 'social');
  setupCrud('automation-rules', 'automation_rules', 'automation');
  setupCrud('integrations', 'integrations', 'settings');
  setupCrud('ecommerce-orders', 'ecommerce_orders', 'products');
  setupCrud('payments', 'payments', 'invoices');

  // Lead Conversion
  app.post('/api/leads/:id/convert', authenticate, checkPermission('leads', 'edit'), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND business_id = ?').get(id, req.user.businessId) as any;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      const customerId = randomUUID();
      const transaction = db.transaction(() => {
        // Create Customer
        db.prepare(`
          INSERT INTO customers (id, business_id, name, email, phone, whatsapp, status, source, assigned_to)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          customerId, 
          req.user.businessId, 
          lead.name, 
          lead.email, 
          lead.phone, 
          lead.whatsapp,
          'active', 
          lead.source || 'Lead Conversion',
          lead.assigned_to
        );

        // Update Lead Status
        db.prepare('UPDATE leads SET status = ? WHERE id = ?').run('closed_won', id);

        // Audit Log
        db.prepare('INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(randomUUID(), req.user.businessId, req.user.id, 'convert', 'lead', id, `Converted lead ${lead.name} to customer`);
      });

      transaction();

      const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
      broadcast(req.user.businessId, 'customers:created', newCustomer);
      broadcast(req.user.businessId, 'leads:updated', { id, status: 'closed_won' });

      res.json({ success: true, customer: newCustomer });
    } catch (err: any) {
      console.error('Conversion Error:', err);
      res.status(500).json({ error: 'Failed to convert lead to customer' });
    }
  });

  // --- Integrations Sync Logic ---
  app.post('/api/integrations/:id/sync', authenticate, checkPermission('settings', 'edit'), async (req: any, res: any) => {
    const { id } = req.params;
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ? AND business_id = ?').get(id, req.user.businessId) as any;
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    try {
      if (integration.provider === 'shopify') {
        // Mock Shopify Sync
        const mockOrders = [
          { id: randomUUID(), external_id: 'SH-1001', email: 'customer1@example.com', total: 150.00, status: 'paid' },
          { id: randomUUID(), external_id: 'SH-1002', email: 'customer2@example.com', total: 85.50, status: 'pending' }
        ];
        for (const order of mockOrders) {
          db.prepare('INSERT OR IGNORE INTO ecommerce_orders (id, business_id, integration_id, external_order_id, customer_email, total_amount, status, order_date) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
            .run(order.id, req.user.businessId, id, order.external_id, order.email, order.total, order.status);
        }
      } else if (integration.provider === 'stripe') {
        // Mock Stripe Sync
        const mockPayments = [
          { id: randomUUID(), external_id: 'ch_123', amount: 150.00, status: 'succeeded', method: 'card' },
          { id: randomUUID(), external_id: 'ch_456', amount: 85.50, status: 'pending', method: 'card' }
        ];
        for (const payment of mockPayments) {
          db.prepare('INSERT OR IGNORE INTO payments (id, business_id, integration_id, external_payment_id, amount, status, method) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(payment.id, req.user.businessId, id, payment.external_id, payment.amount, payment.status, payment.method);
        }
      }

      db.prepare('UPDATE integrations SET last_sync_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?')
        .run('connected', id);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Sync Error:', err);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  // --- Automation Trigger Helper ---
  const triggerAutomation = async (businessId: string, event: string, context: any) => {
    const rules = db.prepare('SELECT * FROM automation_rules WHERE business_id = ? AND trigger_event = ? AND is_active = 1').all(businessId, event) as any[];
    for (const rule of rules) {
      const data = JSON.parse(rule.action_data || '{}');
      
      if (rule.action_type === 'create_task') {
        const id = randomUUID();
        db.prepare('INSERT INTO tasks (id, business_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, businessId, data.title || `Auto Task: ${event}`, data.description || `Triggered by ${event}`, 'pending', 'medium');
        broadcast(businessId, 'tasks:created', { id, title: data.title });
      }

      if (rule.action_type === 'send_email') {
        const id = randomUUID();
        db.prepare('INSERT INTO email_campaigns (id, business_id, name, subject, content, status) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, businessId, `Auto: ${rule.name}`, data.subject || 'Automated Message', data.content || 'Hello!', 'draft');
        broadcast(businessId, 'email-campaigns:created', { id, name: `Auto: ${rule.name}` });
      }

      if (rule.action_type === 'notify_user') {
        const id = randomUUID();
        db.prepare('INSERT INTO notifications (id, business_id, title, message) VALUES (?, ?, ?, ?)')
          .run(id, businessId, data.title || 'Automation Triggered', data.message || `Rule ${rule.name} was triggered by ${event}`);
        broadcast(businessId, 'notifications:created', { id, title: data.title });
      }

      // --- New Automation Functions ---

      if (rule.action_type === 'convert_lead' && context?.id && event === 'lead_updated') {
        // Auto convert to customer logic
        const customerId = randomUUID();
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(context.id) as any;
        if (lead) {
          db.prepare(`
            INSERT INTO customers (id, business_id, name, email, phone, whatsapp, status, source, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(customerId, businessId, lead.name, lead.email, lead.phone, lead.whatsapp, 'active', lead.source || 'Automation', lead.assigned_to);
          db.prepare('UPDATE leads SET status = ? WHERE id = ?').run('closed_won', context.id);
          broadcast(businessId, 'customers:created', { id: customerId, name: lead.name });
          broadcast(businessId, 'leads:updated', { id: context.id, status: 'closed_won' });
        }
      }

      if (rule.action_type === 'create_invoice' && context?.id) {
        const invId = randomUUID();
        const number = `INV-${Math.floor(Math.random() * 100000)}`;
        db.prepare(`
          INSERT INTO invoices (id, business_id, customer_id, number, date, due_date, total, status)
          VALUES (?, ?, ?, ?, CURRENT_DATE, CURRENT_DATE, ?, ?)
        `).run(invId, businessId, context.customer_id || context.id, number, context.total || 0, 'draft');
        broadcast(businessId, 'invoices:created', { id: invId, number });
      }

      if (rule.action_type === 'auto_assign' && context?.id) {
        const managers = db.prepare("SELECT id FROM users WHERE business_id = ? AND role IN ('owner', 'manager')").all(businessId) as any[];
        if (managers.length > 0) {
          const randomManager = managers[Math.floor(Math.random() * managers.length)].id;
          const table = event.startsWith('task') ? 'tasks' : event.startsWith('lead') ? 'leads' : null;
          if (table) {
            db.prepare(`UPDATE ${table} SET assigned_to = ? WHERE id = ?`).run(randomManager, context.id);
            broadcast(businessId, `${table}:updated`, { id: context.id, assigned_to: randomManager });
          }
        }
      }

      if (rule.action_type === 'whatsapp_alert' && context?.id) {
        console.log(`[Automation] Mock WhatsApp Alert for ${event} on ${context.id}`);
      }

      if (rule.action_type === 'set_field' && context?.id) {
        const { field, value } = data;
        const table = event.split('_')[0] + 's';
        try {
          db.prepare(`UPDATE ${table} SET ${field} = ? WHERE id = ?`).run(value, context.id);
          broadcast(businessId, `${table}:updated`, { id: context.id, [field]: value });
        } catch (e) {}
      }
    }
  };

  const handleMentions = (businessId: string, text: string, taskId: string, taskTitle: string, senderId: string) => {
    if (!text) return;
    const mentions = text.match(/@(\w+)/g);
    if (mentions) {
      mentions.forEach(mention => {
        const search = mention.slice(1).toLowerCase();
        const user = db.prepare("SELECT id, name FROM users WHERE business_id = ? AND LOWER(name) LIKE ?").get(businessId, `%${search}%`) as any;
        if (user && user.id !== senderId) {
          const id = randomUUID();
          db.prepare('INSERT INTO notifications (id, business_id, user_id, title, message) VALUES (?, ?, ?, ?, ?)')
            .run(id, businessId, user.id, 'New Mention', `You were mentioned in task: "${taskTitle}"`);
          broadcast(businessId, 'notifications:created', { id, title: 'New Mention', user_id: user.id });
        }
      });
    }
  };

  // Update Business Settings
  app.put('/api/business', authenticate, (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only owners can change settings' });
    const { name, logo_url, primary_color, secondary_color, contact_email, currency, modules } = req.body;
    try {
      db.prepare('UPDATE businesses SET name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, contact_email = ?, currency = ?, modules = ? WHERE id = ?')
        .run(name, logo_url, primary_color, secondary_color, contact_email, currency || 'EGP', modules || null, req.user.businessId);
      
      // Update audit log
      db.prepare('INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), req.user.businessId, req.user.id, 'updated', 'settings', req.user.businessId, `Updated business settings: ${name}`);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Email Campaign Actions
  app.post('/api/email-campaigns/:id/send', authenticate, checkPermission('social', 'edit'), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const campaign = db.prepare('SELECT * FROM email_campaigns WHERE id = ? AND business_id = ?').get(id, req.user.businessId) as any;
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.businessId) as any;
      const customers = db.prepare('SELECT email, name FROM customers WHERE business_id = ? AND email IS NOT NULL').all(req.user.businessId) as any[];

      if (customers.length === 0) {
        return res.status(400).json({ error: 'No customers with email addresses found' });
      }

      const config = business.email_config ? JSON.parse(business.email_config) : {};
      const provider = business.email_provider || 'mock';

      console.log(`Sending campaign "${campaign.name}" to ${customers.length} customers using ${provider}...`);

      if (provider === 'resend' && config.apiKey) {
        const resend = new Resend(config.apiKey);
        for (const customer of customers) {
          await resend.emails.send({
            from: business.contact_email || 'onboarding@resend.dev',
            to: customer.email,
            subject: campaign.subject,
            html: campaign.content.replace('{name}', customer.name)
          });
        }
      } else if (provider === 'smtp' && config.host) {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: parseInt(config.port),
          secure: config.port === '465',
          auth: {
            user: config.user,
            pass: config.pass
          }
        });
        for (const customer of customers) {
          await transporter.sendMail({
            from: business.contact_email || config.user,
            to: customer.email,
            subject: campaign.subject,
            html: campaign.content.replace('{name}', customer.name)
          });
        }
      } else {
        // Mock sending
        console.log('MOCK SENDING ENABLED');
        for (const customer of customers) {
          console.log(`[MOCK] Sending email to ${customer.email}: ${campaign.subject}`);
        }
      }

      db.prepare("UPDATE email_campaigns SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?")
        .run(id, req.user.businessId);
      
      res.json({ success: true, count: customers.length });
    } catch (err: any) {
      console.error('Failed to send campaign:', err);
      res.status(500).json({ error: `Failed to send campaign: ${err.message}` });
    }
  });

  // Social Post Actions
  app.post('/api/social-posts/:id/post', authenticate, checkPermission('social', 'edit'), (req: any, res: any) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE social_posts SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ?")
        .run(id, req.user.businessId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to post' });
    }
  });

  // Hook into Lead creation for automation
  const originalLeadsPost = app._router.stack.find((s: any) => s.route && s.route.path === '/api/leads' && s.route.methods.post);
  // Note: setupCrud already handles this, but we can add a custom hook if needed.
  // For simplicity, I'll modify setupCrud to accept an optional callback.

  // --- Google Sheets Integration ---
  const getBaseUrl = (req: any) => {
    const dynamicUrl = `${req.protocol}://${req.get('host')}`;
    const envUrl = process.env.APP_URL;
    
    // If APP_URL is set and doesn't match dynamic URL, log a warning
    if (envUrl && envUrl.replace(/\/$/, '') !== dynamicUrl.replace(/\/$/, '')) {
      console.warn(`APP_URL mismatch: env=${envUrl}, dynamic=${dynamicUrl}. Using dynamic URL for reliability.`);
    }
    
    return dynamicUrl;
  };

  app.get('/api/integrations/google/status', authenticate, (req: any, res) => {
    const integration = db.prepare('SELECT spreadsheet_id, last_sync_at FROM google_integrations WHERE business_id = ?').get(req.user.businessId) as any;
    res.json({ connected: !!integration, ...integration });
  });

  app.get('/api/integrations/google/url', authenticate, (req: any, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
      });
    }
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/integrations/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
      prompt: 'consent',
      state: req.user.businessId
    });

    res.json({ url });
  });

  app.get('/api/integrations/google/callback', async (req: any, res) => {
    const { code, state: businessId } = req.query;
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/integrations/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);

    console.log('Google OAuth Callback received:', { 
      businessId, 
      hasCode: !!code, 
      baseUrl, 
      redirectUri 
    });

    try {
      if (!code) throw new Error('No code provided in callback');
      
      const { tokens } = await oauth2Client.getToken(code as string);
      console.log('Tokens received successfully');
      
      db.prepare(`
        INSERT INTO google_integrations (business_id, access_token, refresh_token, expiry_date)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(business_id) DO UPDATE SET
          access_token = excluded.access_token,
          refresh_token = COALESCE(excluded.refresh_token, google_integrations.refresh_token),
          expiry_date = excluded.expiry_date
      `).run(businessId, tokens.access_token, tokens.refresh_token, tokens.expiry_date);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Google Sheets connected successfully. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google OAuth Error:', err);
      res.status(500).send(`Authentication failed: ${err.message}`);
    }
  });

  app.post('/api/integrations/google/sync', authenticate, async (req: any, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      await syncToGoogleSheets(req.user.businessId, baseUrl);
      res.json({ success: true });
    } catch (err) {
      console.error('Sync Error:', err);
      res.status(500).json({ error: 'Failed to sync with Google Sheets' });
    }
  });

  app.post('/api/integrations/google/pull', authenticate, async (req: any, res) => {
    const businessId = req.user.businessId;
    const integration = db.prepare('SELECT * FROM google_integrations WHERE business_id = ?').get(businessId) as any;
    if (!integration || !integration.spreadsheet_id) return res.status(400).json({ error: 'Google Sheets not connected' });

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/integrations/google/callback`;
    const oauth2Client = getGoogleAuth(redirectUri);
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.expiry_date
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheetId = integration.spreadsheet_id;

    try {
      // Helper to pull a specific sheet
      const pullSheet = async (sheetName: string, table: string, columns: string[]) => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A2:Z`, // Skip header
        });

        const rows = response.data.values || [];
        if (rows.length === 0) return;

        // Simple strategy: Clear local table and re-import (for this demo/CRM context)
        // In a real production app, we would do a merge based on IDs
        db.prepare(`DELETE FROM ${table} WHERE business_id = ?`).run(businessId);

        const placeholders = columns.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT INTO ${table} (id, business_id, ${columns.join(', ')}) VALUES (?, ?, ${placeholders})`);

        for (const row of rows) {
          const id = randomUUID();
          // Map row array to column values
          const values = columns.map((_, index) => row[index] || null);
          insertStmt.run(id, businessId, ...values);
        }
      };

      await pullSheet('Customers', 'customers', ['name', 'email', 'phone', 'company', 'status', 'created_at']);
      await pullSheet('Leads', 'leads', ['name', 'email', 'phone', 'status', 'source', 'value', 'created_at']);
      await pullSheet('Tasks', 'tasks', ['title', 'description', 'status', 'due_date', 'priority', 'created_at']);

      res.json({ success: true });
    } catch (err) {
      console.error('Pull Error:', err);
      res.status(500).json({ error: 'Failed to pull data from Google Sheets' });
    }
  });

  // Reports API
  app.get('/api/reports', authenticate, checkPermission('reports', 'view'), (req: any, res: any) => {
    const businessId = req.user.businessId;

    // 1. Revenue by Month (Last 6 months)
    const revenueByMonth = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(total) as total
      FROM invoices 
      WHERE business_id = ? AND status = 'paid'
      AND date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(businessId);

    // 2. Leads by Status
    const leadsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM leads
      WHERE business_id = ?
      GROUP BY status
    `).all(businessId);

    // 3. Leads by Source
    const leadsBySource = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM leads
      WHERE business_id = ?
      GROUP BY source
    `).all(businessId);

    // 4. Customer Growth (Last 6 months)
    const customerGrowth = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM customers
      WHERE business_id = ?
      AND created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(businessId);

    res.json({
      revenueByMonth,
      leadsByStatus,
      leadsBySource,
      customerGrowth
    });
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', authenticate, checkPermission('dashboard', 'view'), (req: any, res: any) => {
    const businessId = req.user.businessId;
    const stats = {
      totalCustomers: db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ?').get(businessId),
      activeLeads: db.prepare("SELECT COUNT(*) as count FROM leads WHERE business_id = ? AND status != 'closed'").get(businessId),
      totalSales: db.prepare("SELECT SUM(total) as sum FROM invoices WHERE business_id = ? AND status = 'paid'").get(businessId),
      expiringSubscriptions: db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE business_id = ? AND end_date <= date('now', '+30 days')").get(businessId),
      pendingTasks: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE business_id = ? AND status = 'pending'").get(businessId),
      totalProjects: db.prepare('SELECT COUNT(*) as count FROM projects WHERE business_id = ?').get(businessId),
    };
    res.json(stats);
  });

  // Recent Activity API
  app.get('/api/dashboard/activity', authenticate, checkPermission('dashboard', 'view'), (req: any, res: any) => {
    const businessId = req.user.businessId;
    const activities = db.prepare(`
      SELECT action, entity_type, details, created_at
      FROM audit_logs
      WHERE business_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(businessId);
    res.json(activities);
  });

  // --- Users & Roles ---
  app.get('/api/users', authenticate, checkPermission('users', 'view'), (req: any, res: any) => {
    const users = db.prepare('SELECT id, name, email, role, permissions, created_at FROM users WHERE business_id = ?').all(req.user.businessId);
    res.json(users.map((u: any) => ({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : null })));
  });

  app.post('/api/users', authenticate, (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { name, email, role, permissions, password } = req.body;
    const id = randomUUID();
    
    // Use provided password or generate a random one
    const passwordHash = bcrypt.hashSync(password || randomUUID(), 10);
    
    try {
      db.prepare('INSERT INTO users (id, business_id, name, email, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.user.businessId, name, email, passwordHash, role, permissions ? JSON.stringify(permissions) : null);
      
      db.prepare('INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), req.user.businessId, req.user.id, 'create', 'user', id, JSON.stringify({ name, email, role, permissions }));

      res.json({ id, name, email, role, permissions });
    } catch (err) {
      res.status(400).json({ error: 'User already exists' });
    }
  });

  app.put('/api/users/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { name, email, role, permissions, password } = req.body;
    
    try {
      if (password) {
        const passwordHash = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET name = ?, email = ?, role = ?, permissions = ?, password_hash = ? WHERE id = ? AND business_id = ?')
          .run(name, email, role, permissions ? JSON.stringify(permissions) : null, passwordHash, req.params.id, req.user.businessId);
      } else {
        db.prepare('UPDATE users SET name = ?, email = ?, role = ?, permissions = ? WHERE id = ? AND business_id = ?')
          .run(name, email, role, permissions ? JSON.stringify(permissions) : null, req.params.id, req.user.businessId);
      }
      
      db.prepare('INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), req.user.businessId, req.user.id, 'update', 'user', req.params.id, JSON.stringify({ name, email, role, permissions }));

      res.json({ id: req.params.id, name, email, role, permissions });
    } catch (err) {
      res.status(400).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    db.prepare('DELETE FROM users WHERE id = ? AND business_id = ?').run(req.params.id, req.user.businessId);
    res.json({ success: true });
  });

  // --- Notifications ---
  app.get('/api/notifications', authenticate, (req: any, res) => {
    const notifications = db.prepare('SELECT * FROM notifications WHERE business_id = ? AND (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50')
      .all(req.user.businessId, req.user.id);
    res.json(notifications);
  });

  app.post('/api/notifications/mark-all-read', authenticate, (req: any, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE business_id = ? AND (user_id = ? OR user_id IS NULL)')
      .run(req.user.businessId, req.user.id);
    res.json({ success: true });
  });

  app.put('/api/notifications/:id', authenticate, (req: any, res) => {
    const { is_read } = req.body;
    db.prepare('UPDATE notifications SET is_read = ? WHERE id = ? AND business_id = ? AND (user_id = ? OR user_id IS NULL)')
      .run(is_read, req.params.id, req.user.businessId, req.user.id);
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', authenticate, (req: any, res) => {
    db.prepare('DELETE FROM notifications WHERE id = ? AND business_id = ? AND (user_id = ? OR user_id IS NULL)')
      .run(req.params.id, req.user.businessId, req.user.id);
    res.json({ success: true });
  });

  // --- Quotes ---
  app.get('/api/public/quotes/:id/pdf', async (req, res) => {
    try {
      const quote = db.prepare(`
        SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               b.name as business_name, b.logo_url as business_logo, b.primary_color, b.secondary_color, b.currency as business_currency
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN businesses b ON q.business_id = b.id
        WHERE q.id = ?
      `).get(req.params.id) as any;

      if (!quote) return res.status(404).json({ error: 'Quote not found' });

      const items = quote.items ? JSON.parse(quote.items) : [];
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Quote_${quote.number}.pdf`);

      doc.pipe(res);

      // --- Header ---
      doc.fontSize(20).text(quote.business_name, { align: 'left' });
      doc.fontSize(10).text('Sales Proposition', { align: 'left' }).moveDown();
      
      doc.fontSize(25).fillColor('#475569').text('QUOTE', 350, 50, { align: 'right' });
      doc.fontSize(12).text(`#${quote.number}`, { align: 'right' }).moveDown();
      doc.fillColor('black');

      // --- Meta Info ---
      doc.fontSize(10).text('DATE:', 50, 150);
      doc.text(new Date(quote.date).toLocaleDateString(), 120, 150);
      
      doc.text('VALID UNTIL:', 50, 165);
      doc.text(new Date(quote.expiry_date).toLocaleDateString(), 120, 165).moveDown();

      // --- Customer ---
      doc.fontSize(12).text('PREPARED FOR:', 50, 200, { underline: true });
      doc.fontSize(14).text(quote.customer_name, 50, 220);
      if (quote.customer_email) doc.fontSize(10).text(quote.customer_email);
      if (quote.customer_phone) doc.fontSize(10).text(quote.customer_phone).moveDown();

      // --- Table ---
      const tableTop = 300;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('DESCRIPTION', 50, tableTop);
      doc.text('QTY', 300, tableTop, { width: 50, align: 'right' });
      doc.text('PRICE', 350, tableTop, { width: 100, align: 'right' });
      doc.text('TOTAL', 450, tableTop, { width: 100, align: 'right' });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 30;
      doc.font('Helvetica');
      items.forEach((item: any) => {
        const itemTotal = item.quantity * item.price;
        doc.text(item.description, 50, y);
        doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
        doc.text(`${item.price.toFixed(2)}`, 350, y, { width: 100, align: 'right' });
        doc.text(`${itemTotal.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
        y += 20;
      });

      // --- Footer ---
      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('TOTAL AMOUNT:', 300, y + 30);
      doc.text(`${quote.total.toFixed(2)} ${quote.business_currency || 'EGP'}`, 450, y + 30, { width: 100, align: 'right' });

      doc.fontSize(10).font('Helvetica').text('Certified Digital Document', 50, 700, { align: 'center', oblique: true });

      doc.end();
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  app.get('/api/public/quotes/:id', async (req, res) => {
    try {
      const quote = db.prepare(`
        SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               b.name as business_name, b.logo_url as business_logo, b.primary_color, b.secondary_color, b.currency as business_currency
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        JOIN businesses b ON q.business_id = b.id
        WHERE q.id = ?
      `).get(req.params.id) as any;

      if (!quote) return res.status(404).json({ error: 'Quote not found' });

      // Parse items if they exist
      const items = quote.items ? JSON.parse(quote.items) : [];
      
      res.json({ ...quote, items });
    } catch (err) {
      console.error('Public Quote Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/public/quotes/:id/accept', async (req: any, res) => {
    try {
      const quote = db.prepare('SELECT business_id FROM quotes WHERE id = ?').get(req.params.id) as any;
      if (!quote) return res.status(404).json({ error: 'Quote not found' });

      db.prepare("UPDATE quotes SET status = 'accepted' WHERE id = ?").run(req.params.id);
      
      // Notify business
      const id = randomUUID();
      db.prepare('INSERT INTO notifications (id, business_id, title, message) VALUES (?, ?, ?, ?)')
        .run(id, quote.business_id, 'Quote Accepted', `A customer has accepted quote #${req.params.id}`);
      
      broadcast(quote.business_id, 'quotes:updated', { id: req.params.id, status: 'accepted' });
      broadcast(quote.business_id, 'notifications:created', { id, title: 'Quote Accepted' });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to accept quote' });
    }
  });

  // --- Invoices ---
  app.get('/api/invoices/:id', authenticate, (req: any, res) => {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.email as customer_email, c.company as customer_company
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ? AND i.business_id = ?
    `).get(req.params.id, req.user.businessId);
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    // In a real app, we'd have invoice items. For now, we'll mock them or just return the total.
    res.json({ ...invoice, items: [{ description: 'Service/Product', quantity: 1, price: invoice.total }] });
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  // --- Audit Logs ---
  app.get('/api/audit-logs', authenticate, checkPermission('reports', 'view'), (req: any, res: any) => {
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.business_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all(req.user.businessId);
    res.json(logs);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
