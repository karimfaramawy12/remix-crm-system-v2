import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import DataTable, { Column } from '../components/DataTable';
import { Project } from '../types';
import { Plus, Building2, Edit2, Trash2, Search, MapPin, Home, Download, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToCSV } from '../utils/export';

export default function Projects() {
  const { t, isRtl } = useI18n();
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    status: 'planning',
    total_units: 0,
    available_units: 0,
    price_range: '',
    category: '',
    unit_type: '',
    image_url: '',
    plan_url: ''
  });

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
    const method = editingProject ? 'PUT' : 'POST';

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
        setEditingProject(null);
        setFormData({ 
          name: '', 
          description: '', 
          location: '', 
          status: 'planning', 
          total_units: 0, 
          available_units: 0, 
          price_range: '', 
          category: '',
          unit_type: '',
          image_url: '',
          plan_url: ''
        });
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      location: project.location || '',
      status: project.status,
      total_units: project.total_units || 0,
      available_units: project.available_units || 0,
      price_range: project.price_range || '',
      category: project.category || '',
      unit_type: project.unit_type || '',
      image_url: project.image_url || '',
      plan_url: project.plan_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteLeadConfirm'))) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleExport = () => {
    exportToCSV(projects, 'projects');
  };

  const columns: Column<Project>[] = [
    { 
      header: t('name'), 
      accessor: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Building2 size={20} className="text-slate-400" />
            )}
          </div>
          <div>
            <span className="font-bold block text-slate-900">{p.name}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">{p.category}</span>
          </div>
        </div>
      )
    },
    { 
      header: t('unitType'), 
      accessor: (p) => (
        <div className="flex items-center gap-1 text-slate-600">
          <Home size={14} className="text-slate-400" />
          <span className="text-sm">{p.unit_type || '-'}</span>
        </div>
      )
    },
    { 
      header: t('location'), 
      accessor: (p) => (
        <div className="flex items-center gap-1 text-slate-500">
          <MapPin size={14} />
          <span className="text-sm">{p.location}</span>
        </div>
      )
    },
    { 
      header: t('status'), 
      accessor: (p) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          p.status === 'planning' ? 'bg-blue-100 text-blue-600' :
          p.status === 'construction' ? 'bg-amber-100 text-amber-600' :
          p.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
          'bg-rose-100 text-rose-600'
        }`}>
          {t(p.status as any)}
        </span>
      )
    },
    { 
      header: t('units'), 
      accessor: (p) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{p.available_units}</span>
          <span className="text-xs text-slate-400">/ {p.total_units}</span>
        </div>
      )
    },
    { 
      header: t('planUrl'), 
      accessor: (p) => p.plan_url ? (
        <a 
          href={p.plan_url} 
          target="_blank" 
          rel="noreferrer"
          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText size={16} />
        </a>
      ) : '-'
    },
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
        title={t('projectCatalog')}
        data={projects}
        columns={columns}
        isLoading={loading}
        onAdd={hasPermission('products', 'add') ? () => {
          setEditingProject(null);
          setFormData({ 
            name: '', 
            description: '', 
            location: '', 
            status: 'planning', 
            total_units: 0, 
            available_units: 0, 
            price_range: '', 
            category: '',
            unit_type: '',
            image_url: '',
            plan_url: ''
          });
          setIsModalOpen(true);
        } : undefined}
        onEdit={hasPermission('products', 'edit') ? handleEdit : undefined}
        onDelete={hasPermission('products', 'delete') ? (p) => handleDelete(p.id) : undefined}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProject ? t('edit') : t('addProject')}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('location')}
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('unitType')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apartment, Villa"
                      value={formData.unit_type}
                      onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    >
                      <option value="planning">{t('planning')}</option>
                      <option value="construction">{t('construction')}</option>
                      <option value="completed">{t('completed')}</option>
                      <option value="sold_out">{t('soldOut')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('category')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Residential, Commercial"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('totalUnits')}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.total_units}
                      onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('availableUnits')}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.available_units}
                      onChange={(e) => setFormData({ ...formData, available_units: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('imageUrl')}
                    </label>
                    <div className="flex gap-2 text-slate-900">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      {formData.image_url && (
                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden">
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('planUrl')}
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="url"
                        placeholder="https://example.com/plan.pdf"
                        value={formData.plan_url}
                        onChange={(e) => setFormData({ ...formData, plan_url: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('priceRange')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. $200k - $500k"
                      value={formData.price_range}
                      onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
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
