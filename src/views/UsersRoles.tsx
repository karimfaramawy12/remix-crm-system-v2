import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Mail, Trash2, ShieldCheck, User, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';

export default function UsersRoles() {
  const { t, isRtl } = useI18n();
  const { business } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const MODULES = [
    { id: 'dashboard', name: t('dashboard'), navId: 'dashboard' },
    { id: 'customers', name: t('customers'), navId: 'customers' },
    { id: 'leads', name: t('leads'), navId: 'leads' },
    { id: 'tasks', name: t('tasks'), navId: 'tasks' },
    { id: 'invoices', name: t('invoices'), navId: 'invoices' },
    { id: 'products', name: t('products'), navId: 'projects' },
    { id: 'documents', name: t('documents'), navId: 'documents' },
    { id: 'social', name: t('socialMedia'), navId: 'social-media' },
    { id: 'automation', name: t('automation'), navId: 'automation' },
    { id: 'users', name: t('usersAndRoles'), navId: 'users-roles' },
  ].filter(mod => {
    if (!business?.modules) return true;
    try {
      const enabled = JSON.parse(business.modules);
      // Dashboard and Users/Roles should usually be visible if possible
      if (mod.id === 'users' || mod.id === 'dashboard') return true;
      return enabled.includes(mod.navId) || (mod.id === 'social' && (enabled.includes('social-media') || enabled.includes('email-marketing')));
    } catch (e) {
      return true;
    }
  });

  const DEFAULT_PERMISSIONS = MODULES.reduce((acc, mod) => ({
    ...acc,
    [mod.id]: { view: true, add: true, edit: true, delete: true }
  }), {});

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'agent', permissions: DEFAULT_PERMISSIONS });
  const [error, setError] = useState('');

  const ROLES = [
    { id: 'owner', name: t('owner'), desc: t('roleOwnerDesc') },
    { id: 'manager', name: t('manager'), desc: t('roleManagerDesc') },
    { id: 'agent', name: t('agent'), desc: t('roleAgentDesc') },
    { id: 'support', name: t('support'), desc: t('roleSupportDesc') },
    { id: 'accountant', name: t('accountant'), desc: t('roleAccountantDesc') },
    { id: 'viewer', name: t('viewer'), desc: t('roleViewerDesc') },
  ];

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(newUser)
    });

    if (res.ok) {
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'agent', permissions: DEFAULT_PERMISSIONS });
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || t('failedToAddUser'));
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(editingUser)
    });

    if (res.ok) {
      setEditingUser(null);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || t('failedToUpdateUser'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(t('removeUserConfirm'))) return;
    
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      fetchUsers();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t('usersAndRoles')}</h2>
          <p className="text-slate-500">{t('manageTeamDesc')}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={20} />
          {t('addTeamMember')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">{t('loadingUsers')}</div>
          ) : (
            users.map((user) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{user.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail size={14} />
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider">
                      {t(user.role as any)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{t('addedOn')} {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingUser(user)}
                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <ShieldCheck size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Roles Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">{t('roleDefinitions')}</h3>
          {ROLES.map((role) => (
            <div key={role.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Shield size={16} />
                </div>
                <h4 className="font-bold text-slate-900">{role.name}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddModal || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  {showAddModal ? <UserPlus size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{showAddModal ? t('addTeamMember') : t('editPermissions')}</h3>
                  <p className="text-sm text-slate-500">{t('manageTeamDesc')}</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 text-sm font-bold">
                  <ShieldAlert size={18} />
                  {error}
                </div>
              )}

              <form onSubmit={showAddModal ? handleAddUser : handleUpdateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullName')}</label>
                      <input 
                        required
                        type="text"
                        value={showAddModal ? newUser.name : editingUser.name}
                        onChange={(e) => showAddModal ? setNewUser({...newUser, name: e.target.value}) : setEditingUser({...editingUser, name: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('email')}</label>
                      <input 
                        required
                        type="email"
                        value={showAddModal ? newUser.email : editingUser.email}
                        onChange={(e) => showAddModal ? setNewUser({...newUser, email: e.target.value}) : setEditingUser({...editingUser, email: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900"
                        placeholder="john@gmail.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                      <input 
                        required={showAddModal}
                        type="password"
                        value={showAddModal ? newUser.password : (editingUser.password || '')}
                        onChange={(e) => showAddModal ? setNewUser({...newUser, password: e.target.value}) : setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900"
                        placeholder={showAddModal ? "••••••••" : t('leaveBlankToKeep')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('role')}</label>
                      <select 
                        value={showAddModal ? newUser.role : editingUser.role}
                        onChange={(e) => showAddModal ? setNewUser({...newUser, role: e.target.value}) : setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900 appearance-none"
                      >
                        {ROLES.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('moduleAccess')}</label>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {MODULES.map(mod => {
                        const permissions = showAddModal ? newUser.permissions : (editingUser.permissions || DEFAULT_PERMISSIONS);
                        const modPerms = permissions[mod.id] || { view: false, add: false, edit: false, delete: false };
                        
                        const togglePerm = (key: string) => {
                          const updated = { ...permissions, [mod.id]: { ...modPerms, [key]: !modPerms[key] } };
                          if (showAddModal) setNewUser({ ...newUser, permissions: updated });
                          else setEditingUser({ ...editingUser, permissions: updated });
                        };

                        return (
                          <div key={mod.id} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{mod.name}</span>
                              <input 
                                type="checkbox"
                                checked={modPerms.view}
                                onChange={() => togglePerm('view')}
                                className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-600 bg-transparent"
                              />
                            </div>
                            {modPerms.view && (
                              <div className="flex gap-4 pt-2 border-t border-slate-200/50">
                                {['add', 'edit', 'delete'].map(action => (
                                  <label key={action} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={modPerms[action]}
                                      onChange={() => togglePerm(action)}
                                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 bg-transparent"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t(action as any)}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
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
