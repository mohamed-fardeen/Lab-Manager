import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Files, 
  Zap, 
  HardDrive, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers: number;
  activeUsersToday: number;
  totalFiles: number;
  aiRequestsToday: number;
  storageUsed: number;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'file' | 'message' | 'ai';
}

interface UsageData {
  date: string;
  uploads: number;
  aiUsage: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, activityRes, usageRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/activity'),
          api.get('/admin/usage')
        ]);

        setStats(statsRes.stats);
        setActivities(activityRes.activities);
        setUsage(usageRes.usage);
      } catch (error) {
        console.error('Failed to fetch dashboard intelligence:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // 1. Subscribe to new files
    const fileSubscription = supabase
      .channel('admin-files')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // 2. Subscribe to new messages
    const messageSubscription = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    // 3. Periodic Polling (every 30 seconds for background stats)
    const pollInterval = setInterval(fetchDashboardData, 30000);

    return () => {
      supabase.removeChannel(fileSubscription);
      supabase.removeChannel(messageSubscription);
      clearInterval(pollInterval);
    };
  }, []);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-electric-blue/20 border-t-electric-blue rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing System Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
          System Overview
        </h2>
        <p className="text-slate-500 text-sm mt-1">Real-time status of lab infrastructure and researcher activity.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Active Today', value: stats?.activeUsersToday, icon: Activity, color: 'text-emerald-400' },
          { label: 'Total Files', value: stats?.totalFiles, icon: Files, color: 'text-purple-400' },
          { label: 'AI Requests', value: stats?.aiRequestsToday, icon: Zap, color: 'text-amber-400' },
          { label: 'Storage Used', value: formatStorage(stats?.storageUsed || 0), icon: HardDrive, color: 'text-rose-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 border-slate-800 hover-glow group transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-slate-900/50 ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Graph (Simple CSS Implementation) */}
        <div className="lg:col-span-2 glass-panel p-6 border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-electric-blue" />
              Activity Metrics (7 Days)
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-electric-blue rounded-full"></div> Uploads</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> AI Usage</div>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-end justify-between gap-2 px-2 pb-8 border-b border-slate-800/50 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-full h-px bg-white"></div>)}
            </div>
            
            {usage.map((day, i) => {
              const maxVal = Math.max(...usage.map(d => Math.max(d.uploads, d.aiUsage)), 1);
              const uploadHeight = (day.uploads / maxVal) * 100;
              const aiHeight = (day.aiUsage / maxVal) * 100;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex items-end justify-center gap-1 h-full min-h-[4px]">
                    <div 
                      style={{ height: `${Math.max(uploadHeight, 5)}%` }} 
                      className="w-3 bg-electric-blue/80 rounded-t-sm group-hover:bg-electric-blue transition-all"
                    ></div>
                    <div 
                      style={{ height: `${Math.max(aiHeight, 5)}%` }} 
                      className="w-3 bg-amber-500/80 rounded-t-sm group-hover:bg-amber-500 transition-all"
                    ></div>
                  </div>
                  <span className="absolute -bottom-6 text-[9px] font-bold text-slate-500 group-hover:text-slate-300 uppercase">{day.date}</span>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-800 p-2 rounded-lg text-[8px] z-10 pointer-events-none whitespace-nowrap shadow-2xl">
                    <div className="text-electric-blue">Uploads: {day.uploads}</div>
                    <div className="text-amber-500">AI: {day.aiUsage}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="glass-panel p-6 border-slate-800 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                <span className="text-xs font-medium text-slate-300">Core Services</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Nominal</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                <span className="text-xs font-medium text-slate-300">Intelligence Engine</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                <span className="text-xs font-medium text-slate-300">Database Nodes</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Healthy</span>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 items-start mt-6">
               <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
               <div>
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Storage Advisory</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Storage utilization is at 82%. Consider optimizing large intelligence assets.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2 px-2">
            <Clock size={16} className="text-slate-400" />
            Live Activity Feed
          </h3>
          <button onClick={() => window.location.reload()} className="text-[10px] font-bold uppercase tracking-widest text-electric-blue hover:text-white transition-colors px-2">
            Refresh Stream
          </button>
        </div>
        
        <div className="divide-y divide-slate-800/50">
          {activities.length > 0 ? activities.map((item, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-900/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800 transition-colors ${
                  item.type === 'file' ? 'bg-blue-500/5 text-blue-400' : 
                  item.type === 'ai' ? 'bg-amber-500/5 text-amber-400' : 
                  'bg-purple-500/5 text-purple-400'
                }`}>
                  {item.type === 'file' ? <Files size={14} /> : item.type === 'ai' ? <Zap size={14} /> : <Activity size={14} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.user}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.action}</span>
                  </div>
                  <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14} className="text-slate-700" />
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-600 text-xs italic">
              No recent activity detected in the system sequencing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ArrowRight = ({ size, className }: { size: number; className?: string }) => (
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
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default AdminDashboard;
