import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import DataTable, { Column } from '../components/DataTable';
import { Task } from '../types';
import { Plus, CheckSquare, Edit2, Trash2, Calendar, Clock, LayoutGrid, List as ListIcon, PlayCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { exportToCSV } from '../utils/export';

export default function Tasks() {
  const { t, isRtl } = useI18n();
  const { hasPermission } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending' as const,
    priority: 'medium' as const,
    assigned_to: ''
  });

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch tasks');
      }
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
    const method = editingTask ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingTask(null);
        setFormData({
          title: '',
          description: '',
          due_date: '',
          status: 'pending',
          priority: 'medium',
          assigned_to: ''
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    let newStatus: Task['status'];
    if (task.status === 'pending') newStatus = 'in_progress';
    else if (task.status === 'in_progress') newStatus = 'completed';
    else newStatus = 'pending';

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: Task['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...task, status })
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteLeadConfirm'))) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleExport = () => {
    exportToCSV(tasks, 'tasks');
  };

  const columns: Column<Task>[] = [
    { 
      header: t('status'), 
      accessor: (task: Task) => (
        <button 
          disabled={!hasPermission('tasks', 'edit')}
          onClick={() => handleToggleStatus(task)}
          className={clsx(
            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
            task.status === 'completed' && "bg-emerald-500 border-emerald-500 text-white",
            task.status === 'in_progress' && "bg-indigo-500 border-indigo-500 text-white",
            task.status === 'pending' && "border-slate-300 hover:border-emerald-500",
            !hasPermission('tasks', 'edit') && "opacity-50 cursor-not-allowed"
          )}
        >
          {task.status === 'completed' && <CheckSquare size={14} />}
          {task.status === 'in_progress' && <PlayCircle size={14} />}
        </button>
      )
    },
    { 
      header: t('title'), 
      accessor: (task: Task) => (
        <div className={clsx(
          task.status === 'completed' ? "line-through text-slate-400" : "text-slate-900"
        )}>
          {task.title}
        </div>
      )
    },
    {
      header: t('priority'),
      accessor: (task: Task) => (
        <span className={clsx(
          "px-2 py-1 rounded-full text-xs font-medium",
          task.priority === 'high' ? "bg-red-100 text-red-700" :
          task.priority === 'medium' ? "bg-amber-100 text-amber-700" :
          "bg-blue-100 text-blue-700"
        )}>
          {t(task.priority as any)}
        </span>
      )
    },
    {
      header: t('dueDate'),
      accessor: (task: Task) => (
        <span className="text-slate-600">
          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
        </span>
      )
    }
  ];

  const kanbanColumns = [
    { id: 'pending', title: t('pending'), color: 'bg-slate-100 text-slate-600' },
    { id: 'in_progress', title: t('live'), color: 'bg-indigo-50 text-indigo-600', isLive: true },
    { id: 'completed', title: t('completed'), color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tasks')}</h1>
          <p className="text-slate-500">{t('missionLiveStatus')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              viewMode === 'list' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <ListIcon size={18} />
            <span>{t('list')}</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              viewMode === 'kanban' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <LayoutGrid size={18} />
            <span>{t('kanban')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => { setError(null); setLoading(true); fetchTasks(); }}
            className="mt-2 text-sm font-medium underline hover:text-red-800 block"
          >
            Try Again
          </button>
        </div>
      )}
      {viewMode === 'list' ? (
        <DataTable 
          title={t('tasksFollowups')}
          data={tasks}
          columns={columns}
          isLoading={loading}
          onAdd={hasPermission('tasks', 'add') ? () => {
            setEditingTask(null);
            setFormData({
              title: '',
              description: '',
              due_date: '',
              status: 'pending',
              priority: 'medium',
              assigned_to: ''
            });
            setIsModalOpen(true);
          } : undefined}
          onEdit={hasPermission('tasks', 'edit') ? handleEdit : undefined}
          onDelete={hasPermission('tasks', 'delete') ? (task) => handleDelete(task.id) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kanbanColumns.map(column => (
            <div key={column.id} className="flex flex-col h-full min-h-[500px]">
              <div className={clsx(
                "flex items-center justify-between p-4 rounded-t-2xl border-b border-white/20",
                column.color
              )}>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold uppercase tracking-wider text-xs">{column.title}</h3>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {tasks.filter(t => t.status === column.id).length}
                  </span>
                </div>
                {column.id === 'in_progress' && (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase">{t('live')}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 bg-slate-50/50 p-4 rounded-b-2xl space-y-4 overflow-y-auto">
                {tasks.filter(t => t.status === column.id).map((task, i) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group cursor-pointer"
                    onClick={() => handleEdit(task)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={clsx(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        task.priority === 'high' ? "bg-rose-100 text-rose-600" :
                        task.priority === 'medium' ? "bg-amber-100 text-amber-600" :
                        "bg-blue-100 text-blue-600"
                      )}>
                        {t(task.priority as any)}
                      </span>
                      <div className="flex items-center gap-1">
                        {column.id !== 'pending' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'pending'); }}
                            className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                          >
                            <Clock size={14} />
                          </button>
                        )}
                        {column.id !== 'in_progress' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'in_progress'); }}
                            className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                          >
                            <PlayCircle size={14} />
                          </button>
                        )}
                        {column.id !== 'completed' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'completed'); }}
                            className="p-1 text-slate-300 hover:text-emerald-600 transition-colors"
                          >
                            <CheckSquare size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h4 className={clsx(
                      "text-sm font-bold text-slate-800 mb-2",
                      task.status === 'completed' && "line-through opacity-50"
                    )}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-[10px] font-medium">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                          className="p-1 text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {hasPermission('tasks', 'add') && (
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setFormData({
                        title: '',
                        description: '',
                        due_date: '',
                        status: column.id as any,
                        priority: 'medium',
                        assigned_to: ''
                      });
                      setIsModalOpen(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    <Plus size={14} />
                    <span>{t('addNew')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTask ? t('edit') : t('addNew')}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {t('title')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {t('description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      {t('dueDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      {t('status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="pending">{t('pending')}</option>
                      <option value="in_progress">{t('live')}</option>
                      <option value="completed">{t('completed')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      {t('priority')}
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="low">{t('low')}</option>
                      <option value="medium">{t('medium')}</option>
                      <option value="high">{t('high')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    {t('save')}
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
