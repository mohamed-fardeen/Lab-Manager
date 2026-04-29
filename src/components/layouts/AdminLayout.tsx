import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Database, 
  Clock, 
  BarChart3, 
  Activity as ActivityIcon, 
  Layers, 
  MessageSquare, 
  Settings, 
  Zap, 
  LogOut, 
  Menu 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

interface AdminLayoutProps {
  userProfile: any;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ userProfile, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { group: 'Top', items: [{ to: '/admin', label: 'Dashboard', icon: Home }] },
    { group: 'Management', items: [
      { to: '/admin/users', label: 'User Management', icon: Users },
      { to: '/admin/data', label: 'Data Manager', icon: Database },
    ]},
    { group: 'Monitoring', items: [
      { to: '/admin/activity', label: 'Activity', icon: Clock },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/ai-monitor', label: 'AI Monitor', icon: ActivityIcon },
      { to: '/admin/storage', label: 'Storage Manager', icon: Layers },
    ]},
    { group: 'Communication', items: [
      { to: '/admin/broadcast', label: 'Broadcast', icon: MessageSquare },
    ]},
    { group: 'System', items: [
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ]}
  ];

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-electric-blue/30 relative">
      {/* Sidebar Backdrop (Mobile Only) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 w-[240px] flex flex-col bg-slate-950 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-electric-blue flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <h2 className="text-lg font-bold tracking-tighter uppercase italic">Admin Panel</h2>
        </div>

        <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto scrollbar-hide">
          {navigation.map((section) => (
            <div key={section.group} className="space-y-1">
              {section.group !== 'Top' && (
                <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{section.group}</h3>
              )}
              {section.items.map((link) => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  end={link.to === '/admin'}
                  onClick={() => setIsSidebarOpen(false)} 
                  className={({ isActive }) => `
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative group
                    ${isActive ? 'bg-electric-blue/10 text-electric-blue' : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900/50'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.div layoutId="activeTabAdmin" className="absolute left-0 w-1 h-5 bg-electric-blue rounded-r-full" />}
                      <link.icon size={18} className={`${isActive ? 'text-electric-blue' : 'text-slate-500 group-hover:text-slate-100'} transition-colors`} />
                      <span className="text-sm font-bold">{link.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <div className="glass-panel p-3 rounded-xl border-slate-800 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-bold">
                {userProfile?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-[11px] font-bold text-white truncate">{userProfile?.name || 'Administrator'}</p>
              <p className="text-[8px] text-electric-blue font-black uppercase tracking-widest">System Master</p>
            </div>
            <button onClick={onLogout} className="text-slate-600 hover:text-red-400 p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-900/40 relative overflow-hidden">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-electric-blue italic">
               Command Center v2.0
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
