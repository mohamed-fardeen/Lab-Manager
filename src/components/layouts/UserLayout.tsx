import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Database, 
  PenLine, 
  MessageSquare, 
  Clock, 
  Settings, 
  Shield, 
  Zap, 
  LogOut, 
  Menu, 
  ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";

interface UserLayoutProps {
  userProfile: any;
  onLogout: () => void;
  selectedFolder?: string | null;
  folders: any[];
  onBackToParent?: () => void;
}

const UserLayout: React.FC<UserLayoutProps> = ({ 
  userProfile, 
  onLogout, 
  selectedFolder, 
  folders, 
  onBackToParent 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navigation = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/my-records', label: 'My Records', icon: Database },
    { to: '/editor', label: 'Editor', icon: PenLine },
    { to: '/collaboration', label: 'Collaboration', icon: MessageSquare },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/settings', label: 'Settings', icon: Settings }
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
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-slate-950" />
          </div>
          <h2 className="text-lg font-bold tracking-tighter uppercase italic">Lab-Sync</h2>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {navigation.map((link) => (
            <NavLink 
              key={link.to} 
              to={link.to} 
              onClick={() => setIsSidebarOpen(false)} 
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative
                ${isActive ? 'bg-electric-blue/10 text-electric-blue' : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 w-1 h-5 bg-electric-blue rounded-r-full" />}
                  <link.icon size={18} />
                  <span className="text-sm font-bold">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <div className="glass-panel p-3 rounded-xl border-slate-800 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-bold">
                {userProfile?.name?.charAt(0).toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-[11px] font-bold text-white truncate">{userProfile?.name || 'Researcher'}</p>
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
            {selectedFolder && (
              <Button variant="outline" size="sm" onClick={onBackToParent} className="rounded-full border-slate-800 h-8 px-3 text-xs">
                <ArrowLeft size={14} className="mr-1.5" /> Back
              </Button>
            )}
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">
               Laboratory Intelligence Interface
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

export default UserLayout;
