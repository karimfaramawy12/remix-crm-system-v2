import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
  type?: 'info' | 'warning' | 'success';
}

export default function Notifications() {
  const { t, isRtl } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_read: 1 })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('notifications')}</h1>
          <p className="text-slate-500">{isRtl ? 'ابقَ على اطلاع بأحدث التنبيهات والأنشطة' : 'Stay updated with your latest alerts and activities'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            disabled={notifications.every(n => n.is_read === 1)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Check size={18} />
            <span>{isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">{isRtl ? 'جاري تحميل التنبيهات...' : 'Loading notifications...'}</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {notifications.map((n, i) => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-6 flex gap-4 hover:bg-slate-50/50 transition-all group",
                  n.is_read === 0 && "bg-indigo-50/30"
                )}
              >
                <div className="shrink-0 mt-1">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("font-bold text-slate-900", n.is_read === 0 && "text-indigo-900")}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(n.created_at).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {n.is_read === 0 && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        {isRtl ? 'تحديد كمقروء' : 'Mark as read'}
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(n.id)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      {t('delete')}
                    </button>
                  </div>
                </div>
                {n.is_read === 0 && (
                  <div className="shrink-0">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <Bell size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{isRtl ? 'لا توجد تنبيهات' : 'No notifications'}</h3>
              <p className="text-sm text-slate-400">{isRtl ? 'أنت على اطلاع بكل شيء!' : 'You are all caught up!'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
