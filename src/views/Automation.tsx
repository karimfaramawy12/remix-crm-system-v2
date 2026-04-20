import React, { useState, useEffect } from 'react';
import { Zap, Plus, Search, MoreVertical, Play, Pause, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';

export default function Automation() {
  const { t, isRtl } = useI18n();
  const { hasPermission } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_event: 'customer_created',
    action_type: 'create_task',
    action_data: JSON.stringify({ title: 'Follow up with new customer', priority: 'high' }),
    is_active: 1
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automation-rules', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newRule)
      });
      if (res.ok) {
        fetchRules();
        setIsModalOpen(false);
        setNewRule({
          name: '',
          trigger_event: 'customer_created',
          action_type: 'create_task',
          action_data: JSON.stringify({ title: 'Follow up with new customer', priority: 'high' }),
          is_active: 1
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRule = async (rule: any) => {
    try {
      await fetch(`/api/automation-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...rule, is_active: rule.is_active ? 0 : 1 })
      });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteRuleConfirm'))) return;
    try {
      const res = await fetch(`/api/automation-rules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch(trigger) {
      case 'customer_created': return t('customerCreated');
      case 'lead_created': return t('leadCreated');
      case 'lead_updated': return isRtl ? 'تحديث العميل المحتمل' : 'Lead Updated';
      case 'quote_created': return t('quoteCreated');
      case 'invoice_created': return isRtl ? 'إنشاء فاتورة' : 'Invoice Created';
      case 'task_created': return isRtl ? 'إنشاء مهمة' : 'Task Created';
      case 'task_updated': return isRtl ? 'تحديث مهمة' : 'Task Updated';
      default: return trigger.replace('_', ' ');
    }
  };

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'create_task': return t('createTask');
      case 'send_email': return t('sendEmail');
      case 'notify_user': return t('notifyUser');
      case 'convert_lead': return isRtl ? 'تحويل للعملاء' : 'Convert to Customer';
      case 'create_invoice': return isRtl ? 'إنشاء فاتورة مسودة' : 'Create Draft Invoice';
      case 'auto_assign': return isRtl ? 'تعيين تلقائي' : 'Auto Assign';
      case 'whatsapp_alert': return isRtl ? 'تنبيه واتساب' : 'WhatsApp Alert';
      case 'set_field': return isRtl ? 'تحديث حقل' : 'Update Field';
      default: return action.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('automation')}</h1>
          <p className="text-slate-500">{t('automationDesc')}</p>
        </div>
        {hasPermission('automation', 'add') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {t('createRule')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <motion.div 
            key={rule.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group"
          >
            <div className={`flex items-center gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                rule.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
              }`}>
                <Zap size={24} />
              </div>
              <div className={isRtl ? 'text-right' : ''}>
                <h3 className="text-lg font-bold text-slate-900">{rule.name}</h3>
                <div className={`flex items-center gap-4 mt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {t('trigger')}: {getTriggerLabel(rule.trigger_event)}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {t('action_label')}: {getActionLabel(rule.action_type)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {hasPermission('automation', 'edit') && (
                <button 
                  onClick={() => toggleRule(rule)}
                  className={`p-2 rounded-xl transition-all ${
                    rule.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {rule.is_active ? <Pause size={20} /> : <Play size={20} />}
                </button>
              )}
              {hasPermission('automation', 'delete') && (
                <button 
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              )}
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
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">{t('createAutomationRule')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('ruleName')}</label>
                <input 
                  type="text" 
                  required
                  value={newRule.name}
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                  placeholder={t('ruleNamePlaceholder')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 mx-1">{t('triggerEvent')}</label>
                  <select 
                    required
                    value={newRule.trigger_event}
                    onChange={e => setNewRule({...newRule, trigger_event: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="customer_created">{t('customerCreated')}</option>
                    <option value="lead_created">{t('leadCreated')}</option>
                    <option value="lead_updated">{isRtl ? 'تحديث العميل المحتمل' : 'Lead Updated'}</option>
                    <option value="quote_created">{t('quoteCreated')}</option>
                    <option value="invoice_created">{isRtl ? 'إنشاء فاتورة' : 'Invoice Created'}</option>
                    <option value="task_created">{isRtl ? 'إنشاء مهمة' : 'Task Created'}</option>
                    <option value="task_updated">{isRtl ? 'تحديث مهمة' : 'Task Updated'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 mx-1">{t('actionType')}</label>
                  <select 
                    required
                    value={newRule.action_type}
                    onChange={e => setNewRule({...newRule, action_type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="create_task">{t('createTask')}</option>
                    <option value="send_email">{t('sendEmail')}</option>
                    <option value="notify_user">{t('notifyUser')}</option>
                    <option value="convert_lead">{isRtl ? 'تحويل للعملاء' : 'Convert to Customer'}</option>
                    <option value="create_invoice">{isRtl ? 'إنشاء فاتورة مسودة' : 'Create Draft Invoice'}</option>
                    <option value="auto_assign">{isRtl ? 'تعيين تلقائي' : 'Auto Assign'}</option>
                    <option value="whatsapp_alert">{isRtl ? 'تنبيه واتساب (تجريبي)' : 'WhatsApp Alert (Mock)'}</option>
                    <option value="set_field">{isRtl ? 'تحديث حقل مخصص' : 'Update Custom Field'}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('actionDataJson')}</label>
                <textarea 
                  required
                  rows={4}
                  value={newRule.action_data}
                  onChange={e => setNewRule({...newRule, action_data: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
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
                  {t('createRule')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
