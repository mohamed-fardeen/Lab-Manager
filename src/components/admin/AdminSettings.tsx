import React, { useState, useEffect } from 'react';
import {
  Settings,
  Trash2,
  RefreshCcw,
  ShieldAlert,
  BookOpen,
  Plus,
  FolderPlus,
  AlertTriangle,
  Mail,
  Lock,
  Cpu,
  Database,
  Globe,
  Upload,
  CheckCircle2,
  ChevronRight,
  Info,
  Sparkles,
  Code2
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useBackground, BACKGROUND_OPTIONS, BackgroundMode } from '../../context/BackgroundContext';
import BackgroundPreview from '../background/BackgroundPreview';

interface Subject {
  name: string;
  folderIds: string[];
  experiments: { name: string, folderIds: string[] }[];
}

const AdminSettings = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { theme, setTheme } = useTheme();
  const { mode: bgMode, setMode: setBgMode } = useBackground();
  
  // Settings States
  const [restrictEmail, setRestrictEmail] = useState(true);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [aiLimit, setAiLimit] = useState(50);
  const [maxUploadSize, setMaxUploadSize] = useState(50); // MB

  useEffect(() => {
    fetchStructure();
  }, []);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/folders');
      const subjectsMap: { [key: string]: Subject } = {};
      const allFolders = res.folders || [];
      
      // Group subjects by exact name
      allFolders.filter((f: any) => !f.parent_id).forEach((s: any) => {
        if (!subjectsMap[s.name]) {
            subjectsMap[s.name] = { name: s.name, folderIds: [], experiments: [] };
        }
        subjectsMap[s.name].folderIds.push(s.id);
      });
      
      // Group experiments under their parent subject name
      allFolders.filter((f: any) => f.parent_id).forEach((e: any) => {
        const parentSubject = allFolders.find((s: any) => s.id === e.parent_id);
        if (parentSubject && subjectsMap[parentSubject.name]) {
            const subjectEntry = subjectsMap[parentSubject.name];
            let expEntry = subjectEntry.experiments.find(ex => ex.name === e.name);
            if (!expEntry) {
                expEntry = { name: e.name, folderIds: [] };
                subjectEntry.experiments.push(expEntry);
            }
            expEntry.folderIds.push(e.id);
        }
      });
      
      const sortedSubjects = Object.values(subjectsMap).sort((a, b) => a.name.localeCompare(b.name));
      sortedSubjects.forEach(s => s.experiments.sort((a, b) => a.name.localeCompare(b.name)));
      
      setSubjects(sortedSubjects);
    } catch (error) {
      console.error('Failed to sync structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    const name = window.prompt('Enter Subject Name (e.g., Data Structures):');
    if (!name) return;
    try {
      await api.post('/admin/subject', { name });
      fetchStructure();
    } catch (error) {
      console.error('Failed to encode subject:', error);
    }
  };

  const handleCreateExperiment = async (subjectName: string) => {
    const name = window.prompt('Enter Experiment Name (e.g., Stack Implementation):');
    if (!name) return;
    try {
      await api.post('/admin/experiment', { name, subjectName });
      fetchStructure();
    } catch (error) {
      console.error('Failed to encode experiment:', error);
    }
  };

  const handleDeleteFolder = async (name: string, folderIds: string[]) => {
    if (!window.confirm(`Purge "${name}" and all associated intelligence assets for ALL users? This is irreversible.`)) return;
    try {
      await api.post(`/admin/folders/delete`, { ids: folderIds });
      fetchStructure();
    } catch (error) {
      console.error('Purge sequence failed:', error);
    }
  };

  const handleSystemReset = async (type: 'files' | 'academic' | 'full') => {
    if (resetConfirm !== 'RESET SYSTEM') {
      alert('Neural authorization failed. Type "RESET SYSTEM" to proceed.');
      return;
    }
    
    if (!window.confirm(`CRITICAL: You are initiating a ${type.toUpperCase()} reset. This will wipe the core database. Proceed?`)) return;
    
    try {
      setIsResetting(true);
      await api.delete('/admin/reset', { type });
      alert(`System ${type} reset completed.`);
      setResetConfirm('');
      fetchStructure();
    } catch (error) {
      console.error('Reset sequence failure:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Accessing System Protocols...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div>
        <span className="eyebrow">№ E1 — System</span>
        <h2 className="mt-3 text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground">
          System Control Center
        </h2>
        <div className="ink-rule mt-4 mb-3" />
        <p className="text-muted-foreground text-sm mt-3">High-level administrative overrides and infrastructure configuration.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Section 1: Academic Structure */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground italic flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              Academic Hierarchy
            </h3>
            <Button onClick={handleCreateSubject} className="h-8 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-foreground hover:text-background transition-all shadow-accent-glow">
              <Plus size={14} className="mr-1" /> New Subject
            </Button>
          </div>
          
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.name} className="glass-panel border-border overflow-hidden app-surface">
                <div className="p-4 app-bg border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <ChevronRight size={16} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-foreground">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCreateExperiment(subject.name)} className="h-7 px-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                      <FolderPlus size={14} className="mr-1" /> Add Exp
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteFolder(subject.name, subject.folderIds)} className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {subject.experiments.map((exp) => (
                    <div key={exp.name} className="flex items-center justify-between p-2 px-4 hover:app-surface-raised rounded-lg group">
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{exp.name}</span>
                      <button onClick={() => handleDeleteFolder(exp.name, exp.folderIds)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {subject.experiments.length === 0 && (
                    <p className="p-4 text-[10px] text-muted-foreground italic text-center uppercase tracking-widest">No experiments coded</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Section 1.5: Interface Protocol (Theme) */}
          <div className="glass-panel p-8 border-border space-y-6 app-surface">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles size={18} className="text-primary" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Interface Protocol</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Select your preferred visual interface protocol for the administrative workspace.</p>

              <div className="grid grid-cols-2 gap-4">
                {/* Modern Dark */}
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-md border transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:bg-surface-overlay'}`}
                >
                  <div className="relative w-full aspect-video bg-[#0F0F0F] rounded border border-[#2E2E2E] overflow-hidden">
                    <div className="absolute -top-1 left-2 w-12 h-3 bg-[#00E5B0]/30 clip-folder-tab" style={{ clipPath: 'polygon(0% 0%, 65% 0%, 75% 35%, 100% 35%, 100% 100%, 0% 100%)' }} />
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
                    <div className="absolute bottom-1.5 left-3 right-3 h-0.5 bg-[#00E5B0] rounded-full shadow-[0_0_4px_rgba(0,229,176,0.6)]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Variant 01</span>
                    <span className="font-display text-sm font-medium text-foreground">Modern Dark</span>
                  </div>
                </button>

                {/* Field Journal */}
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-md border transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:bg-surface-overlay'}`}
                >
                  <div className="relative w-full aspect-video bg-[#F5F0E1] rounded border border-[#E2D9C4] overflow-hidden">
                    <div className="absolute top-3 left-3 right-3 bottom-3 bg-[#FAF6EC] border border-[#E2D9C4] rounded-sm p-2 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm bg-[#1E40AF]/15 border border-[#1E40AF]/40" />
                        <div className="flex-1 h-0.5 bg-[#E2D9C4] rounded" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 w-3/4 bg-[#1A1714]/30 rounded" />
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C99A3B] to-transparent" />
                        <div className="h-0.5 w-1/2 bg-[#1A1714]/15 rounded" />
                      </div>
                    </div>
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

          {/* Section 1.6: Landing Background Animation */}
          <div className="glass-panel p-8 border-border space-y-6 app-surface">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Code2 size={18} className="text-primary" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Landing Background</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Choose the ambient background animation shown on the landing page. Each is grounded in a real concept from programming — none are abstract "tech" decoration.
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setBgMode(opt.id as BackgroundMode)}
                    className={`group relative p-3 rounded-md border transition-all flex flex-col gap-2 text-left ${
                      bgMode === opt.id
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-border bg-background hover:bg-surface-overlay'
                    }`}
                  >
                    <BackgroundPreview mode={opt.id as BackgroundMode} active={bgMode === opt.id} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-medium text-foreground">{opt.name}</span>
                      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{opt.catalogue}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{opt.description}</p>
                    {bgMode === opt.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-accent-glow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: System Toggles */}
          <div className="glass-panel p-8 border-border space-y-6 app-surface">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground italic flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              Platform Protocols
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 app-bg rounded-xl border border-border">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" />
                    Restrict Email Domain
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Only @college.edu allowed</p>
                </div>
                <button 
                  onClick={() => setRestrictEmail(!restrictEmail)}
                  className={`w-10 h-5 rounded-full transition-all relative ${restrictEmail ? 'bg-primary' : 'app-surface-raised'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${restrictEmail ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 app-bg rounded-xl border border-border">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Lock size={14} className="text-muted-foreground" />
                    Open Registration
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Allow new researchers to join</p>
                </div>
                <button 
                  onClick={() => setAllowRegistration(!allowRegistration)}
                  className={`w-10 h-5 rounded-full transition-all relative ${allowRegistration ? 'bg-primary' : 'app-surface-raised'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${allowRegistration ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Quotas */}
          <div className="glass-panel p-8 border-border space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Cpu size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Quota</span>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="10" max="200" step="10"
                      value={aiLimit}
                      onChange={(e) => setAiLimit(parseInt(e.target.value))}
                      className="w-full h-1 app-surface rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Limit</span>
                      <span className="text-foreground">{aiLimit} req/day</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Database size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Payload Limit</span>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="5" max="500" step="5"
                      value={maxUploadSize}
                      onChange={(e) => setMaxUploadSize(parseInt(e.target.value))}
                      className="w-full h-1 app-surface rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Max</span>
                      <span className="text-foreground">{maxUploadSize} MB</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Section 4: System Reset (DANGER ZONE) */}
          <div className="glass-panel p-8 border-destructive/20 bg-destructive/5 space-y-6">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert size={18} />
              <h3 className="font-display text-sm font-medium uppercase tracking-[0.2em]">Catastrophic Reset Protocol</h3>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Initiating a reset will permanently purge laboratory intelligence. This action cannot be intercepted once deployed.
            </p>

            <div className="space-y-4">
               <div className="relative group">
                  <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-destructive transition-colors" />
                  <input
                    type="text"
                    placeholder="Type: RESET SYSTEM"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    className="w-full app-bg border border-border rounded-xl py-3 pl-9 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground focus:outline-none focus:border-destructive/50 transition-all placeholder:text-muted-foreground/40"
                  />
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSystemReset('files')}
                    disabled={isResetting || resetConfirm !== 'RESET SYSTEM'}
                    className="h-10 border-border text-muted-foreground hover:text-foreground hover:bg-surface-overlay font-mono text-[9px] uppercase tracking-widest rounded-xl"
                  >
                    Purge Files
                  </Button>
                  <Button
                    onClick={() => handleSystemReset('full')}
                    disabled={isResetting || resetConfirm !== 'RESET SYSTEM'}
                    className="h-10 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[9px] uppercase tracking-widest rounded-xl border-none"
                  >
                    Nuclear Reset
                  </Button>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
