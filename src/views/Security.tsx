import React, { useState, useEffect } from 'react';
import { Shield, History, User, Search, Filter, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function Security() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/audit-logs', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Security & Audit</h2>
          <p className="text-slate-500">Track all system activities and security events.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={18} />
            System Secure
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-slate-900 shadow-sm"
          />
        </div>
        <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <Filter size={20} />
          Filters
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="text-left px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">USER</th>
              <th className="text-left px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">ACTION</th>
              <th className="text-left px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">ENTITY</th>
              <th className="text-left px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">DETAILS</th>
              <th className="text-right px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">TIME</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400">Loading audit logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400">No logs found</td></tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                        <User size={16} />
                      </div>
                      <span className="font-bold text-slate-900">{log.user_name || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      log.action === 'create' ? 'bg-emerald-50 text-emerald-600' :
                      log.action === 'delete' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-600 capitalize">{log.entity_type}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-slate-500 max-w-xs truncate font-medium">{log.details}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-xs text-slate-400 font-bold">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
