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
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs animate-pulse">Syncing System Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-foreground">
          System Overview
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Real-time status of lab infrastructure and researcher activity.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-primary' },
          { label: 'Active Today', value: stats?.activeUsersToday, icon: Activity, color: 'text-primary' },
          { label: 'Total Files', value: stats?.totalFiles, icon: Files, color: 'text-primary' },
          { label: 'AI Requests', value: stats?.aiRequestsToday, icon: Zap, color: 'text-primary' },
          { label: 'Storage Used', value: formatStorage(stats?.storageUsed || 0), icon: HardDrive, color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 hover-glow group transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg app-surface-overlay ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-2xl font-black text-foreground tracking-tight">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Graph (Simple CSS Implementation) */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Activity Metrics (7 Days)
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-primary rounded-full"></div> Uploads</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-muted-foreground rounded-full"></div> AI Usage</div>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-end justify-between gap-2 px-2 pb-8 border-b border-border relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-full h-px bg-border"></div>)}
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
                      className="w-3 bg-primary/80 rounded-t-sm group-hover:bg-primary transition-all shadow-accent-glow"
                    ></div>
                    <div 
                      style={{ height: `${Math.max(aiHeight, 5)}%` }} 
                      className="w-3 bg-muted rounded-t-sm group-hover:bg-muted-foreground transition-all"
                    ></div>
                  </div>
                  <span className="absolute -bottom-6 text-[9px] font-bold text-muted-foreground group-hover:text-foreground uppercase">{day.date}</span>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity app-surface border border-border p-2 rounded-lg text-[8px] z-10 pointer-events-none whitespace-nowrap shadow-2xl">
                    <div className="text-primary">Uploads: {day.uploads}</div>
                    <div className="text-muted-foreground">AI: {day.aiUsage}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 app-surface rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-accent-glow"></div>
                <span className="text-xs font-medium text-foreground">Core Services</span>
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Nominal</span>
            </div>
            
            <div className="flex items-center justify-between p-3 app-surface rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-accent-glow"></div>
                <span className="text-xs font-medium text-foreground">Intelligence Engine</span>
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 app-surface rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-accent-glow"></div>
                <span className="text-xs font-medium text-foreground">Database Nodes</span>
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Healthy</span>
            </div>

            <div className="p-4 app-surface border border-border rounded-xl flex gap-3 items-start mt-6">
               <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
               <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Storage Advisory</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Storage utilization is at 82%. Consider optimizing large intelligence assets.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel border-border overflow-hidden">
        <div className="p-4 border-b border-border app-table-header flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2 px-2">
            <Clock size={16} className="text-muted-foreground" />
            Live Activity Feed
          </h3>
          <button onClick={() => window.location.reload()} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors px-2">
            Refresh Stream
          </button>
        </div>
        
        <div className="divide-y divide-border">
          {activities.length > 0 ? activities.map((item, i) => (
            <div key={i} className="p-4 flex items-center justify-between app-table-row group">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border transition-colors ${
                  item.type === 'file' ? 'bg-primary/5 text-primary' : 
                  item.type === 'ai' ? 'bg-primary/10 text-primary' : 
                  'bg-primary/5 text-muted-foreground'
                }`}>
                  {item.type === 'file' ? <Files size={14} /> : item.type === 'ai' ? <Zap size={14} /> : <Activity size={14} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{item.user}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{item.action}</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14} className="text-muted-foreground" />
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-muted-foreground text-xs italic">
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
