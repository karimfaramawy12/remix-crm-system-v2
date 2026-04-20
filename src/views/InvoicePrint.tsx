import React, { useEffect, useState } from 'react';
import { Printer, Download, ChevronLeft } from 'lucide-react';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { formatCurrency } from '../utils/currency';

interface InvoicePrintProps {
  invoiceId: string;
  onBack?: () => void;
}

export default function InvoicePrint({ invoiceId, onBack }: InvoicePrintProps) {
  const { business } = useAuth();
  const { lang } = useI18n();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      }
      setLoading(false);
    };
    fetchInvoice();
  }, [invoiceId]);

  if (loading) return <div className="p-8">Loading invoice...</div>;
  if (!invoice) return <div className="p-8 text-rose-600 font-bold">Invoice not found</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Actions - Hidden on print */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            <ChevronLeft size={20} />
            Back to Invoices
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Printer size={20} />
              Print Invoice
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-12 print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">INVOICE</h1>
              <p className="text-slate-500 font-bold">#{invoice.number}</p>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-4 ml-auto">
                C
              </div>
              <h2 className="text-xl font-bold text-slate-900">CRM</h2>
              <p className="text-slate-500">billing@crm-system.com</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">BILL TO</h3>
              <p className="text-lg font-bold text-slate-900">{invoice.customer_name}</p>
              <p className="text-slate-600">{invoice.customer_company}</p>
              <p className="text-slate-600">{invoice.customer_email}</p>
            </div>
            <div className="text-right">
              <div className="mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">DATE ISSUED</h3>
                <p className="font-bold text-slate-900">{new Date(invoice.date).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">DUE DATE</h3>
                <p className="font-bold text-slate-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-12">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="text-left py-4 text-xs font-black text-slate-400 uppercase tracking-widest">DESCRIPTION</th>
                  <th className="text-center py-4 text-xs font-black text-slate-400 uppercase tracking-widest">QTY</th>
                  <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">PRICE</th>
                  <th className="text-right py-4 text-xs font-black text-slate-400 uppercase tracking-widest">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-6 font-bold text-slate-900">{item.description}</td>
                    <td className="py-6 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-6 text-right text-slate-600">{formatCurrency(item.price, business?.currency, lang)}</td>
                    <td className="py-6 text-right font-bold text-slate-900">{formatCurrency(item.quantity * item.price, business?.currency, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.total, business?.currency, lang)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (0%)</span>
                <span>{formatCurrency(0, business?.currency, lang)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-slate-100 text-xl font-black text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(invoice.total, business?.currency, lang)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-24 pt-12 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-sm">Thank you for your business!</p>
            <p className="text-slate-400 text-xs mt-2">CRM Platform • 123 Business Way • Tech City</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; }
          .min-h-screen { background: white; padding: 0; }
          .max-w-4xl { max-width: 100%; }
        }
      `}} />
    </div>
  );
}
