import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Calendar, MoreVertical, Search, Bot, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { generateAIContent } from '../services/ai';

export default function EmailMarketing() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    content: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/email-campaigns', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCampaign)
      });
      if (res.ok) {
        fetchCampaigns();
        setIsModalOpen(false);
        setNewCampaign({ name: '', subject: '', content: '', status: 'draft' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateWithAI = async () => {
    setIsAIGenerating(true);
    try {
      const systemInstruction = `You are a professional CRM assistant. Write concise, effective emails. ${isRtl ? 'Always respond in professional Arabic.' : 'Always respond in professional English.'}`;
      const prompt = `Write a professional marketing campaign email based on this request: ${aiPrompt}`;
      const text = await generateAIContent(prompt, systemInstruction);
      setNewCampaign(prev => ({ ...prev, content: text || '' }));
      setIsAIModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteCampaignConfirm'))) return;
    try {
      const res = await fetch(`/api/email-campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm(t('sendCampaignConfirm'))) return;
    try {
      const res = await fetch(`/api/email-campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchCampaigns();
        alert(t('campaignSentSuccess'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('emailMarketing')}</h1>
          <p className="text-slate-500">{t('emailMarketingDesc')}</p>
        </div>
        {hasPermission('social', 'add') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {t('newCampaign')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <motion.div 
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === 'draft' && hasPermission('social', 'edit') && (
                  <button 
                    onClick={() => handleSend(campaign.id)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title={t('sendNow')}
                  >
                    <Send size={18} />
                  </button>
                )}
                {hasPermission('social', 'delete') && (
                  <button 
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{campaign.name}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-1">{campaign.subject}</p>
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                campaign.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 
                campaign.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 
                'bg-slate-50 text-slate-600'
              }`}>
                {campaign.status === 'sent' ? t('sent') : 
                 campaign.status === 'scheduled' ? t('scheduled') : 
                 t('draft')}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={14} />
                {new Date(campaign.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-bold text-slate-900">{t('createCampaign')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 mx-1">{t('campaignName')}</label>
                  <input 
                    type="text" 
                    required
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 mx-1">{t('subjectLine')}</label>
                  <input 
                    type="text" 
                    required
                    value={newCampaign.subject}
                    onChange={e => setNewCampaign({...newCampaign, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 mx-1">{t('emailContent')}</label>
                    <button 
                      type="button"
                      onClick={() => setIsAIModalOpen(true)}
                      className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-700"
                    >
                      <Bot size={14} />
                      {t('writeWithAI')}
                    </button>
                  </div>
                  <textarea 
                    required
                    rows={6}
                    value={newCampaign.content}
                    onChange={e => setNewCampaign({...newCampaign, content: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900"
                  />
                </div>
              </div>
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
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  {t('saveCampaign')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bot className="text-indigo-600" size={20} />
                <h2 className="text-xl font-bold text-slate-900">{t('aiEmailWriter')}</h2>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">{t('aiEmailWriterDesc')}</p>
              <textarea 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder={t('aiEmailWriterPlaceholder')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900"
                rows={4}
              />
              <button 
                onClick={generateWithAI}
                disabled={isAIGenerating || !aiPrompt.trim()}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAIGenerating ? t('generating') : t('generateContent')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
