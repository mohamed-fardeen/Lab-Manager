import React from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Key, 
  Bell, 
  Database,
  RefreshCcw,
  LogOut
} from 'lucide-react';
import { Button } from "../../components/ui/button";

interface UserSettingsProps {
  userProfile: any;
  currentPass: string;
  setCurrentPass: (val: string) => void;
  newPass: string;
  setNewPass: (val: string) => void;
  handleUpdatePassword: () => void;
  onLogout: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userProfile,
  currentPass,
  setCurrentPass,
  newPass,
  setNewPass,
  handleUpdatePassword,
  onLogout
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
          Researcher Settings
        </h2>
        <p className="text-slate-500 text-sm mt-1">Configure your laboratory credentials and profile data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-1">
           {[
             { label: 'Profile Intelligence', icon: User, active: true },
             { label: 'Security Protocols', icon: Shield, active: false },
             { label: 'Notifications', icon: Bell, active: false },
             { label: 'Data Allocation', icon: Database, active: false },
           ].map((item, i) => (
             <button key={i} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${item.active ? 'bg-electric-blue/10 text-electric-blue border border-electric-blue/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>
                <item.icon size={16} />
                {item.label}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
           {/* Profile Card */}
           <div className="glass-panel p-6 border-slate-800 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Identity Matrix</h3>
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl font-black text-electric-blue">
                    {userProfile?.name?.charAt(0).toUpperCase()}
                 </div>
                 <div className="space-y-1">
                    <p className="text-xl font-bold text-white">{userProfile?.name}</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol ID: {userProfile?.rrn}</p>
                 </div>
              </div>
           </div>

           {/* Password Change */}
           <div className="glass-panel p-6 border-slate-800 space-y-6">
              <div className="flex items-center gap-2 text-white">
                 <Key size={18} className="text-electric-blue" />
                 <h3 className="text-sm font-bold">Credential Update</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Current Protocol</label>
                    <input 
                      type="password" 
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">New Protocol</label>
                    <input 
                      type="password" 
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none" 
                    />
                 </div>
                 <Button onClick={handleUpdatePassword} className="bg-electric-blue text-white w-full h-12 font-black uppercase tracking-widest text-[10px] shadow-blue-glow">
                    Update Connection Protocol
                 </Button>
              </div>
           </div>

           {/* Logout Section */}
           <div className="glass-panel p-6 border-red-500/20 bg-red-500/5 space-y-4">
              <div>
                 <h3 className="text-sm font-bold text-red-500">Terminate Session</h3>
                 <p className="text-xs text-slate-500 mt-1">Safely disconnect from the laboratory network.</p>
              </div>
              <Button onClick={onLogout} variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all w-full h-12 font-black uppercase tracking-widest text-[10px]">
                 <LogOut size={16} className="mr-2" /> De-Authorize Session
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
