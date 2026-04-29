import React from 'react';
import { 
  Shield, 
  Users, 
  Database, 
  Activity, 
  TrendingUp, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            Command Center
          </h2>
          <p className="text-slate-500 text-sm mt-1">Global system surveillance and infrastructure oversight.</p>
        </div>
        <div className="px-4 py-2 bg-electric-blue/10 border border-electric-blue/20 rounded-xl">
           <span className="text-[10px] font-black text-electric-blue uppercase tracking-widest">v2.4.0 High-Level Access</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'User Registry', to: '/admin/users', icon: Users, color: 'text-blue-500', desc: 'Manage researcher credentials and access levels.' },
          { label: 'Data Surveillance', to: '/admin/data', icon: Database, color: 'text-emerald-500', desc: 'Audit system-wide files and category hierarchies.' },
          { label: 'Intelligence Feed', to: '/admin/activity', icon: Activity, color: 'text-purple-500', desc: 'Real-time monitoring of researcher interactions.' },
          { label: 'Global Analytics', to: '/admin/analytics', icon: TrendingUp, color: 'text-amber-500', desc: 'High-level usage metrics and trend analysis.' },
          { label: 'Neural Monitor', to: '/admin/ai-monitor', icon: Shield, color: 'text-rose-500', desc: 'Monitor and control AI inference and costs.' },
          { label: 'Infrastructure', to: '/admin/storage', icon: Layers, color: 'text-slate-400', desc: 'Track storage utilization and asset distribution.' },
        ].map((card, i) => (
          <NavLink key={i} to={card.to} className="glass-panel p-6 border-slate-800 hover:border-electric-blue/50 transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${card.color} group-hover:scale-110 transition-transform`}>
                   <card.icon size={24} />
                </div>
                <ArrowRight size={18} className="text-slate-700 group-hover:text-electric-blue transition-colors" />
             </div>
             <h3 className="text-lg font-bold text-white group-hover:text-electric-blue transition-colors">{card.label}</h3>
             <p className="text-xs text-slate-500 mt-2 leading-relaxed">{card.desc}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
