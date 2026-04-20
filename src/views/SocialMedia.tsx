import React, { useState, useEffect } from 'react';
import { Share2, Plus, Twitter, Linkedin, Facebook, MoreVertical, Calendar, Clock, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';

export default function SocialMedia() {
  const { t, isRtl, lang } = useI18n();
  const { hasPermission } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newPost, setNewPost] = useState({
    platform: 'twitter',
    content: '',
    scheduled_at: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/social-posts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newPost)
      });
      if (res.ok) {
        fetchPosts();
        setIsModalOpen(false);
        setNewPost({ platform: 'twitter', content: '', scheduled_at: '', status: 'draft' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <Twitter className="text-sky-500" size={20} />;
      case 'linkedin': return <Linkedin className="text-blue-700" size={20} />;
      case 'facebook': return <Facebook className="text-blue-600" size={20} />;
      default: return <Share2 size={20} />;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deletePostConfirm'))) return;
    try {
      const res = await fetch(`/api/social-posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostNow = async (id: string) => {
    if (!confirm(t('postNowConfirm'))) return;
    try {
      const res = await fetch(`/api/social-posts/${id}/post`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchPosts();
        alert(t('postSuccess'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('socialMedia')}</h1>
          <p className="text-slate-500">{t('socialMediaDesc')}</p>
        </div>
        {hasPermission('social', 'add') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {t('schedulePost')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-6"
          >
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                {getPlatformIcon(post.platform)}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{post.platform}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    post.status === 'posted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {post.status === 'posted' ? t('posted') : t('scheduled')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {post.status !== 'posted' && hasPermission('social', 'edit') && (
                    <button 
                      onClick={() => handlePostNow(post.id)}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title={t('postNow')}
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                  {hasPermission('social', 'delete') && (
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-slate-700 mb-4">{post.content}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : t('notScheduled')}
                </div>
                {post.scheduled_at && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(post.scheduled_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
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
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-bold text-slate-900">{t('schedulePost')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('platform')}</label>
                <div className="flex gap-4">
                  {['twitter', 'linkedin', 'facebook'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPost({...newPost, platform: p})}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        newPost.platform === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {getPlatformIcon(p)}
                      <span className="capitalize font-bold">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('content')}</label>
                <textarea 
                  required
                  rows={4}
                  value={newPost.content}
                  onChange={e => setNewPost({...newPost, content: e.target.value})}
                  placeholder={t('socialMediaPlaceholder')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 mx-1">{t('scheduleAt')}</label>
                <input 
                  type="datetime-local" 
                  value={newPost.scheduled_at}
                  onChange={e => setNewPost({...newPost, scheduled_at: e.target.value})}
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
                  {t('schedule')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
