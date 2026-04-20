import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { generateAIContent } from '../services/ai';

export default function AIAssistant() {
  const { t, isRtl } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setIsLoading(true);

    try {
      const systemInstruction = `You are a data analyst. Provide clear, actionable insights from the provided data. ${isRtl ? 'Always respond in professional Arabic.' : 'Always respond in professional English.'}`;
      const text = await generateAIContent(userMsg, systemInstruction);
      setMessages(prev => [...prev, { role: 'ai', text: text || (isRtl ? 'عذراً، واجهت خطأ.' : 'Sorry, I encountered an error.') }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: isRtl ? 'فشل الاتصال بمساعد الذكاء الاصطناعي.' : 'Failed to connect to AI assistant.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("fixed bottom-6 z-50", isRtl ? "left-6" : "right-6")}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "absolute bottom-20 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden",
              isRtl ? "left-0" : "right-0"
            )}
          >
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-semibold">{t('aiAssistant')}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Sparkles className="mx-auto mb-2 opacity-20" size={40} />
                  <p>{isRtl ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}</p>
                  <p className="text-xs mt-1">{isRtl ? 'جرب: "حلل العملاء المحتملين" أو "اكتب بريد متابعة"' : 'Try: "Analyze my leads" or "Write a follow-up email"'}</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm transition-colors",
                    m.role === 'user' 
                      ? cn("bg-indigo-600 text-white", isRtl ? "rounded-tl-none" : "rounded-tr-none")
                      : cn("bg-white text-slate-700 border border-slate-100 shadow-sm", isRtl ? "rounded-tr-none" : "rounded-tl-none")
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={cn("bg-white p-3 rounded-2xl border border-slate-100 shadow-sm", isRtl ? "rounded-tr-none" : "rounded-tl-none")}>
                    <Loader2 className="animate-spin text-indigo-600" size={16} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder={t('askAnything')}
                  className={cn(
                    "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400",
                    isRtl ? "pr-4 pl-12" : "pl-4 pr-12"
                  )}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !query.trim()}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all",
                    isRtl ? "left-2" : "right-2"
                  )}
                >
                  <Send size={16} className={cn(isRtl && "rotate-180")} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
      >
        <Bot size={28} />
      </button>
    </div>
  );
}
