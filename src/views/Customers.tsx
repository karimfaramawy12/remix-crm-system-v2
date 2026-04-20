import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Customer } from '../types';
import { Mail, Phone, Building2, Tag, Calendar, User, X, Download, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { exportToCSV } from '../utils/export';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Customers() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    company: '',
    status: 'active' as const,
    source: '',
    assigned_to: ''
  });

  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/customers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCustomers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';

    await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', whatsapp: '', company: '', status: 'active', source: '', assigned_to: '' });
    fetchCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      company: customer.company || '',
      status: customer.status,
      source: customer.source || '',
      assigned_to: customer.assigned_to || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(t('deleteCustomerConfirm'))) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/customers/${customer.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchCustomers();
  };

  const handleExport = () => {
    exportToCSV(customers, 'customers');
  };

  const columns = [
    { 
      header: t('customer'), 
      accessor: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
            {c.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{c.name}</p>
            <p className="text-xs text-slate-500">{c.company || t('individual')}</p>
          </div>
        </div>
      )
    },
    { 
      header: t('contact'), 
      accessor: (c: Customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail size={12} className="text-slate-400" />
            <span>{c.email || t('na')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone size={12} className="text-slate-400" />
            <span>{c.phone || t('na')}</span>
            {(c.whatsapp || c.phone) && (
              <button 
                onClick={() => sendWhatsAppMessage(c.whatsapp || c.phone || '', `Hello ${c.name}, `)}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                title={t('whatsapp')}
              >
                <MessageCircle size={12} />
              </button>
            )}
          </div>
        </div>
      )
    },
    { 
      header: t('status'), 
      accessor: (c: Customer) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {c.status === 'active' ? t('active') : t('inactive')}
        </span>
      )
    },
    { 
      header: t('addedOn'), 
      accessor: (c: Customer) => (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={14} />
          {new Date(c.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
        </div>
      )
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
      <DataTable 
        title={t('customerManagement')}
        data={customers}
        columns={columns}
        isLoading={isLoading}
        onAdd={hasPermission('customers', 'add') ? () => { setEditingCustomer(null); setIsModalOpen(true); } : undefined}
        onEdit={hasPermission('customers', 'edit') ? handleEdit : undefined}
        onDelete={hasPermission('customers', 'delete') ? handleDelete : undefined}
        renderActions={(c) => (
          <div className="flex items-center gap-2">
            {(c.whatsapp || c.phone) && (
              <button 
                onClick={() => sendWhatsAppMessage(c.whatsapp || c.phone || '', `Hello ${c.name}, `)}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                title={t('whatsapp')}
              >
                <MessageCircle size={16} />
              </button>
            )}
          </div>
        )}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingCustomer ? t('editCustomer') : t('addNewCustomer')}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('fullName')}</label>
                    <div className="relative">
                      <User className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                      <input 
                        type="text" required value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className={cn(
                          "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900",
                          isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('emailAddress')}</label>
                    <div className="relative">
                      <Mail className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                      <input 
                        type="email" value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className={cn(
                          "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900",
                          isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('phoneNumber')}</label>
                    <div className="relative">
                      <Phone className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                      <input 
                        type="text" value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className={cn(
                          "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900",
                          isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('whatsapp')}</label>
                    <div className="relative">
                      <MessageCircle className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                      <input 
                        type="text" value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        className={cn(
                          "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900",
                          isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('companyName')}</label>
                    <div className="relative">
                      <Building2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                      <input 
                        type="text" value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className={cn(
                          "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900",
                          isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    {editingCustomer ? t('updateCustomer') : t('saveCustomer')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
