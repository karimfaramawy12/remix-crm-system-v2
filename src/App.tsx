import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CreditCard, 
  FileText, 
  Package, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Menu,
  X,
  MessageSquare,
  History,
  Printer,
  Mail as MailIcon,
  Share2,
  FileCheck,
  Zap,
  Bot,
  Globe,
  Link2,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useI18n } from './i18n';
import { useAuth } from './auth';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---
import Dashboard from './views/Dashboard';
import Customers from './views/Customers';
import Leads from './views/Leads';
import Subscriptions from './views/Subscriptions';
import Invoices from './views/Invoices';
import Projects from './views/Projects';
import Tasks from './views/Tasks';
import Reports from './views/Reports';
import SettingsView from './views/Settings';
import Login from './views/Login';
import InvoicePrint from './views/InvoicePrint';
import EmailMarketing from './views/EmailMarketing';
import SocialMedia from './views/SocialMedia';
import Quotes from './views/Quotes';
import Documents from './views/Documents';
import Automation from './views/Automation';
import Integrations from './views/Integrations';
import UsersRoles from './views/UsersRoles';
import Notifications from './views/Notifications';
import AIAssistant from './components/AIAssistant';
import PublicQuote from './views/PublicQuote';

type View = 'dashboard' | 'customers' | 'leads' | 'subscriptions' | 'invoices' | 'projects' | 'tasks' | 'reports' | 'settings' | 'invoice-print' | 'email-marketing' | 'social-media' | 'quotes' | 'documents' | 'automation' | 'integrations' | 'users-roles' | 'notifications';

export default function App() {
  const { lang, setLang, t, isRtl } = useI18n();
  const { user, business, setUser, setBusiness, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [publicQuoteId, setPublicQuoteId] = useState<string | null>(null);

  useEffect(() => {
    // Handle public quote route
    const path = window.location.pathname;
    if (path.startsWith('/quotes/')) {
      setPublicQuoteId(path.split('/')[2]);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setBusiness(data.business);
        } else {
          localStorage.removeItem('token');
        }
      })
      .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setBusiness(null);
  };

  const handlePrintInvoice = (id: string) => {
    setCurrentInvoiceId(id);
    setCurrentView('invoice-print');
  };

  if (publicQuoteId) {
    return <PublicQuote quoteId={publicQuoteId} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u, b) => { setUser(u); setBusiness(b); }} />;
  }

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'customers', label: t('customers'), icon: Users },
    { id: 'leads', label: t('leads'), icon: UserPlus },
    { id: 'quotes', label: t('quotes'), icon: FileCheck, permissionId: 'leads' },
    { id: 'subscriptions', label: t('subscriptions'), icon: CreditCard, permissionId: 'invoices' },
    { id: 'invoices', label: t('invoices'), icon: FileText },
    { id: 'projects', label: t('projects'), icon: Package },
    { id: 'email-marketing', label: t('emailMarketing'), icon: MailIcon, permissionId: 'social' },
    { id: 'social-media', label: t('socialMedia'), icon: Share2, permissionId: 'social' },
    { id: 'documents', label: t('documents'), icon: History },
    { id: 'tasks', label: t('tasks'), icon: CheckSquare },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'automation', label: t('automation'), icon: Zap },
    { id: 'users-roles', label: t('usersAndRoles'), icon: ShieldCheck, permissionId: 'users' },
    { id: 'integrations', label: isRtl ? 'التكاملات' : 'Integrations', icon: Link2, permissionId: 'settings' },
    { id: 'reports', label: t('reports'), icon: BarChart3, permissionId: 'dashboard' },
    { id: 'settings', label: t('settings'), icon: Settings, permissionId: 'settings' },
  ].filter(item => {
    // Business level module check
    if (business?.modules) {
      try {
        const enabledModules = JSON.parse(business.modules);
        if (!enabledModules.includes(item.id)) {
          // Settings and Dashboard should arguably always be visible if the user has permission
          if (item.id !== 'settings' && item.id !== 'dashboard' && item.id !== 'notifications') {
            return false;
          }
        }
      } catch (e) {
        console.error('Error parsing business modules', e);
      }
    }

    const permId = (item as any).permissionId || item.id;
    // Map some IDs to match MODULES in UsersRoles
    const mappedId = permId === 'users-roles' ? 'users' : 
                     permId === 'social-media' ? 'social' : 
                     permId === 'email-marketing' ? 'social' : permId;
    return hasPermission(mappedId, 'view');
  });

  if (currentView === 'invoice-print' && currentInvoiceId) {
    return <InvoicePrint invoiceId={currentInvoiceId} onBack={() => setCurrentView('invoices')} />;
  }

  return (
    <div className="min-h-screen bg-white flex text-black font-sans transition-colors duration-200">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-30 transition-colors duration-200"
      >
        <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="p-6 flex items-center gap-3 hover:opacity-80 transition-opacity">
          {business?.logo_url ? (
            <img src={business.logo_url} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
          )}
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight text-black transition-colors">
              {business?.name || 'CRM'}
            </span>
          )}
        </a>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                currentView === item.id 
                  ? "bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-100" 
                  : "text-black hover:bg-slate-50 transition-colors"
              )}
            >
              <item.icon className={cn("w-5 h-5", currentView === item.id ? "text-white" : "text-black group-hover:text-indigo-600")} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-black hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className={cn("w-5 h-5", isRtl && "rotate-180")} />
            {isSidebarOpen && <span>{t('logout')}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-black transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative max-w-md w-full hidden md:block">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-black w-4 h-4", isRtl ? "right-3" : "left-3")} />
              <input 
                type="text" 
                placeholder={t('search')}
                className={cn(
                  "w-full py-2 bg-white border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-black transition-all placeholder:text-slate-400",
                  isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-100 rounded-xl p-1 transition-colors">
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  lang === 'en' ? "bg-indigo-600 text-white shadow-sm" : "text-black hover:text-indigo-600"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('ar')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  lang === 'ar' ? "bg-indigo-600 text-white shadow-sm" : "text-black hover:text-indigo-600"
                )}
              >
                AR
              </button>
            </div>

            <button 
              onClick={() => setCurrentView('notifications')}
              className={cn(
                "p-2 rounded-lg relative transition-all",
                currentView === 'notifications' ? "bg-indigo-600 text-white" : "text-black hover:bg-slate-50"
              )}
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-black">{user.name}</p>
                <p className="text-xs text-slate-600 capitalize">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg shadow-indigo-100">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
              {currentView === 'customers' && <Customers />}
              {currentView === 'leads' && <Leads />}
              {currentView === 'quotes' && <Quotes />}
              {currentView === 'subscriptions' && <Subscriptions />}
              {currentView === 'invoices' && <Invoices onPrint={handlePrintInvoice} />}
              {currentView === 'projects' && <Projects />}
              {currentView === 'email-marketing' && <EmailMarketing />}
              {currentView === 'social-media' && <SocialMedia />}
              {currentView === 'documents' && <Documents />}
              {currentView === 'tasks' && <Tasks />}
              {currentView === 'automation' && <Automation />}
              {currentView === 'users-roles' && <UsersRoles />}
              {currentView === 'integrations' && <Integrations />}
              {currentView === 'reports' && <Reports />}
              {currentView === 'notifications' && <Notifications />}
              {currentView === 'settings' && <SettingsView business={business} onUpdate={setBusiness} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AIAssistant />
    </div>
  );
}
