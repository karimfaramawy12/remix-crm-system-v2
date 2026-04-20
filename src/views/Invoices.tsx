import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Invoice, Customer } from '../types';
import { FileText, Calendar, DollarSign, Download, X, Printer, Download as DownloadIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { exportToCSV } from '../utils/export';
import { formatCurrency } from '../utils/currency';

interface InvoicesProps {
  onPrint?: (id: string) => void;
}

export default function Invoices({ onPrint }: InvoicesProps) {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission, business } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    number: `INV-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    total: 0,
    status: 'draft' as const
  });

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const [invRes, custRes] = await Promise.all([
      fetch('/api/invoices', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const [invs, custs] = await Promise.all([invRes.json(), custRes.json()]);
    setInvoices(invs);
    setCustomers(custs);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices';
    const method = editingInvoice ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    setIsModalOpen(false);
    setEditingInvoice(null);
    fetchData();
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(t('deleteInvoiceConfirm'))) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id || '',
      number: invoice.number || '',
      date: invoice.date || '',
      due_date: invoice.due_date || '',
      total: invoice.total || 0,
      status: invoice.status || 'draft'
    });
    setIsModalOpen(true);
  };

  const handleExport = () => {
    exportToCSV(invoices, 'invoices');
  };

  const columns = [
    { 
      header: t('invoiceNumber'), 
      accessor: (i: Invoice) => (
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <FileText size={14} className="text-slate-400" />
          {i.number}
        </div>
      )
    },
    { 
      header: t('customer'), 
      accessor: (i: Invoice) => (
        <span className="text-slate-600">
          {customers.find(c => c.id === i.customer_id)?.name || t('unknown')}
        </span>
      )
    },
    { 
      header: t('amount'), 
      accessor: (i: Invoice) => (
        <div className="font-bold text-slate-900">
          {formatCurrency(i.total, business?.currency, lang)}
        </div>
      )
    },
    { 
      header: t('status'), 
      accessor: (i: Invoice) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          i.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
          i.status === 'overdue' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {i.status === 'paid' ? t('paid') : i.status === 'overdue' ? t('overdue') : t('draft')}
        </span>
      )
    },
    { 
      header: t('dueDate'), 
      accessor: (i: Invoice) => (
        <span className="text-slate-600">
          {new Date(i.due_date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
        </span>
      )
    },
    {
      header: t('actions'),
      accessor: (i: Invoice) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onPrint?.(i.id)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title={t('printInvoice')}
          >
            <Printer size={16} />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Download size={16} />
          </button>
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
          <DownloadIcon size={18} />
          <span>{t('export')}</span>
        </button>
      </div>
      <DataTable 
        title={t('invoicesBilling')}
        data={invoices}
        columns={columns}
        isLoading={isLoading}
        onAdd={hasPermission('invoices', 'add') ? () => {
          setEditingInvoice(null);
          setFormData({
            customer_id: '',
            number: `INV-${Math.floor(Math.random() * 10000)}`,
            date: new Date().toISOString().split('T')[0],
            due_date: '',
            total: 0,
            status: 'draft' as const
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
                <h2 className="text-2xl font-bold text-slate-900">{t('createInvoice')}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500"><X size={20} /></button>
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
                    <label className="text-sm font-semibold text-slate-700">{t('invoiceNumber')}</label>
                    <input type="text" required value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('dueDate')}</label>
                    <input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('totalAmount')}</label>
                    <input type="number" required value={formData.total} onChange={e => setFormData({...formData, total: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">{t('cancel')}</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">{t('generateInvoice')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
