import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  ShoppingBag, 
  CreditCard, 
  Mail, 
  Code, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';

interface Integration {
  id: string;
  provider: string;
  status: string;
  config: string;
  last_sync_at: string;
}

export default function Integrations() {
  const { t, isRtl, lang } = useI18n();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [config, setConfig] = useState('');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          provider: selectedProvider,
          config: config,
          status: 'connected'
        })
      });
      if (res.ok) {
        fetchIntegrations();
        setIsModalOpen(false);
        setSelectedProvider(null);
        setConfig('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async (id: string) => {
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchIntegrations();
        alert(t('syncSuccess'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteIntegrationConfirm'))) return;
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const providers = [
    { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'stripe', name: 'Stripe', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'mailchimp', name: 'Mailchimp', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'custom_api', name: 'Custom API', icon: Code, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('integrations')}</h1>
          <p className="text-slate-500">{t('integrationsDesc')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          {t('addNewIntegration')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const provider = providers.find(p => p.id === integration.provider) || providers[3];
          return (
            <motion.div 
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 ${provider.bg} ${provider.color} rounded-2xl flex items-center justify-center`}>
                  <provider.icon size={28} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSync(integration.id)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title={t('syncNow')}
                  >
                    <RefreshCw size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(integration.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {integration.status === 'connected' ? (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 size={14} />
                        {t('connected')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-bold uppercase tracking-wider">
                        <XCircle size={14} />
                        {t('disconnected')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span>{t('lastSync')}:</span>
                  <span className="font-medium text-slate-600">
                    {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : t('never')}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {integrations.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Link2 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">{t('noActiveIntegrations')}</p>
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">{t('addIntegration')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleConnect} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('selectProvider')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedProvider === p.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                          : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <p.icon size={24} />
                      <span className="text-xs font-bold">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedProvider && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 mx-1">
                    {selectedProvider === 'shopify' ? t('shopifyUrl') : 
                     selectedProvider === 'stripe' ? t('secretApiKey') : 
                     t('configurationJson')}
                  </label>
                  <textarea 
                    required
                    rows={3}
                    value={config}
                    onChange={e => setConfig(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder={selectedProvider === 'shopify' ? 'my-store.myshopify.com' : 'sk_test_...'}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={!selectedProvider}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {t('connectNow')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
