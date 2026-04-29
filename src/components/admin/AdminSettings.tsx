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
  Info
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
          <div className="w-10 h-10 border-2 border-electric-blue/10 border-t-electric-blue rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Accessing System Protocols...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
          System Control Center
        </h2>
        <p className="text-slate-500 text-sm mt-1">High-level administrative overrides and infrastructure configuration.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Section 1: Academic Structure */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
              <BookOpen size={16} className="text-electric-blue" />
              Academic Hierarchy
            </h3>
            <Button onClick={handleCreateSubject} className="h-8 px-4 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-electric-blue hover:text-white transition-all">
              <Plus size={14} className="mr-1" /> New Subject
            </Button>
          </div>
          
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.name} className="glass-panel border-slate-800 overflow-hidden bg-slate-900/10">
                <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                      <ChevronRight size={16} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-white">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCreateExperiment(subject.name)} className="h-7 px-2 text-[8px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">
                      <FolderPlus size={14} className="mr-1" /> Add Exp
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteFolder(subject.name, subject.folderIds)} className="h-7 w-7 p-0 text-slate-600 hover:text-rose-500">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {subject.experiments.map((exp) => (
                    <div key={exp.name} className="flex items-center justify-between p-2 px-4 hover:bg-slate-800/20 rounded-lg group">
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{exp.name}</span>
                      <button onClick={() => handleDeleteFolder(exp.name, exp.folderIds)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {subject.experiments.length === 0 && (
                    <p className="p-4 text-[10px] text-slate-600 italic text-center uppercase tracking-widest">No experiments coded</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Section 2: System Toggles */}
          <div className="glass-panel p-8 border-slate-800 space-y-6 bg-slate-900/10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
              <Settings size={16} className="text-emerald-500" />
              Platform Protocols
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Mail size={14} className="text-slate-500" />
                    Restrict Email Domain
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Only @college.edu allowed</p>
                </div>
                <button 
                  onClick={() => setRestrictEmail(!restrictEmail)}
                  className={`w-10 h-5 rounded-full transition-all relative ${restrictEmail ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${restrictEmail ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Lock size={14} className="text-slate-500" />
                    Open Registration
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Allow new researchers to join</p>
                </div>
                <button 
                  onClick={() => setAllowRegistration(!allowRegistration)}
                  className={`w-10 h-5 rounded-full transition-all relative ${allowRegistration ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${allowRegistration ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Quotas */}
          <div className="glass-panel p-8 border-slate-800 space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-electric-blue">
                    <Cpu size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Quota</span>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="10" max="200" step="10"
                      value={aiLimit}
                      onChange={(e) => setAiLimit(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-full appearance-none cursor-pointer accent-electric-blue"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Limit</span>
                      <span className="text-white">{aiLimit} req/day</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Database size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Payload Limit</span>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="5" max="500" step="5"
                      value={maxUploadSize}
                      onChange={(e) => setMaxUploadSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Max</span>
                      <span className="text-white">{maxUploadSize} MB</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Section 4: System Reset (DANGER ZONE) */}
          <div className="glass-panel p-8 border-rose-500/20 bg-rose-500/5 space-y-6">
            <div className="flex items-center gap-2 text-rose-500">
              <ShieldAlert size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Catastrophic Reset Protocol</h3>
            </div>
            
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Initiating a reset will permanently purge laboratory intelligence. This action cannot be intercepted once deployed.
            </p>

            <div className="space-y-4">
               <div className="relative group">
                  <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-rose-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="TYPE: RESET SYSTEM" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800/50 rounded-xl py-3 pl-9 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white focus:outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-800"
                  />
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSystemReset('files')}
                    disabled={isResetting || resetConfirm !== 'RESET SYSTEM'}
                    className="h-10 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 text-[9px] font-black uppercase tracking-widest rounded-xl"
                  >
                    Purge Files
                  </Button>
                  <Button 
                    onClick={() => handleSystemReset('full')}
                    disabled={isResetting || resetConfirm !== 'RESET SYSTEM'}
                    className="h-10 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-rose-glow border-none"
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
