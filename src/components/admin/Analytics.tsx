import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  PieChart, 
  Users, 
  BookOpen, 
  Zap, 
  Clock,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "../ui/button";

interface AnalyticsData {
  success: boolean;
  insights: {
    topSubject: string;
    topUser: string;
    topAIAction: string;
    peakTime: string;
  };
  distribution: { name: string, value: number }[];
  trends: { date: string, uploads: number }[];
  topUsers: { name: string, files: number, ai: number }[];
}

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics');
      if (res && res.success) {
        setData(res);
      }
    } catch (error) {
      console.error('Failed to sync analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-electric-blue/10 border-t-electric-blue rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Analyzing Laboratory Intelligence...</p>
        </div>
      </div>
    );
  }

  const totalFiles = data.distribution.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
          System Analytics
        </h2>
        <p className="text-slate-500 text-sm mt-1">Real-time usage distribution and performance metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Primary Subject', value: data.insights.topSubject, icon: BookOpen, color: 'text-electric-blue' },
          { label: 'Elite Researcher', value: data.insights.topUser, icon: Users, color: 'text-purple-500' },
          { label: 'Dominant AI Protocol', value: data.insights.topAIAction, icon: Zap, color: 'text-amber-500' },
          { label: 'Peak Frequency', value: data.insights.peakTime, icon: Clock, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 border-slate-800 hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-slate-700 group-hover:text-slate-400" />
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-white truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <div className="lg:col-span-2 glass-panel p-8 border-slate-800 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
              <TrendingUp size={16} className="text-electric-blue" />
              Upload Velocity (30D)
            </h3>
            <div className="flex gap-2">
               <div className="h-2 w-2 rounded-full bg-electric-blue"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase">Records Generated</span>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-end gap-1 px-2">
            {data.trends.map((t, i) => {
              const maxVal = Math.max(...data.trends.map(v => v.uploads), 1);
              const height = (t.uploads / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                   <div 
                     className="w-full bg-electric-blue/20 group-hover:bg-electric-blue rounded-t-sm transition-all duration-500"
                     style={{ height: `${height}%` }}
                   >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {t.uploads} Files • {t.date}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest pt-4 border-t border-slate-800/50">
             <span>{data.trends[0]?.date}</span>
             <span>Intelligence Timeline</span>
             <span>{data.trends[data.trends.length-1]?.date}</span>
          </div>
        </div>

        {/* Distribution */}
        <div className="glass-panel p-8 border-slate-800 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
            <PieChart size={16} className="text-purple-500" />
            Asset Distribution
          </h3>
          
          <div className="space-y-6">
             {data.distribution.map((item, i) => {
               const percentage = totalFiles > 0 ? Math.round((item.value / totalFiles) * 100) : 0;
               const colors = ['bg-electric-blue', 'bg-purple-500', 'bg-emerald-500'];
               return (
                <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">{item.name}</span>
                        <span className="text-white">{percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${colors[i % colors.length]} rounded-full`}
                        ></motion.div>
                    </div>
                </div>
               );
             })}
          </div>

          <div className="pt-6 border-t border-slate-800/50">
             <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Activity size={16} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Intelligence</span>
                      <span className="text-lg font-bold text-white">{totalFiles} Files</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Top Researchers Table */}
      <div className="glass-panel border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
            <Users size={16} className="text-amber-500" />
            Elite Researcher Rankings
          </h3>
          <Button variant="ghost" className="h-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white">
            Full Leaderboard <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Researcher</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500 text-center">Asset Count</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500 text-center">AI Interaction</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500 text-right">Contribution Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.topUsers.map((user, i) => (
              <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 group-hover:text-electric-blue transition-colors">
                      {i + 1}
                    </div>
                    <span className="font-bold text-slate-200">{user.name}</span>
                  </div>
                </td>
                <td className="p-4 text-center font-bold text-slate-400">{user.files}</td>
                <td className="p-4 text-center font-bold text-slate-400">{user.ai}</td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center px-2 py-1 rounded bg-electric-blue/10 border border-electric-blue/20 text-electric-blue text-[10px] font-black uppercase">
                    +{Math.round(user.files * 12.5 + user.ai * 5)} Pts
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;
