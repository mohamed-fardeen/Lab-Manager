import React from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Key, 
  Bell, 
  Database,
  RefreshCcw,
  LogOut,
  Sparkles
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/ThemeContext";

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
  const { theme, setTheme } = useTheme();
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <span className="eyebrow">№ 06 — Configuration</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground">
          Researcher Settings
        </h2>
        <div className="ink-rule mt-6 mb-2" />
        <p className="text-muted-foreground text-sm mt-3">Configure your laboratory credentials and profile data.</p>
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
             <button key={i} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${item.active ? 'bg-primary text-primary-foreground border border-primary/20 shadow-accent-glow' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <item.icon size={16} />
                {item.label}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
           {/* Profile Card */}
           <div className="glass-panel p-6 border-border space-y-6">
              <span className="eyebrow">Identity Matrix</span>
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-md bg-surface-raised border border-border flex items-center justify-center text-3xl font-display font-medium text-foreground">
                    {userProfile?.name?.charAt(0).toUpperCase()}
                 </div>
                 <div className="space-y-1">
                    <p className="text-xl font-display font-medium text-foreground">{userProfile?.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Protocol ID: {userProfile?.rrn}</p>
                 </div>
              </div>
           </div>

            {/* Theme Preference */}
            <div className="glass-panel p-6 border-border space-y-6">
               <div className="flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-primary" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">Interface Protocol</h3>
               </div>
               <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Select your preferred visual interface protocol for the laboratory workspace.</p>
                  <div className="grid grid-cols-2 gap-4">
                     {/* Modern Dark — dark surface with mint accent + folder-tab motif */}
                     <button
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-md border transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:bg-surface-overlay'}`}
                     >
                        <div className="relative w-full aspect-video bg-[#0F0F0F] rounded border border-[#2E2E2E] overflow-hidden">
                           {/* Folder tab */}
                           <div className="absolute -top-1 left-2 w-12 h-3 bg-[#00E5B0]/30 clip-folder-tab" style={{ clipPath: 'polygon(0% 0%, 65% 0%, 75% 35%, 100% 35%, 100% 100%, 0% 100%)' }} />
                           {/* Folder card */}
                           <div className="absolute top-3 left-3 right-3 bottom-3 bg-[#1A1A1A] border border-[#2E2E2E] rounded p-2 flex flex-col justify-between">
                              <div className="flex items-center gap-1.5">
                                 <div className="w-2 h-2 rounded-sm bg-[#00E5B0]/30 border border-[#00E5B0]/40" />
                                 <div className="flex-1 h-1 bg-[#2E2E2E] rounded" />
                              </div>
                              <div className="space-y-1">
                                 <div className="h-1 w-3/4 bg-[#2E2E2E] rounded" />
                                 <div className="h-0.5 w-1/2 bg-[#00E5B0]/40 rounded" />
                              </div>
                           </div>
                           {/* Mint accent line */}
                           <div className="absolute bottom-1.5 left-3 right-3 h-0.5 bg-[#00E5B0] rounded-full shadow-[0_0_4px_rgba(0,229,176,0.6)]" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Variant 01</span>
                           <span className="font-display text-sm font-medium text-foreground">Modern Dark</span>
                        </div>
                     </button>

                     {/* Field Journal — paper surface with cobalt + amber rule + specimen corners */}
                     <button
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-md border transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:bg-surface-overlay'}`}
                     >
                        <div className="relative w-full aspect-video bg-[#F5F0E1] rounded border border-[#E2D9C4] overflow-hidden">
                           {/* Specimen card */}
                           <div className="absolute top-3 left-3 right-3 bottom-3 bg-[#FAF6EC] border border-[#E2D9C4] rounded-sm p-2 flex flex-col justify-between">
                              <div className="flex items-center gap-1.5">
                                 <div className="w-2 h-2 rounded-sm bg-[#1E40AF]/15 border border-[#1E40AF]/40" />
                                 <div className="flex-1 h-0.5 bg-[#E2D9C4] rounded" />
                              </div>
                              <div className="space-y-1">
                                 <div className="h-1 w-3/4 bg-[#1A1714]/30 rounded" />
                                 {/* Amber ink-rule */}
                                 <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C99A3B] to-transparent" />
                                 <div className="h-0.5 w-1/2 bg-[#1A1714]/15 rounded" />
                              </div>
                           </div>
                           {/* Cobalt accent line */}
                           <div className="absolute bottom-1.5 left-3 right-3 h-0.5 bg-[#1E40AF] rounded-full shadow-[0_0_4px_rgba(30,64,175,0.5)]" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Variant 02</span>
                           <span className="font-display text-sm font-medium text-foreground">Field Journal</span>
                        </div>
                     </button>
                  </div>
               </div>
            </div>

            {/* Password Change */}
           <div className="glass-panel p-6 border-border space-y-6">
              <div className="flex items-center gap-2 text-foreground">
                 <Key size={18} className="text-primary" />
                 <h3 className="text-sm font-bold">Credential Update</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Current Protocol</label>
                    <input 
                      type="password" 
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">New Protocol</label>
                    <input 
                      type="password" 
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none" 
                    />
                 </div>
                 <Button onClick={handleUpdatePassword} className="bg-primary text-primary-foreground w-full h-12 font-black uppercase tracking-widest text-[10px] shadow-accent-glow hover:bg-foreground hover:text-background transition-all">
                    Update Connection Protocol
                 </Button>
              </div>
           </div>

           {/* Logout Section */}
           <div className="glass-panel p-6 border-red-500/20 bg-red-500/5 space-y-4">
              <div>
                 <h3 className="text-sm font-bold text-red-500">Terminate Session</h3>
                 <p className="text-xs text-muted-foreground mt-1">Safely disconnect from the laboratory network.</p>
              </div>
              <Button onClick={onLogout} variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500 hover:text-foreground transition-all w-full h-12 font-black uppercase tracking-widest text-[10px]">
                 <LogOut size={16} className="mr-2" /> De-Authorize Session
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
