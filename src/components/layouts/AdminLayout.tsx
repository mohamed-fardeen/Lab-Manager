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
  FolderTree,
  Settings,
  Terminal,
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
    { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: Home, code: 'A1' }] },
    {
      group: 'Management', items: [
        { to: '/admin/users', label: 'Users', icon: Users, code: 'B1' },
        { to: '/admin/data', label: 'Data Manager', icon: Database, code: 'B2' },
        { to: '/admin/structure', label: 'Common Structure', icon: FolderTree, code: 'B3' }
      ]
    },
    {
      group: 'Monitoring', items: [
        { to: '/admin/activity', label: 'Activity', icon: Clock, code: 'C1' },
        { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, code: 'C2' },
        { to: '/admin/ai-monitor', label: 'AI Monitor', icon: ActivityIcon, code: 'C3' },
        { to: '/admin/storage', label: 'Storage', icon: Layers, code: 'C4' }
      ]
    },
    {
      group: 'Communication', items: [
        { to: '/admin/broadcast', label: 'Broadcast', icon: MessageSquare, code: 'D1' }
      ]
    },
    {
      group: 'System', items: [
        { to: '/admin/settings', label: 'Settings', icon: Settings, code: 'E1' }
      ]
    }
  ];

  return (
    <div className="h-screen w-full app-bg flex overflow-hidden font-sans relative">
      {/* Sidebar Backdrop (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-[252px] flex flex-col bg-surface border-r border-border z-50 transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        {/* Brand */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-9 h-9 rounded-md border border-border bg-surface-raised flex items-center justify-center">
            <Terminal size={16} className="text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-rule">№ Adm.</span>
            <h2 className="text-base font-display font-semibold tracking-tight text-foreground">Lab-Sync</h2>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto custom-scrollbar">
          <div className="px-3 mb-3">
            <span className="eyebrow">Control Room</span>
          </div>
          {navigation.map((section) => (
            <div key={section.group} className="mb-6">
              {section.group !== 'Overview' && (
                <h3 className="px-3 mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {section.group}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/admin'}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) => `
                      relative flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 group
                      ${isActive
                        ? 'bg-primary/8 text-primary'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-overlay/60'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="adminActiveIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-r-full"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                        <link.icon
                          size={16}
                          strokeWidth={isActive ? 2.2 : 1.6}
                          className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                        />
                        <span className={`text-sm tracking-tight ${isActive ? 'font-medium' : ''}`}>{link.label}</span>
                        <span className="ml-auto font-mono text-[9px] text-muted-foreground/50">{link.code}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin card */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-surface-raised text-foreground-muted text-xs font-display font-medium">
                {userProfile?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-xs font-medium text-foreground truncate">{userProfile?.name || 'Administrator'}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-rule">System master</p>
            </div>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 app-topbar shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground md:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rule">Operational Log</span>
              <span className="h-3 w-px bg-border" />
              <h1 className="text-sm font-display tracking-tight text-foreground">
                Command Center
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-widest">All systems nominal</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;