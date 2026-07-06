import React from 'react';
import { 
  Zap, 
  Clock, 
  FileText, 
  MessageSquare, 
  ArrowUpRight, 
  Activity,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UserDashboardProps {
  userProfile: any;
  stats: {
    totalRecords: number;
    recentActivity: number;
    aiInteractions: number;
    storageUsed: string;
  };
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userProfile, stats }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">№ 01 — Overview</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground">
            Researcher Overview
          </h2>
          <div className="ink-rule mt-4 mb-3" />
          <p className="text-muted-foreground text-sm">Welcome back, {userProfile?.name}. System status: <span className="text-foreground">Operational.</span></p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/25 rounded-full">
           <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
           <span className="font-mono text-[10px] text-primary uppercase tracking-widest">Protocol Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Archives', value: stats.totalRecords, icon: Database, color: 'text-foreground' },
          { label: 'Neural Queries', value: stats.aiInteractions, icon: Zap, color: 'text-primary' },
          { label: 'Active Sequences', value: stats.recentActivity, icon: Activity, color: 'text-foreground' },
          { label: 'Data Allocation', value: stats.storageUsed, icon: Clock, color: 'text-muted-foreground' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 border-border hover:border-muted-foreground/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
               <stat.icon size={80} />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-2 rounded-lg bg-muted border border-border ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground" />
            </div>
            <div className="mt-4 relative z-10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-display font-medium text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 border-border flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
           <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <Activity size={32} />
           </div>
           <div>
              <h3 className="text-sm font-bold text-foreground">No active experiments selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Select a category from 'My Records' to begin sequencing and AI analysis.</p>
           </div>
        </div>

        <div className="glass-panel p-6 border-border space-y-6">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Quick Protocols</h3>
           <div className="space-y-3">
              <button className="w-full p-4 rounded-xl bg-muted border border-border flex items-center gap-3 hover:bg-muted/80 transition-all group">
                 <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText size={16} />
                 </div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors text-left">New OCR Record</span>
              </button>
              <button className="w-full p-4 rounded-xl bg-muted border border-border flex items-center gap-3 hover:bg-muted/80 transition-all group">
                 <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Zap size={16} />
                 </div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors text-left">AI Synthesis</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
