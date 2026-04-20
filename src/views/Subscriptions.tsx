import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Subscription, Customer } from '../types';
import { CreditCard, Calendar, AlertTriangle, CheckCircle2, MessageSquare, X, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { formatCurrency } from '../utils/currency';

export default function Subscriptions() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission, business } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    plan_name: '',
    start_date: '',
    end_date: '',
    amount: 0,
    status: 'active' as const,
    payment_status: 'unpaid' as const
  });

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const [subRes, custRes] = await Promise.all([
      fetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [subs, custs] = await Promise.all([subRes.json(), custRes.json()]);
    setSubscriptions(subs);
    setCustomers(custs);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingSubscription ? `/api/subscriptions/${editingSubscription.id}` : '/api/subscriptions';
    const method = editingSubscription ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    setIsModalOpen(false);
    setEditingSubscription(null);
    fetchData();
  };

  const handleDelete = async (sub: Subscription) => {
    if (!confirm(t('deleteSubscriptionConfirm'))) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSubscription(sub);
    setFormData({
      customer_id: sub.customer_id,
      plan_name: sub.plan_name,
      start_date: sub.start_date,
      end_date: sub.end_date,
      amount: sub.amount,
      status: sub.status,
      payment_status: sub.payment_status
    });
    setIsModalOpen(true);
  };

  const sendWhatsAppReminder = (sub: Subscription) => {
    // Mock WhatsApp API call
    alert(isRtl ? `تم إرسال تذكير واتساب للعميل لخطة: ${sub.plan_name}` : `WhatsApp reminder sent to customer for plan: ${sub.plan_name}`);
  };

  const columns = [
    { 
      header: t('customer'), 
      accessor: (s: Subscription) => {
        const customer = customers.find(c => c.id === s.customer_id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold text-xs">
              {customer?.name.charAt(0) || '?'}
            </div>
            <span className="font-bold text-slate-900">{customer?.name || t('unknown')}</span>
          </div>
        );
      }
    },
    { 
      header: t('plan'), 
      accessor: (s: Subscription) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{s.plan_name}</span>
          <span className="text-xs text-slate-500">{formatCurrency(s.amount, business?.currency, lang)}</span>
        </div>
      )
    },
    { 
      header: t('expiryDate'), 
      accessor: (s: Subscription) => {
        const expiry = new Date(s.end_date);
        const today = new Date();
        const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar size={14} className="text-slate-400" />
              {expiry.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
            </div>
            <span className={`text-[10px] font-bold uppercase ${
              diff < 0 ? 'text-rose-600' : diff < 7 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {diff < 0 ? t('expired') : t('daysLeft', { count: diff })}
            </span>
          </div>
        );
      }
    },
    { 
      header: t('status'), 
      accessor: (s: Subscription) => (
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase w-fit ${
            s.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {s.status === 'active' ? t('active') : t('inactive')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase w-fit ${
            s.payment_status === 'paid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {s.payment_status === 'paid' ? t('paid') : t('unpaid')}
          </span>
        </div>
      )
    },
    {
      header: t('reminders'),
      accessor: (s: Subscription) => (
        <button 
          disabled={!hasPermission('social', 'edit')}
          onClick={() => sendWhatsAppReminder(s)}
          className={`flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100 ${!hasPermission('social', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <MessageSquare size={14} />
          <span>{t('sendWhatsApp')}</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable 
        title={t('subscriptionManagement')}
        data={subscriptions}
        columns={columns}
        isLoading={isLoading}
        onAdd={hasPermission('invoices', 'add') ? () => {
          setEditingSubscription(null);
          setFormData({
            customer_id: '',
            plan_name: '',
            start_date: '',
            end_date: '',
            amount: 0,
            status: 'active' as const,
            payment_status: 'unpaid' as const
          });
          setIsModalOpen(true);
        } : undefined}
        onEdit={hasPermission('invoices', 'edit') ? handleEdit : undefined}
        onDelete={hasPermission('invoices', 'delete') ? handleDelete : undefined}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-900">{t('newSubscription')}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('customer')}</label>
                    <select required value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900">
                      <option value="">{t('selectCustomer')}</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('planName')}</label>
                    <input type="text" required value={formData.plan_name} onChange={e => setFormData({...formData, plan_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('startDate')}</label>
                    <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('expiryDate')}</label>
                    <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('amount')}</label>
                    <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">{t('cancel')}</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">{t('createSubscription')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
