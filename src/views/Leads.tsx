import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Lead } from '../types';
import { Mail, Phone, Tag, Calendar, User, X, DollarSign, Download, MessageCircle, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { exportToCSV } from '../utils/export';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { formatCurrency } from '../utils/currency';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Leads() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission, business } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    status: 'new' as const,
    source: '',
    value: 0,
    assigned_to: ''
  });

  const fetchLeads = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/leads', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setLeads(data);
    setIsLoading(false);
  };

  const handleExport = () => {
    exportToCSV(leads, 'leads');
  };

  useEffect(() => {
    fetchLeads();

    // WebSocket for live updates
    const token = localStorage.getItem('token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}?token=${token}`);

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'leads:created') {
        setLeads(prev => [data, ...prev]);
      } else if (type === 'leads:updated') {
        setLeads(prev => prev.map(l => l.id === data.id ? data : l));
      } else if (type === 'leads:deleted') {
        setLeads(prev => prev.filter(l => l.id !== data.id));
      }
    };

    return () => ws.close();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const method = editingLead ? 'PUT' : 'POST';
    const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });

    setIsModalOpen(false);
    setEditingLead(null);
    setFormData({ name: '', email: '', phone: '', whatsapp: '', status: 'new', source: '', value: 0, assigned_to: '' });
    fetchLeads();
  };
  
  const handleConvert = async (lead: Lead) => {
    if (!confirm(t('convertLead'))) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Conversion error:', err);
    }
  };

  const columns = [
    { 
      header: t('leadName'), 
      accessor: (l: Lead) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
            {l.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900">{l.name}</p>
              {(l.whatsapp || l.phone) && (
                <button 
                  onClick={() => sendWhatsAppMessage(l.whatsapp || l.phone || '', `Hello ${l.name}, I have an offer for you regarding ${l.source || 'our services'}.`)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title={t('whatsapp')}
                >
                  <MessageCircle size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">{l.source || t('direct')}</p>
          </div>
        </div>
      )
    },
    { 
      header: t('potentialValue'), 
      accessor: (l: Lead) => (
        <div className="flex items-center gap-1 font-bold text-slate-900">
          {formatCurrency(l.value, business?.currency, lang)}
        </div>
      )
    },
    { 
      header: t('status'), 
      accessor: (l: Lead) => {
        const statusMap: Record<string, string> = {
          'new': t('new'),
          'contacted': t('contacted'),
          'qualified': t('qualified'),
          'proposal': t('proposal'),
          'closed_won': t('closedWon'),
          'closed_lost': t('closedLost')
        };
        return (
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            l.status === 'new' ? 'bg-blue-50 text-blue-600' : 
            l.status === 'qualified' ? 'bg-indigo-50 text-indigo-600' :
            l.status === 'closed_won' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {statusMap[l.status] || l.status.replace('_', ' ')}
          </span>
        );
      }
    },
    { 
      header: t('created'), 
      accessor: (l: Lead) => new Date(l.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={18} />
          <span>{t('export')}</span>
        </button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('pipelineOverview')}</h2>
          <p className="text-sm text-slate-500">{t('realTimeTracking')}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{leads.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('totalLeads')}</p>
          </div>
          <div className="h-10 w-px bg-slate-100" />
          <div className="max-w-[200px]">
            <p className="text-xs font-medium text-slate-600">
              {leads.length % 10 === 0 && leads.length > 0 
                ? t('syncedToSheets') 
                : t('nextAutoSync', { count: 10 - (leads.length % 10) })}
            </p>
            <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${(leads.length % 10) * 10}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable 
        title={t('leadPipeline')}
        data={leads}
        columns={columns}
        isLoading={isLoading}
        onAdd={hasPermission('leads', 'add') ? () => { setEditingLead(null); setIsModalOpen(true); } : undefined}
        onEdit={hasPermission('leads', 'edit') ? (l) => { 
          setEditingLead(l); 
          setFormData({
            name: l.name || '',
            email: l.email || '',
            phone: l.phone || '',
            whatsapp: l.whatsapp || '',
            status: l.status,
            source: l.source || '',
            value: l.value || 0,
            assigned_to: l.assigned_to || ''
          }); 
          setIsModalOpen(true); 
        } : undefined}
        onDelete={hasPermission('leads', 'delete') ? async (l) => {
          if (!confirm(t('deleteLeadConfirm'))) return;
          await fetch(`/api/leads/${l.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          fetchLeads();
        } : undefined}
        renderActions={(l) => (
          l.status !== 'closed_won' && (
            <button 
              onClick={() => handleConvert(l)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title={t('convertLead')}
            >
              <UserPlus size={16} />
            </button>
          )
        )}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-900">{editingLead ? t('editLead') : t('newLead')}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('leadName')}</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('phoneNumber')}</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('whatsapp')}</label>
                    <input type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('value')}</label>
                    <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('status')}</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900">
                      <option value="new">{t('new')}</option>
                      <option value="contacted">{t('contacted')}</option>
                      <option value="qualified">{t('qualified')}</option>
                      <option value="proposal">{t('proposal')}</option>
                      <option value="closed_won">{t('closedWon')}</option>
                      <option value="closed_lost">{t('closedLost')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">{t('cancel')}</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">{t('save')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
