import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Printer, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface QuoteItem {
  description: string;
  quantity: number;
  price: number;
}

interface PublicQuoteData {
  id: string;
  number: string;
  date: string;
  expiry_date: string;
  total: number;
  status: string;
  items: QuoteItem[];
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  business_name: string;
  business_logo?: string;
  primary_color: string;
  secondary_color: string;
  business_currency?: string;
}

export default function PublicQuote({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<PublicQuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/public/quotes/${quoteId}`)
      .then(res => {
        if (!res.ok) throw new Error('Quote not found');
        return res.json();
      })
      .then(data => {
        setQuote(data);
        if (data.status === 'accepted') setIsAccepted(true);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [quoteId]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`/api/public/quotes/${quoteId}/accept`, { method: 'POST' });
      if (res.ok) {
        setIsAccepted(true);
      }
    } catch (err) {
      alert('Failed to accept quote. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-serif font-light text-slate-900 mb-4">Quote Not Found</h1>
          <p className="text-slate-500 mb-8">This quote may have expired or the link is invalid.</p>
          <a href="/" className="px-8 py-3 bg-slate-900 text-white rounded-full text-sm font-medium">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans selection:bg-slate-900 selection:text-white pb-20">
      {/* Decorative Background Element */}
      <div className="fixed top-0 right-0 w-1/3 h-screen bg-slate-100/50 -skew-x-12 translate-x-1/2 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 pt-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-8">
              {quote.business_logo ? (
                <img src={quote.business_logo} alt="Logo" className="h-10 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  {quote.business_name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                {quote.business_name}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-serif font-light leading-none tracking-tight mb-4">
              Quote <br />
              <span className="text-slate-400">#{quote.number}</span>
            </h1>
            <div className="flex gap-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Issue Date</p>
                <p className="font-serif text-lg italic">{new Date(quote.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Valid Until</p>
                <p className="font-serif text-lg italic">{new Date(quote.expiry_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-6">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Prepared For</p>
              <h2 className="text-2xl font-serif mb-1">{quote.customer_name}</h2>
              {quote.customer_email && <p className="text-sm text-slate-500">{quote.customer_email}</p>}
              {quote.customer_phone && <p className="text-sm text-slate-500">{quote.customer_phone}</p>}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
              >
                <Printer size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Status Bar */}
        {isAccepted && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-800"
          >
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-bold">Transaction Accepted</p>
              <p className="text-sm text-emerald-600">This quote has been accepted. We will contact you shortly.</p>
            </div>
          </motion.div>
        )}

        {/* Content Section */}
        <div className="relative z-10 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200/60 mb-12">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            <div className="col-span-6 md:col-span-7">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-4 md:col-span-3 text-right">Price</div>
          </div>

          {/* Table Items */}
          <div className="divide-y divide-slate-100">
            {quote.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-8 py-6 hover:bg-slate-50/50 transition-colors">
                <div className="col-span-6 md:col-span-7">
                  <p className="font-serif text-lg">{item.description}</p>
                </div>
                <div className="col-span-2 text-right font-serif text-lg text-slate-500">
                  {item.quantity}
                </div>
                <div className="col-span-4 md:col-span-3 text-right font-serif text-lg">
                  {formatCurrency(item.price, quote.business_currency, 'en')}
                </div>
              </div>
            ))}
          </div>

          {/* Footer / Total */}
          <div className="bg-slate-900 p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-xs uppercase tracking-[0.2em] opacity-50 mb-1">Total Invitation</p>
              <p className="text-5xl font-serif font-light">{formatCurrency(quote.total, quote.business_currency, 'en')}</p>
            </div>
            
            {!isAccepted && (
              <button 
                onClick={handleAccept}
                className="group relative flex items-center gap-4 px-12 py-5 bg-white text-slate-900 rounded-full font-bold text-sm tracking-widest uppercase hover:pr-14 transition-all overflow-hidden"
              >
                <span>Accept Proposition</span>
                <CheckCircle2 size={18} className="absolute right-8 opacity-0 group-hover:opacity-100 group-hover:right-10 transition-all" />
              </button>
            )}
          </div>
        </div>

        {/* Business Info Footer */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Contact</h3>
            <div className="space-y-3">
              <a href={`mailto:${quote.customer_email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                <Mail size={16} />
                <span>{quote.business_name} Support</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ShieldCheck size={16} />
                <span>Secure Document</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Address</h3>
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>Registerd Address,<br />New Cairo, Egypt</span>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Verification</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed italic font-serif">
              This is a digital document generated on our secure CRM platform. <br />
              ID: {quote.id.split('-')[0].toUpperCase()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
