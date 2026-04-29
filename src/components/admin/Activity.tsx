import React, { useState, useEffect } from 'react';
import { 
  Activity as ActivityIcon, 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Clock, 
  User, 
  BookOpen,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityEntry {
  id: string;
  user: string;
  rrn: string;
  action: string;
  file: string | null;
  subject: string;
  timestamp: string;
  type: 'file' | 'message' | 'ai' | 'delete';
}

const Activity = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterUser, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activityRes, usersRes] = await Promise.all([
        api.get(`/admin/activity?user=${filterUser}&type=${filterType}`),
        api.get('/admin/users')
      ]);
      setActivities(activityRes.activities);
      setUsers(usersRes.users.map((u: any) => ({ id: u.id, name: u.name })));
    } catch (error) {
      console.error('Failed to sync activity stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupActivities = (data: ActivityEntry[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: ActivityEntry[] } = {
      'Today': [],
      'Yesterday': [],
      'Older': []
    };

    data.forEach(activity => {
      const date = new Date(activity.timestamp);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        groups['Today'].push(activity);
      } else if (date.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(activity);
      } else {
        groups['Older'].push(activity);
      }
    });

    return groups;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Upload')) return <Upload size={16} className="text-electric-blue" />;
    if (action.includes('record')) return <FileText size={16} className="text-emerald-400" />;
    if (action.includes('broadcast')) return <MessageSquare size={16} className="text-purple-400" />;
    if (action.includes('Delete')) return <Trash2 size={16} className="text-rose-500" />;
    return <ActivityIcon size={16} className="text-slate-400" />;
  };

  const filteredData = activities.filter(a => 
    a.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.file && a.file.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedData = groupActivities(filteredData);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            System Activity
          </h2>
          <p className="text-slate-500 text-sm mt-1">Real-time surveillance of laboratory protocols and intelligence flow.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 border-slate-800 flex items-center gap-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Events Logged</div>
                <div className="text-lg font-black text-electric-blue">{activities.length}</div>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 border-slate-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-blue transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by Researcher or File..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-electric-blue/50 transition-all text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
          >
            <option value="all">All Researchers</option>
            {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
          >
            <option value="all">All Actions</option>
            <option value="file">Files/Records</option>
            <option value="message">Broadcasts</option>
          </select>
          <Button variant="outline" onClick={fetchData} className="border-slate-800 rounded-xl h-10 px-4">
            <Clock size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-12 pb-12">
        {Object.entries(groupedData).map(([group, items]) => items.length > 0 && (
          <div key={group} className="space-y-6">
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{group}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((activity, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={activity.id} 
                    className="glass-panel p-4 border-slate-800/50 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-electric-blue/30 transition-all">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-electric-blue transition-colors">{activity.user}</span>
                            <span className="text-[10px] text-slate-500 font-medium">({activity.rrn})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-medium text-slate-500">{activity.action}</span>
                            {activity.file && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-electric-blue text-[10px] font-bold">
                                    {activity.file}
                                </span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 pl-14 md:pl-0">
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                <BookOpen size={12} className="text-slate-700" />
                                {activity.subject}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">{activity.type === 'file' ? 'Storage Node' : 'Network Stream'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-white">
                                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium">{new Date(activity.timestamp).toLocaleDateString()}</div>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {loading && activities.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-2 border-electric-blue/10 border-t-electric-blue rounded-full animate-spin mx-auto"></div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Decoding Stream...</p>
          </div>
        )}

        {!loading && filteredData.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <ActivityIcon size={48} className="text-slate-800 mx-auto" />
            <p className="text-slate-500 text-sm italic">No laboratory activity detected matching current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;
