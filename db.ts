import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const db = new Database('crm.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize Schema
export function initDb() {
  // Businesses (Tenants)
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#0f172a',
      secondary_color TEXT DEFAULT '#3b82f6',
      contact_email TEXT,
      currency TEXT DEFAULT 'EGP',
      email_provider TEXT DEFAULT 'mock', -- mock, resend, smtp
      email_config TEXT, -- JSON string
      plan TEXT DEFAULT 'trial',
      modules TEXT, -- JSON string of enabled module IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.exec("ALTER TABLE businesses ADD COLUMN modules TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE businesses ADD COLUMN currency TEXT DEFAULT 'EGP'");
  } catch (e) {}
  // Migration: Add email config to businesses
  try {
    db.exec("ALTER TABLE businesses ADD COLUMN email_provider TEXT DEFAULT 'mock'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE businesses ADD COLUMN email_config TEXT");
  } catch (e) {}

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- super_admin, owner, manager, agent, support, accountant, viewer
      permissions TEXT, -- JSON object for module access
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(email)
    )
  `);

  // Migration: Add permissions to users if needed
  try {
    db.exec("ALTER TABLE users ADD COLUMN permissions TEXT");
  } catch (e) {
    // Column already exists
  }

  // Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      whatsapp TEXT,
      company TEXT,
      status TEXT DEFAULT 'active',
      source TEXT,
      assigned_to TEXT,
      custom_fields TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Leads
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      whatsapp TEXT,
      status TEXT DEFAULT 'new',
      source TEXT,
      value REAL DEFAULT 0,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Subscriptions
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'active', -- active, expiring, expired
      payment_status TEXT DEFAULT 'unpaid', -- paid, unpaid
      reminder_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Invoices
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      number TEXT NOT NULL,
      date DATE NOT NULL,
      due_date DATE NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Real Estate Projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      status TEXT DEFAULT 'planning', -- planning, construction, completed, sold_out
      total_units INTEGER DEFAULT 0,
      available_units INTEGER DEFAULT 0,
      price_range TEXT,
      category TEXT,
      unit_type TEXT,
      image_url TEXT,
      plan_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add real estate columns to projects if they don't exist
  try {
    db.exec("ALTER TABLE projects ADD COLUMN unit_type TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN image_url TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN plan_url TEXT");
  } catch (e) {}

  // Migration: Add whatsapp to customers and leads
  try {
    db.exec("ALTER TABLE customers ADD COLUMN whatsapp TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE leads ADD COLUMN whatsapp TEXT");
  } catch (e) {}

  // Tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      status TEXT DEFAULT 'pending', -- pending, completed
      priority TEXT DEFAULT 'medium', -- low, medium, high
      assigned_to TEXT,
      related_type TEXT, -- customer, lead, subscription
      related_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Migration: Add priority to tasks if it doesn't exist
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'");
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }

  // Reminder Templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminder_templates (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      message TEXT NOT NULL, -- with placeholders like {customer_name}, {due_date}
      trigger_days INTEGER NOT NULL, -- e.g., -7 for 7 days before
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Reminder Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      template_id TEXT,
      status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
      sent_at DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    )
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT, -- JSON string of changes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Email Campaigns
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- draft, scheduled, sent
      scheduled_at DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Sales Quotes
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      number TEXT NOT NULL,
      date DATE NOT NULL,
      expiry_date DATE,
      total REAL NOT NULL,
      status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
      items TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // Documents
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      type TEXT,
      related_type TEXT, -- customer, lead, quote
      related_id TEXT,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Migration: Rename file_type to type in documents if needed
  try {
    db.exec("ALTER TABLE documents RENAME COLUMN file_type TO type");
  } catch (e) {
    // Column already renamed or table doesn't exist yet
  }

  // Social Media Posts
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      platform TEXT NOT NULL, -- twitter, linkedin, facebook
      content TEXT NOT NULL,
      media_url TEXT,
      status TEXT DEFAULT 'draft', -- draft, scheduled, posted, failed
      scheduled_at DATETIME,
      posted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Automation Rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_event TEXT NOT NULL, -- lead_created, customer_status_changed, quote_accepted
      action_type TEXT NOT NULL, -- send_email, create_task, notify_user
      action_data TEXT, -- JSON string (template_id, delay_hours, etc.)
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Google Integrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_integrations (
      business_id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      expiry_date INTEGER,
      spreadsheet_id TEXT,
      last_sync_at DATETIME,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // General Integrations (Shopify, Stripe, Mailchimp, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      provider TEXT NOT NULL, -- shopify, stripe, mailchimp, custom_api
      status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
      config TEXT, -- JSON string for API keys, shop URL, etc.
      last_sync_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, provider)
    )
  `);

  // E-commerce Orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS ecommerce_orders (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      integration_id TEXT NOT NULL,
      external_order_id TEXT NOT NULL,
      customer_email TEXT,
      total_amount REAL NOT NULL,
      currency TEXT DEFAULT 'EGP',
      status TEXT, -- pending, paid, shipped, cancelled
      order_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
    )
  `);

  // Payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      integration_id TEXT,
      external_payment_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EGP',
      status TEXT, -- succeeded, pending, failed
      method TEXT, -- card, bank_transfer, paypal
      related_type TEXT, -- invoice, order, subscription
      related_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  seedAdmin();
}

function seedAdmin() {
  const adminEmail = 'karimelfaramawy6@gmail.com';
  const adminPassword = 'Kiko@2025';
  
  console.log('Ensuring admin user exists...');
  const businessId = 'admin-business-id';
  const userId = 'admin-user-id';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  
  const defaultModules = JSON.stringify([
    'dashboard', 'customers', 'leads', 'quotes', 'subscriptions', 'invoices', 
    'projects', 'email-marketing', 'social-media', 'documents', 'tasks', 
    'notifications', 'automation', 'users-roles', 'integrations', 'reports'
  ]);

  const adminPermissions = JSON.stringify({
    dashboard: { view: true },
    customers: { view: true, add: true, edit: true, delete: true },
    leads: { view: true, add: true, edit: true, delete: true },
    invoices: { view: true, add: true, edit: true, delete: true },
    tasks: { view: true, add: true, edit: true, delete: true },
    products: { view: true, add: true, edit: true, delete: true },
    users: { view: true, add: true, edit: true, delete: true },
    settings: { view: true, add: true, edit: true, delete: true },
    automation: { view: true, add: true, edit: true, delete: true },
    documents: { view: true, add: true, edit: true, delete: true },
    social: { view: true, add: true, edit: true, delete: true }
  });

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any;
    
    db.transaction(() => {
      // Ensure business exists
      db.prepare('INSERT OR IGNORE INTO businesses (id, name, modules) VALUES (?, ?, ?)')
        .run(businessId, 'Admin Business', defaultModules);
      
      if (!existingUser) {
        db.prepare('INSERT INTO users (id, business_id, name, email, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(userId, businessId, 'Admin Karim', adminEmail, hashedPassword, 'super_admin', adminPermissions);
        console.log('Admin user created.');
      } else {
        // Force update password and role to ensure it matches request
        db.prepare('UPDATE users SET password_hash = ?, role = ?, permissions = ? WHERE email = ?')
          .run(hashedPassword, 'super_admin', adminPermissions, adminEmail);
        console.log('Admin user credentials updated.');
      }
    })();
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
}

export default db;
