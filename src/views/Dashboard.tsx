import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Wallet,
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layout,
  Plus,
  RefreshCw,
  Target,
  ListTodo,
  TrendingUp,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { formatCurrency } from '../utils/currency';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission, business } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleModules, setVisibleModules] = useState(['kpis', 'sales', 'activity', 'leads', 'tasks']);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const [statsRes, activityRes, reportRes, tasksRes] = await Promise.all([
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/dashboard/activity', { headers }),
        fetch('/api/reports', { headers }),
        fetch('/api/tasks?limit=4', { headers })
      ]);

      if (!statsRes.ok || !activityRes.ok || !reportRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch dashboard data. Please check if you are logged in and the server is running.');
      }

      const [statsData, activityData, reportData, tasksData] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
        reportRes.json(),
        tasksRes.json()
      ]);

      if (!statsData || typeof statsData !== 'object') {
        throw new Error('Invalid dashboard statistics received.');
      }

      setStats(statsData);
      setActivities(activityData || []);
      setReportData(reportData || {});
      setTasks(tasksData || []);
      setError(null);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // WebSocket for live updates
    const token = localStorage.getItem('token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}?token=${token}`);

    ws.onmessage = (event) => {
      const { type } = JSON.parse(event.data);
      if (type.includes(':created') || type.includes(':updated') || type.includes(':deleted')) {
        fetchData();
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    // Sync visible modules with business settings
    if (business?.modules) {
      try {
        const enabled = JSON.parse(business.modules);
        const newVisible = ['kpis'];
        if (enabled.includes('invoices')) newVisible.push('sales');
        newVisible.push('activity');
        if (enabled.includes('leads')) newVisible.push('leads');
        if (enabled.includes('tasks')) newVisible.push('tasks');
        setVisibleModules(newVisible);
      } catch (e) {
        console.error('Error parsing business modules in dashboard', e);
      }
    }
  }, [business?.modules]);

  if (isLoading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-3xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 bg-slate-50 rounded-3xl"></div>
        <div className="h-96 bg-slate-50 rounded-3xl"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button 
          onClick={() => { setError(null); setIsLoading(true); fetchData(); }}
          className="mt-2 text-sm font-medium underline hover:text-red-800 block"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="p-8 text-center text-slate-500">
      No dashboard data available.
    </div>
  );

  const kpis = [
    { id: 'customers', label: t('activeCustomers'), value: stats.totalCustomers.count, icon: Users, color: 'bg-blue-500', trend: '+12%', up: true, view: 'customers' },
    { id: 'leads', label: t('newLeads'), value: stats.activeLeads.count, icon: UserPlus, color: 'bg-indigo-500', trend: '+5%', up: true, view: 'leads' },
    { id: 'revenue', label: t('totalRevenue'), value: formatCurrency(stats.totalSales.sum || 0, business?.currency, lang), icon: Wallet, color: 'bg-emerald-500', trend: '+18%', up: true, view: 'invoices' },
    { id: 'projects', label: t('projects'), value: stats.totalProjects.count, icon: Layout, color: 'bg-purple-500', trend: '+8%', up: true, view: 'projects' },
    { id: 'tasks', label: t('pendingTasks'), value: stats.pendingTasks.count, icon: ListTodo, color: 'bg-amber-500', trend: '-2%', up: false, view: 'tasks' },
  ].filter(kpi => {
    if (business?.modules) {
      try {
        const enabled = JSON.parse(business.modules);
        const mappedId = kpi.id === 'revenue' ? 'invoices' : kpi.id;
        if (!enabled.includes(mappedId)) return false;
      } catch (e) {}
    }
    if (kpi.id === 'revenue') return hasPermission('invoices', 'view');
    return hasPermission(kpi.id as any, 'view');
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black transition-colors">{t('dashboard')}</h1>
          <p className="text-black transition-colors">{t('welcome')}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="p-3 bg-white border border-slate-200 rounded-xl text-black hover:bg-slate-50 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              <span>{t('quickAction')}</span>
            </button>
            
            <AnimatePresence>
              {isQuickActionOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsQuickActionOpen(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-20",
                      isRtl ? "left-0" : "right-0"
                    )}
                  >
                    {[
                      { id: 'customers', label: t('newCustomer'), icon: UserPlus },
                      { id: 'leads', label: t('newLead'), icon: Target },
                      { id: 'projects', label: t('newProject'), icon: Layout },
                      { id: 'tasks', label: t('newTask'), icon: ListTodo },
                      { id: 'invoices', label: t('newInvoice'), icon: Wallet },
                      { id: 'quotes', label: t('newQuote'), icon: FileCheck },
                    ].filter(action => {
                      if (business?.modules) {
                        try {
                          const enabled = JSON.parse(business.modules);
                          if (!enabled.includes(action.id)) return false;
                        } catch (e) {}
                      }
                      return hasPermission(action.id as any, 'add');
                    }).map((action) => (
                      <button
                        key={action.id}
                        onClick={() => {
                          onNavigate?.(action.id as any);
                          setIsQuickActionOpen(false);
                        }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-black hover:bg-slate-50 hover:text-indigo-600 transition-all"
                      >
                        <action.icon size={16} />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* KPI Grid Module */}
      {visibleModules.includes('kpis') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <motion.div 
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onNavigate?.(kpi.view as any)}
              className="bg-slate-50/50 hover:bg-white p-6 rounded-3xl border border-transparent hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden cursor-pointer active:scale-95"
            >
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg", kpi.color)}>
                  <kpi.icon size={24} />
                </div>
                <div className={cn("flex items-center gap-1 text-sm font-bold", kpi.up ? 'text-emerald-600' : 'text-rose-600', isRtl && "flex-row-reverse")}>
                  {kpi.trend}
                  {kpi.up ? <ArrowUpRight size={16} className={cn(isRtl && "rotate-270")} /> : <ArrowDownRight size={16} className={cn(isRtl && "rotate-90")} />}
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-slate-500 text-sm font-medium mb-1">{kpi.label}</h3>
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              </div>
              {/* Decorative background element */}
              <div className={cn("absolute -bottom-4 w-24 h-24 opacity-5 rounded-full", kpi.color, isRtl ? "-left-4" : "-right-4")}></div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Content Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Performance Module */}
        {visibleModules.includes('sales') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100/60 shadow-sm shadow-slate-200/20"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t('salesPerformance')}</h3>
                  <p className="text-sm text-slate-500">{t('revenueGrowthTrend')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData?.revenueByMonth || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, business?.currency, lang)}
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#ffffff',
                    }}
                    itemStyle={{
                      color: '#0f172a'
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Recent Activity Module */}
        {visibleModules.includes('activity') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl border border-slate-100/60 shadow-sm shadow-slate-200/20"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('recentActivity')}</h3>
              </div>
            </div>
            <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {activities.length > 0 ? activities.map((activity, i) => (
                <div 
                  key={i} 
                  className="flex gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all"
                  onClick={() => {
                    const viewMap: Record<string, any> = {
                      'customer': 'customers',
                      'lead': 'leads',
                      'invoice': 'invoices',
                      'task': 'tasks',
                      'product': 'products',
                      'quote': 'quotes',
                      'document': 'documents',
                      'notification': 'notifications',
                      'user': 'users-roles'
                    };
                    const targetView = viewMap[activity.entity_type];
                    if (targetView) onNavigate?.(targetView);
                  }}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    activity.action.includes('created') && "bg-emerald-50 text-emerald-600",
                    activity.action.includes('updated') && "bg-blue-50 text-blue-600",
                    activity.action.includes('deleted') && "bg-rose-50 text-rose-600",
                  )}>
                    {activity.action.includes('created') && <Plus size={18} />}
                    {activity.action.includes('updated') && <RefreshCw size={18} />}
                    {activity.action.includes('deleted') && <AlertCircle size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate capitalize">
                      {activity.entity_type} {activity.action.split(':')[1]}
                    </h4>
                    <p className="text-xs text-slate-500 mb-1 line-clamp-2">{activity.details}</p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {new Date(activity.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-slate-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t('noRecentActivity')}</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => onNavigate?.('reports')}
              className="w-full mt-8 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>{t('viewAuditLog')}</span>
              <ChevronRight size={16} className={isRtl ? "rotate-180" : ""} />
            </button>
          </motion.div>
        )}

        {/* Lead Pipeline Module */}
        {visibleModules.includes('leads') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onNavigate?.('leads')}
            className="bg-white p-8 rounded-3xl border border-slate-100/60 shadow-sm shadow-slate-200/20 cursor-pointer hover:border-indigo-100 transition-all"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t('leadPipeline')}</h3>
            </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData?.leadsByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                    >
                      {(reportData?.leadsByStatus || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#ffffff',
                        color: '#0f172a'
                      }}
                      itemStyle={{
                        color: '#0f172a'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(reportData?.leadsByStatus || []).slice(0, 4).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs text-slate-600 truncate capitalize">{item.status}: {item.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Tasks Module */}
        {visibleModules.includes('tasks') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100/60 shadow-sm shadow-slate-200/20"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <ListTodo size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t('priorityTasks')}</h3>
              </div>
              <button 
                onClick={() => onNavigate?.('tasks')}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                {t('viewAll')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.length > 0 ? tasks.map((task, i) => (
                <div 
                  key={i} 
                  onClick={() => onNavigate?.('tasks')}
                  className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      task.priority === 'high' && "bg-rose-100 text-rose-600",
                      task.priority === 'medium' && "bg-amber-100 text-amber-600",
                      task.priority === 'low' && "bg-blue-100 text-blue-600",
                    )}>
                      {t(task.priority as any)}
                    </span>
                    <CheckCircle2 size={18} className={cn(
                      "transition-colors",
                      task.status === 'completed' ? "text-emerald-600" : "text-slate-300 group-hover:text-indigo-600"
                    )} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">{task.title}</h4>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[11px] font-medium">{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 text-center py-12 text-slate-400">
                  <ListTodo size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t('noTasksFound')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
