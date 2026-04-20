import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Building2, 
  Globe, 
  Shield, 
  Bell, 
  Users, 
  Mail, 
  Sun, 
  Moon, 
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { Business } from '../types';
import { useAuth } from '../auth';
import UsersRoles from './UsersRoles';
import Notifications from './Notifications';
import Security from './Security';
import { useI18n } from '../i18n';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsProps {
  business: Business;
  onUpdate: (business: Business) => void;
}

export default function Settings({ business, onUpdate }: SettingsProps) {
  const { hasPermission } = useAuth();
  const { t, isRtl } = useI18n();
  const [formData, setFormData] = useState({ 
    ...business,
    logo_url: business.logo_url || '',
    contact_email: business.contact_email || '',
    primary_color: business.primary_color || '#4f46e5',
    secondary_color: business.secondary_color || '#10b981',
    currency: business.currency || 'EGP',
    modules: business.modules ? JSON.parse(business.modules) : []
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        modules: JSON.stringify(formData.modules)
      };
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onUpdate(payload as Business);
        alert('Settings updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update settings');
      }
    } catch (err) {
      alert('Error updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette, permission: 'settings' },
    { id: 'company', label: 'Company Info', icon: Building2, permission: 'settings' },
    { id: 'integrations', label: 'Integrations', icon: Globe, permission: 'settings' },
    { id: 'email', label: 'Email Settings', icon: Mail, permission: 'settings' },
    { id: 'users', label: 'Users & Roles', icon: Users, permission: 'users' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'view' },
    { id: 'security', label: 'Security', icon: Shield, permission: 'view' },
  ].filter(tab => {
    if (tab.id === 'notifications' || tab.id === 'security') return true;
    return hasPermission(tab.permission as any, 'view');
  });

  const [activeTab, setActiveTab] = useState('branding');
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/google/status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(setGoogleStatus);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/integrations/google/url', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      const url = data.url;
      const popup = window.open(url, 'google_auth', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          fetch('/api/integrations/google/status', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
          .then(res => res.json())
          .then(setGoogleStatus);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('Google connect error:', err);
      alert('Failed to connect to Google');
    }
  };

  const [isPulling, setIsPulling] = useState(false);

  const handlePull = async () => {
    if (!confirm('This will overwrite your local data with the data from Google Sheets. Are you sure?')) return;
    setIsPulling(true);
    try {
      const res = await fetch('/api/integrations/google/pull', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Data pulled from Google Sheets successfully! The app will now refresh.');
        window.location.reload();
      } else {
        alert(data.error || 'Pull failed');
      }
    } catch (err) {
      alert('Pull failed');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Data synced to Google Sheets successfully!');
        fetch('/api/integrations/google/status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(setGoogleStatus);
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (err) {
      alert('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black transition-colors">System Settings</h1>
        <p className="text-black transition-colors">Customize your CRM experience and branding.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-black hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'users' && <UsersRoles />}
            {activeTab === 'notifications' && <Notifications />}
            {activeTab === 'security' && <Security />}
            
            {(activeTab === 'branding' || activeTab === 'company' || activeTab === 'integrations' || activeTab === 'email') && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 transition-colors">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {activeTab === 'email' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-black">Email Marketing Configuration</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-black">Email Provider</label>
                          <select 
                            value={formData.email_provider || 'mock'}
                            onChange={e => setFormData({...formData, email_provider: e.target.value as any})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-black"
                          >
                          <option value="mock">Simulation (No real emails sent)</option>
                          <option value="resend">Resend (API Key)</option>
                          <option value="smtp">SMTP (Custom Server)</option>
                        </select>
                      </div>

                      {formData.email_provider === 'resend' && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Resend API Key</label>
                          <input 
                            type="password" 
                            placeholder="re_..."
                            value={formData.email_config ? (JSON.parse(formData.email_config).apiKey || '') : ''}
                            onChange={e => {
                              const config = formData.email_config ? JSON.parse(formData.email_config) : {};
                              setFormData({...formData, email_config: JSON.stringify({...config, apiKey: e.target.value})});
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                          />
                        </div>
                      )}

                      {formData.email_provider === 'smtp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">SMTP Host</label>
                            <input 
                              type="text" 
                              placeholder="smtp.example.com"
                              value={formData.email_config ? (JSON.parse(formData.email_config).host || '') : ''}
                              onChange={e => {
                                const config = formData.email_config ? JSON.parse(formData.email_config) : {};
                                setFormData({...formData, email_config: JSON.stringify({...config, host: e.target.value})});
                              }}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">SMTP Port</label>
                            <input 
                              type="number" 
                              placeholder="587"
                              value={formData.email_config ? (JSON.parse(formData.email_config).port || '') : ''}
                              onChange={e => {
                                const config = formData.email_config ? JSON.parse(formData.email_config) : {};
                                setFormData({...formData, email_config: JSON.stringify({...config, port: e.target.value})});
                              }}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">SMTP User</label>
                            <input 
                              type="text" 
                              value={formData.email_config ? (JSON.parse(formData.email_config).user || '') : ''}
                              onChange={e => {
                                const config = formData.email_config ? JSON.parse(formData.email_config) : {};
                                setFormData({...formData, email_config: JSON.stringify({...config, user: e.target.value})});
                              }}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">SMTP Password</label>
                            <input 
                              type="password" 
                              value={formData.email_config ? (JSON.parse(formData.email_config).pass || '') : ''}
                              onChange={e => {
                                const config = formData.email_config ? JSON.parse(formData.email_config) : {};
                                setFormData({...formData, email_config: JSON.stringify({...config, pass: e.target.value})});
                              }}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'branding' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900">White-Label Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Primary Brand Color</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={formData.primary_color}
                            onChange={e => setFormData({...formData, primary_color: e.target.value})}
                            className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
                          />
                          <input 
                            type="text" 
                            value={formData.primary_color}
                            onChange={e => setFormData({...formData, primary_color: e.target.value})}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Secondary Color</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={formData.secondary_color}
                            onChange={e => setFormData({...formData, secondary_color: e.target.value})}
                            className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
                          />
                          <input 
                            type="text" 
                            value={formData.secondary_color}
                            onChange={e => setFormData({...formData, secondary_color: e.target.value})}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Logo URL</label>
                        <input 
                          type="text" 
                          placeholder="https://example.com/logo.png"
                          value={formData.logo_url || ''}
                          onChange={e => setFormData({...formData, logo_url: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'integrations' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Google Sheets</h3>
                          <p className="text-sm text-slate-500">Sync your customers and leads to Google Sheets.</p>
                        </div>
                      </div>
                      {googleStatus?.connected ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                          Connected
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={handleConnectGoogle}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {googleStatus?.connected && (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">Spreadsheet ID</span>
                          <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                            {googleStatus.spreadsheet_id || 'Will be created on first sync'}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">Last Synced</span>
                          <span className="text-sm text-slate-500">
                            {googleStatus.last_sync_at ? new Date(googleStatus.last_sync_at).toLocaleString() : 'Never'}
                          </span>
                        </div>
                        <div className="pt-4 flex flex-wrap gap-3">
                          <button 
                            type="button"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-70"
                          >
                            {isSyncing ? 'Syncing...' : 'Push to Sheets'}
                          </button>
                          <button 
                            type="button"
                            onClick={handlePull}
                            disabled={isPulling}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-70"
                          >
                            {isPulling ? 'Pulling...' : 'Pull from Sheets'}
                          </button>
                          {googleStatus.spreadsheet_id && (
                            <a 
                              href={`https://docs.google.com/spreadsheets/d/${googleStatus.spreadsheet_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                            >
                              Open Sheet
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'company' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Business Name</label>
                        <input 
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Contact Email</label>
                        <input 
                          type="email" 
                          value={formData.contact_email || ''}
                          onChange={e => setFormData({...formData, contact_email: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Currency</label>
                        <select 
                          value={formData.currency || 'EGP'}
                          onChange={e => setFormData({...formData, currency: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                        >
                          <option value="USD">USD ($) - US Dollar</option>
                          <option value="EGP">EGP (ج.م) - Egyptian Pound</option>
                          <option value="EUR">EUR (€) - Euro</option>
                          <option value="GBP">GBP (£) - British Pound</option>
                          <option value="SAR">SAR (ر.س) - Saudi Riyal</option>
                          <option value="AED">AED (د.إ) - UAE Dirham</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-6 border-t border-slate-100">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
        </div>
      </div>
    );
}
