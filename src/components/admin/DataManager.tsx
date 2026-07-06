import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  Code,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  BookOpen,
  User,
  Clock,
  X,
  ExternalLink,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminFile {
  id: string;
  name: string;
  file_type: string;
  size: number;
  url: string;
  created_at: string;
  status: 'pending' | 'approved' | 'needs_correction' | null;
  profiles: {
    name: string;
    rrn: string;
  };
  folders: {
    name: string;
    parent_id: string | null;
  };
}

interface AdminFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

const DataManager = () => {
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [folders, setFolders] = useState<AdminFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [selectedExperimentName, setSelectedExperimentName] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  
  const [previewFile, setPreviewFile] = useState<AdminFile | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [filesRes, foldersRes] = await Promise.all([
        api.get('/admin/files'),
        api.get('/admin/folders')
      ]);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
    } catch (error) {
      console.error('Failed to sync global vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRecordStatus = async (id: string, status: string) => {
    try {
      await api.post('/admin/record/status', { id, status });
      setFiles(files.map(f => f.id === id ? { ...f, status: status as any } : f));
    } catch (error) {
      alert('Failed to update record status.');
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (window.confirm('Are you sure you want to PURGE this intelligence asset?')) {
      try {
        await api.delete(`/admin/file/${id}`);
        setFiles(files.filter(f => f.id !== id));
      } catch (error) {
        alert('Failed to purge asset.');
      }
    }
  };

  const handleClearAllFiles = async () => {
    if (clearConfirmText !== 'CLEAR ALL FILES') {
      alert('Authorization failed. Type "CLEAR ALL FILES" exactly to proceed.');
      return;
    }
    try {
      setIsClearingAll(true);
      await api.delete('/admin/reset', { type: 'files' });
      setFiles([]);
      setShowClearAllModal(false);
      setClearConfirmText('');
      alert('All intelligence assets have been purged. Folder hierarchy preserved.');
    } catch (error: any) {
      alert(error.message || 'Failed to purge assets.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText size={16} className="text-primary" />;
    if (type.includes('image')) return <ImageIcon size={16} className="text-primary" />;
    return <Code size={16} className="text-primary" />;
  };

  const uniqueSubjects = Array.from(new Set(folders.filter(f => !f.parent_id).map(f => f.name))).sort((a, b) => a.localeCompare(b));

  const getExperimentsForSubject = (subjectName: string) => {
    const subjectIds = folders.filter(f => !f.parent_id && f.name === subjectName).map(f => f.id);
    const experiments = folders.filter(f => f.parent_id && subjectIds.includes(f.parent_id));
    return Array.from(new Set(experiments.map(e => e.name))).sort((a, b) => a.localeCompare(b));
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (file.profiles?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'record' && file.file_type.includes('pdf')) ||
                        (typeFilter === 'screenshot' && file.file_type.includes('image')) ||
                        (typeFilter === 'program' && !file.file_type.includes('pdf') && !file.file_type.includes('image'));
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
    
    // Determine the subject and experiment name for this file
    const fileExperimentName = file.folders?.parent_id ? file.folders.name : null;
    const fileSubjectName = file.folders?.parent_id 
      ? folders.find(f => f.id === file.folders.parent_id)?.name 
      : file.folders?.name;

    const matchesFolder = (!selectedSubjectName) || 
                          (selectedSubjectName === fileSubjectName && (!selectedExperimentName || selectedExperimentName === fileExperimentName));
    
    return matchesSearch && matchesType && matchesStatus && matchesFolder;
  });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-foreground">
            Data Manager
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Global oversight and academic control of research intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 border-border flex items-center gap-3">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Assets</div>
                <div className="text-lg font-black text-primary">{files.length}</div>
            </div>
            <Button
              onClick={() => { setShowClearAllModal(true); setClearConfirmText(''); }}
              disabled={files.length === 0}
              className="h-10 px-4 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive border border-destructive/30 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-40"
            >
              <Trash2 size={14} className="mr-2" /> Clear All Files
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left Panel: Directory Structure */}
        <div className="lg:col-span-1 glass-panel border-border flex flex-col overflow-hidden app-bg">
          <div className="p-4 border-b border-border app-surface">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Database size={14} className="text-primary" />
              Hierarchy
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
            <button 
                onClick={() => { setSelectedSubjectName(null); setSelectedExperimentName(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${!selectedSubjectName ? 'bg-primary text-primary-foreground shadow-accent-glow' : 'text-muted-foreground hover:app-surface hover:text-foreground'}`}
            >
                <BookOpen size={14} /> Global Root
            </button>
            {uniqueSubjects.map(subjectName => (
                <div key={subjectName} className="space-y-1">
                    <button 
                        onClick={() => {
                          setSelectedSubjectName(subjectName);
                          setSelectedExperimentName(null);
                          toggleSubject(subjectName);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${selectedSubjectName === subjectName && !selectedExperimentName ? 'bg-primary/5 text-primary' : expandedSubjects.includes(subjectName) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <div className="flex items-center gap-2">
                            <FolderIcon size={14} className={expandedSubjects.includes(subjectName) ? 'text-primary' : 'text-muted-foreground'} />
                            <span className="truncate max-w-[150px]">{subjectName}</span>
                        </div>
                        {expandedSubjects.includes(subjectName) ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />}
                    </button>
                    {expandedSubjects.includes(subjectName) && (
                        <div className="ml-4 pl-2 border-l border-border space-y-1">
                            {getExperimentsForSubject(subjectName).map(expName => (
                                <button 
                                    key={expName}
                                    onClick={() => {
                                      setSelectedSubjectName(subjectName);
                                      setSelectedExperimentName(expName);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 ${selectedSubjectName === subjectName && selectedExperimentName === expName ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <div className="w-1 h-1 rounded-full bg-border"></div>
                                    <span className="truncate max-w-[140px]">{expName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
          </div>
        </div>

        {/* Main Panel: File Table */}
        <div className="lg:col-span-3 flex flex-col space-y-4 min-h-0">
          {/* Controls */}
          <div className="glass-panel p-3 border-border flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search files or researchers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full app-bg border border-border rounded-lg py-2 pl-10 pr-4 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="app-bg border border-border rounded-lg py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground focus:outline-none focus:border-primary transition-all"
                >
                    <option value="all">All Types</option>
                    <option value="record">Records (PDF)</option>
                    <option value="screenshot">Screenshots</option>
                    <option value="program">Programs</option>
                </select>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="app-bg border border-border rounded-lg py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground focus:outline-none focus:border-primary transition-all"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="needs_correction">Corrections</option>
                </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel border-border overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto flex-1 scrollbar-hide">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border app-surface backdrop-blur-md">
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Intelligence Asset</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Researcher</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Domain</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Syncing Vault...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFiles.length > 0 ? filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:app-surface transition-all group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg app-surface border border-border flex items-center justify-center">
                            {getFileIcon(file.file_type)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">{file.name}</div>
                            <div className="text-[9px] text-muted-foreground font-medium">{(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-muted-foreground" />
                          <div className="text-xs font-medium text-foreground">{file.profiles?.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{file.folders?.name}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {file.file_type.includes('pdf') ? (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                            file.status === 'approved' ? 'bg-primary/10 border-primary/20 text-primary' :
                            file.status === 'needs_correction' ? 'bg-muted border-border text-muted-foreground' :
                            'bg-primary/5 border-primary/10 text-primary/70'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              file.status === 'approved' ? 'bg-primary' :
                              file.status === 'needs_correction' ? 'bg-muted-foreground' :
                              'bg-primary/40 animate-pulse'
                            }`}></div>
                            <span className="text-[9px] font-black uppercase tracking-tight">{file.status || 'pending'}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          {file.file_type.includes('pdf') && (
                            <>
                              <button
                                onClick={() => updateRecordStatus(file.id, 'approved')}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                                title="Approve Record"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => updateRecordStatus(file.id, 'needs_correction')}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md"
                                title="Needs Correction"
                              >
                                <AlertCircle size={14} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                            title="Preview Intelligence"
                          >
                            <Eye size={14} />
                          </button>
                          <a 
                            href={file.url} 
                            download 
                            target="_blank"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:app-surface-raised rounded-md"
                          >
                            <Download size={14} />
                          </a>
                          <button 
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-600/10 rounded-md"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground text-xs italic">
                        No intelligence assets found matching the current sync parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-12 app-bg backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl h-full app-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="p-4 border-b border-border app-bg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg app-surface flex items-center justify-center text-primary">
                            {getFileIcon(previewFile.file_type)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">{previewFile.name}</h3>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                Researcher: {previewFile.profiles?.name} • {(previewFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={previewFile.url} target="_blank" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink size={18} />
                        </a>
                        <button onClick={() => setPreviewFile(null)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 app-bg overflow-hidden relative">
                    {previewFile.file_type.includes('image') ? (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                        </div>
                    ) : previewFile.file_type.includes('pdf') ? (
                        <iframe src={`${previewFile.url}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <Code size={48} className="opacity-20" />
                            <p className="text-xs uppercase font-bold tracking-widest">Raw Data Sequencing Incompatible with Preview</p>
                            <a href={previewFile.url} target="_blank" className="text-primary hover:underline text-xs font-bold">Open Direct Link</a>
                        </div>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Files Confirmation Modal */}
      <AnimatePresence>
        {showClearAllModal && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md glass-panel border-destructive/30 bg-destructive/5 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-destructive/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-destructive">Purge All Assets</h3>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">Folder hierarchy will be preserved</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This will permanently delete <span className="text-destructive font-bold">{files.length}</span> intelligence asset{files.length === 1 ? '' : 's'} from every researcher. Academic folder structure remains intact.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Authorization Phrase</label>
                  <input
                    type="text"
                    placeholder='Type: CLEAR ALL FILES'
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    autoFocus
                    className="w-full app-bg border border-border rounded-xl py-3 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground focus:outline-none focus:border-destructive/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowClearAllModal(false); setClearConfirmText(''); }}
                    disabled={isClearingAll}
                    className="flex-1 h-11 border-border text-muted-foreground hover:text-foreground hover:bg-surface-overlay font-mono text-[10px] uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearAllFiles}
                    disabled={isClearingAll || clearConfirmText !== 'CLEAR ALL FILES'}
                    className="flex-1 h-11 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl border-none disabled:opacity-40"
                  >
                    {isClearingAll ? 'Purging…' : 'Confirm Purge'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataManager;
