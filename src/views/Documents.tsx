import React, { useState, useEffect } from 'react';
import { History, Plus, File, Search, MoreVertical, Download, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';

export default function Documents() {
  const { t, isRtl } = useI18n();
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'pdf',
    url: '',
    size: 0
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        fetchDocuments();
        setIsModalOpen(false);
        setNewDoc({ name: '', type: 'pdf', url: '', size: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteDocConfirm'))) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('bytes')}`;
    const k = 1024;
    const sizes = [t('bytes'), t('kb'), t('mb'), t('gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('documents')}</h1>
          <p className="text-slate-500">{t('documentsDesc')}</p>
        </div>
        {hasPermission('documents', 'add') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {t('uploadDoc')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {documents.map((doc) => (
          <motion.div 
            key={doc.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group relative"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
              <File size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{doc.name}</h3>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-4">{doc.type}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-xs text-slate-400">{formatSize(doc.size)}</span>
              <div className="flex gap-2">
                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <Download size={16} />
                </button>
                {hasPermission('documents', 'delete') && (
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
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
            className="bg-white rounded-3xl shadow-2xl w-full max-lg overflow-hidden border border-slate-200"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">{t('uploadDoc')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('docName')}</label>
                <input 
                  type="text" 
                  required
                  value={newDoc.name}
                  onChange={e => setNewDoc({...newDoc, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('docType')}</label>
                <select 
                  required
                  value={newDoc.type}
                  onChange={e => setNewDoc({...newDoc, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">{t('wordDoc')}</option>
                  <option value="xlsx">{t('excelSheet')}</option>
                  <option value="png">{t('imagePng')}</option>
                  <option value="jpg">{t('imageJpg')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('docUrlMock')}</label>
                <input 
                  type="text" 
                  required
                  value={newDoc.url}
                  onChange={e => setNewDoc({...newDoc, url: e.target.value})}
                  placeholder="https://example.com/doc.pdf"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('fileSizeBytes')}</label>
                <input 
                  type="number" 
                  required
                  value={newDoc.size}
                  onChange={e => setNewDoc({...newDoc, size: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900"
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
                  {t('upload')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
