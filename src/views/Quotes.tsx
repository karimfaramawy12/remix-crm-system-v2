import React, { useState, useEffect } from 'react';
import { FileCheck, Plus, X, Trash2, Printer, Download, Eye, MessageCircle, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { Project } from '../types';
import { formatCurrency } from '../utils/currency';

export default function Quotes() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission, business } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    number: `QT-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    total: 0,
    status: 'draft',
    items: [] as { description: string; quantity: number; price: number; project_id?: string }[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [qRes, cRes, pRes] = await Promise.all([
        fetch('/api/quotes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setQuotes(await qRes.json());
      setCustomers(await cRes.json());
      setProjects(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          items: JSON.stringify(formData.items)
        })
      });
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        setFormData({
          customer_id: '',
          number: `QT-${Math.floor(Math.random() * 10000)}`,
          date: new Date().toISOString().split('T')[0],
          expiry_date: '',
          total: 0,
          status: 'draft',
          items: []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setFormData({ ...formData, items: newItems, total: newTotal });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If project is selected, update description
    if (field === 'project_id' && value) {
      const project = projects.find(p => p.id === value);
      if (project) {
        newItems[index].description = project.name;
      }
    }

    const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setFormData({ ...formData, items: newItems, total: newTotal });
  };

  const handleDelete = async (quote: any) => {
    if (!confirm(t('deleteQuoteConfirm'))) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { 
      header: t('quoteNumber'), 
      accessor: (q: any) => <span className="font-bold text-slate-900">{q.number}</span>
    },
    { 
      header: t('customer'), 
      accessor: (q: any) => <span className="text-slate-600">{customers.find(c => c.id === q.customer_id)?.name || t('unknown')}</span>
    },
    { 
      header: t('date'), 
      accessor: (q: any) => <span className="text-slate-600">{new Date(q.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
    },
    { 
      header: t('total'), 
      accessor: (q: any) => <span className="font-bold text-slate-900">{formatCurrency(q.total, business?.currency, lang)}</span>
    },
    { 
      header: t('status'), 
      accessor: (q: any) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          q.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 
          q.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {q.status === 'accepted' ? t('accepted') : q.status === 'rejected' ? t('rejected') : t('draft')}
        </span>
      )
    },
    {
      header: t('actions'),
      accessor: (q: any) => (
        <div className="flex items-center gap-2">
          {q.status === 'draft' && hasPermission('leads', 'edit') && (
            <>
              <button 
                onClick={() => handleStatusChange(q.id, 'accepted')}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                title={t('accept')}
              >
                <FileCheck size={16} />
              </button>
              <button 
                onClick={() => handleStatusChange(q.id, 'rejected')}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title={t('reject')}
              >
                <X size={16} />
              </button>
            </>
          )}
          <button 
            onClick={() => {
              const customer = customers.find(c => c.id === q.customer_id);
              const waNumber = customer?.whatsapp || customer?.phone;
              if (waNumber) {
                const message = lang === 'ar' 
                  ? `مرحباً ${customer.name}، إليك عرض السعر الخاص بك ${q.number} بإجمالي ${formatCurrency(q.total, business?.currency, lang)}.\n\n📄 تحميل ملف PDF:\n${window.location.origin}/api/public/quotes/${q.id}/pdf\n\n🔗 العرض التفاعلي:\n${window.location.origin}/quotes/${q.id}`
                  : `Hello ${customer.name}, here is your offer ${q.number} for a total of ${formatCurrency(q.total, business?.currency, lang)}.\n\n📄 Download PDF:\n${window.location.origin}/api/public/quotes/${q.id}/pdf\n\n🔗 Interactive View:\n${window.location.origin}/quotes/${q.id}`;
                sendWhatsAppMessage(waNumber, message);
              } else {
                alert('Customer has no phone or WhatsApp number');
              }
            }}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            title={t('whatsapp')}
          >
            <MessageCircle size={16} />
          </button>
          <a 
            href={`/api/public/quotes/${q.id}/pdf`}
            download
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Download PDF"
          >
            <Download size={16} />
          </a>
          <button 
            onClick={() => setViewingQuote(q)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title={t('view')}
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => {
              setViewingQuote(q);
              setTimeout(() => window.print(), 500);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title={t('print')}
          >
            <Printer size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable 
        title={t('salesQuotes')}
        data={quotes}
        columns={columns}
        isLoading={isLoading}
        onAdd={hasPermission('leads', 'add') ? () => setIsModalOpen(true) : undefined}
        onDelete={hasPermission('leads', 'delete') ? handleDelete : undefined}
      />

      <AnimatePresence>
        {viewingQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 print:p-0 print:static">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setViewingQuote(null)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }} 
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                <h2 className="text-2xl font-bold text-slate-900">{t('quoteDetails')}</h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setViewingQuote(null)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-12 space-y-10 overflow-y-auto max-h-[80vh] print:max-h-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        {business?.name?.charAt(0) || 'C'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{business?.name || 'CRM System'}</h3>
                      <p className="text-sm text-slate-500">{business?.email}</p>
                      <p className="text-sm text-slate-500">{business?.phone}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{t('quote')}</h2>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">{t('quoteNumber')}: {viewingQuote.number}</p>
                      <p className="text-sm text-slate-500">{t('date')}: {new Date(viewingQuote.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
                      {viewingQuote.expiry_date && (
                        <p className="text-sm text-rose-500 font-medium">{t('expiryDate')}: {new Date(viewingQuote.expiry_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('billTo')}</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="font-bold text-slate-900">
                        {customers.find(c => c.id === viewingQuote.customer_id)?.name || t('unknown')}
                      </p>
                      <p className="text-sm text-slate-500">
                        {customers.find(c => c.id === viewingQuote.customer_id)?.email}
                      </p>
                      <p className="text-sm text-slate-500">
                        {customers.find(c => c.id === viewingQuote.customer_id)?.phone}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('status')}</h4>
                    <div className="inline-flex">
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        viewingQuote.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 
                        viewingQuote.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {viewingQuote.status === 'accepted' ? t('accepted') : viewingQuote.status === 'rejected' ? t('rejected') : t('draft')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="pt-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-left rtl:text-right">
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('description')}</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">{t('quantity')}</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right rtl:text-left">{t('price')}</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right rtl:text-left">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {JSON.parse(viewingQuote.items || '[]').length > 0 ? (
                        JSON.parse(viewingQuote.items).map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="py-4 text-sm font-medium text-slate-900">{item.description}</td>
                            <td className="py-4 text-sm text-slate-500 text-center">{item.quantity}</td>
                            <td className="py-4 text-sm text-slate-500 text-right rtl:text-left">{formatCurrency(item.price, business?.currency, lang)}</td>
                            <td className="py-4 text-sm font-bold text-slate-900 text-right rtl:text-left">{formatCurrency(item.quantity * item.price, business?.currency, lang)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-6 text-sm font-medium text-slate-900">{t('serviceProduct')}</td>
                          <td className="py-6 text-sm text-slate-500 text-center">1</td>
                          <td className="py-6 text-sm text-slate-500 text-right rtl:text-left">{formatCurrency(viewingQuote.total, business?.currency, lang)}</td>
                          <td className="py-6 text-sm font-bold text-slate-900 text-right rtl:text-left">{formatCurrency(viewingQuote.total, business?.currency, lang)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="pt-8 border-t border-slate-100 flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t('subtotal')}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(viewingQuote.total, business?.currency, lang)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">{t('total')}</span>
                      <span className="text-lg font-black text-indigo-600">{formatCurrency(viewingQuote.total, business?.currency, lang)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-12 text-center space-y-2 border-t border-slate-50">
                  <p className="text-sm font-bold text-slate-900">{t('thankYouForBusiness')}</p>
                  <p className="text-xs text-slate-400">{t('quoteValidUntil')} {viewingQuote.expiry_date || t('na')}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-900">{t('createQuote')}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('customer')}</label>
                    <select required value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900">
                      <option value="">{t('selectCustomer')}</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('quoteNumber')}</label>
                    <input type="text" required value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('date')}</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('expiryDate')}</label>
                    <input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('items')}</h3>
                    <button 
                      type="button" 
                      onClick={addItem}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      <Plus size={14} />
                      <span>{t('addItem')}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('selectProject')}</label>
                              <select 
                                value={item.project_id || ''} 
                                onChange={e => updateItem(index, 'project_id', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none"
                              >
                                <option value="">{t('customItem')}</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('description')}</label>
                              <input 
                                type="text" 
                                required
                                value={item.description} 
                                onChange={e => updateItem(index, 'description', e.target.value)}
                                placeholder={t('itemDescription')}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none"
                              />
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeItem(index)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all mt-5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">{t('quantity')}</label>
                            <input 
                              type="number" 
                              required
                              min="1"
                              value={item.quantity} 
                              onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">{t('price')}</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={item.price} 
                              onChange={e => updateItem(index, 'price', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none"
                            />
                          </div>
                          <div className="space-y-1 hidden md:block">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">{t('total')}</label>
                            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-900">
                              {formatCurrency(item.quantity * item.price, business?.currency, lang)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">{t('totalAmount')}</span>
                    <span className="text-2xl font-black text-indigo-600">{formatCurrency(formData.total, business?.currency, lang)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">{t('cancel')}</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">{t('generateQuote')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
