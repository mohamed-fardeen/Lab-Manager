import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Eye, 
  UserPlus, 
  UserMinus,
  Clock,
  BookOpen,
  FileText,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ManagedUser {
  id: string;
  name: string;
  rrn: string;
  role: 'admin' | 'student';
  status: 'active' | 'blocked';
  fileCount: number;
  created_at: string;
  last_active?: string;
}

interface UserDetails extends ManagedUser {
  recentFiles: any[];
  subjects: any[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.users);
    } catch (error) {
      console.error('Failed to fetch user database:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const res = await api.get(`/admin/user/${userId}`);
      setSelectedUserDetails(res.details);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Failed to fetch user intelligence:', error);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const confirmMsg = `Are you sure you want to ${newStatus === 'blocked' ? 'RESTRICT' : 'RESTORE'} access for ${user.name}?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        await api.post('/admin/user/status', { id: user.id, status: newStatus });
        setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      } catch (error) {
        alert('Protocol update failed.');
      }
    }
  };

  const handleToggleRole = async (user: ManagedUser) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    const confirmMsg = `Promote ${user.name} to ADMINISTRATIVE clearance level?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        await api.post('/admin/user/role', { id: user.id, role: newRole });
        setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      } catch (error) {
        alert('Clearance update failed.');
      }
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (window.confirm(`CRITICAL: Purge all intelligence records for ${user.name}? This action is irreversible.`)) {
      try {
        await api.delete(`/admin/user/${user.id}`);
        setUsers(users.filter(u => u.id !== user.id));
      } catch (error) {
        alert('Purge protocol failed.');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.rrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            User Management
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage researcher access protocols and system permissions.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 border-slate-800 flex items-center gap-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Nodes</div>
                <div className="text-lg font-black text-electric-blue">{users.length}</div>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 border-slate-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-blue transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by Name or RRN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-electric-blue/50 transition-all text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="student">Students</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <Button variant="outline" onClick={fetchUsers} className="border-slate-800 rounded-xl h-10 px-4">
            <Clock size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/30">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Researcher</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Clearance</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Intelligence</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Sync</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-electric-blue/20 border-t-electric-blue rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accessing Vault...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={user.id} 
                  className="hover:bg-slate-900/20 transition-all group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-electric-blue font-black text-sm group-hover:border-electric-blue/50 transition-all">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{user.rrn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${user.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm font-black text-white">{user.fileCount}</div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase">Assets</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] text-slate-400 font-medium">{new Date(user.created_at).toLocaleDateString()}</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase">Joined</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => fetchUserDetails(user.id)}
                        className="p-2 text-slate-500 hover:text-electric-blue hover:bg-electric-blue/10 rounded-lg transition-all"
                        title="View Intelligence"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-lg transition-all ${user.status === 'active' ? 'text-slate-500 hover:text-rose-500 hover:bg-rose-500/10' : 'text-rose-500 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                        title={user.status === 'active' ? 'Restrict Access' : 'Restore Access'}
                      >
                        {user.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                      </button>
                      <button 
                         onClick={() => handleToggleRole(user)}
                         className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                         title={user.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                      >
                        {user.role === 'admin' ? <UserMinus size={16} /> : <UserPlus size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-600/10 rounded-lg transition-all"
                        title="Purge Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-600 text-xs italic">
                    No researcher protocols match the current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Slide-over / Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedUserDetails && (
          <div className="fixed inset-0 z-[200] flex items-center justify-end p-4 md:p-8 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center text-electric-blue border border-electric-blue/20">
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Researcher Intelligence</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Protocol ID: {selectedUserDetails.id.slice(0, 8)}...</p>
                    </div>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-4 border-slate-800">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Name</div>
                        <div className="text-sm font-bold text-white">{selectedUserDetails.name}</div>
                    </div>
                    <div className="glass-panel p-4 border-slate-800">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Clearance</div>
                        <div className="text-sm font-bold text-amber-500 uppercase">{selectedUserDetails.role}</div>
                    </div>
                    <div className="glass-panel p-4 border-slate-800">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Identity (RRN)</div>
                        <div className="text-sm font-bold text-white">{selectedUserDetails.rrn}</div>
                    </div>
                    <div className="glass-panel p-4 border-slate-800">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Assets</div>
                        <div className="text-sm font-bold text-electric-blue">{selectedUserDetails.fileCount} Records</div>
                    </div>
                </div>

                {/* Subjects / Categories */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <BookOpen size={14} className="text-electric-blue" />
                        Knowledge Domains
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedUserDetails.subjects.length > 0 ? selectedUserDetails.subjects.map((sub, i) => (
                            <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                                {sub.name}
                            </div>
                        )) : (
                            <div className="text-xs text-slate-600 italic">No domain specializations indexed.</div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity size={14} className="text-purple-500" />
                        Recent Synchronization
                    </h4>
                    <div className="space-y-3">
                        {selectedUserDetails.recentFiles.length > 0 ? selectedUserDetails.recentFiles.map((file, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between group hover:border-electric-blue/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <FileText size={16} className="text-slate-500 group-hover:text-electric-blue transition-colors" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">{file.name}</div>
                                        <div className="text-[9px] text-slate-600 font-medium">{new Date(file.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-700" />
                            </div>
                        )) : (
                            <div className="text-xs text-slate-600 italic py-4">No recent intelligence synchronization recorded.</div>
                        )}
                    </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-800 bg-slate-900/30 grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    onClick={() => handleToggleStatus(selectedUserDetails)}
                    className={`rounded-xl h-12 font-bold uppercase tracking-widest text-[10px] border-slate-800 ${selectedUserDetails.status === 'active' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                >
                    {selectedUserDetails.status === 'active' ? 'Restrict Node' : 'Restore Node'}
                </Button>
                <Button 
                    variant="outline"
                    onClick={() => handleDeleteUser(selectedUserDetails)}
                    className="rounded-xl h-12 font-bold uppercase tracking-widest text-[10px] border-slate-800 hover:bg-rose-600 hover:text-white"
                >
                    Purge All Data
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Activity = ({ size, className }: { size: number; className?: string }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );

export default UserManagement;
