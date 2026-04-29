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
  ExternalLink
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

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText size={16} className="text-rose-400" />;
    if (type.includes('image')) return <ImageIcon size={16} className="text-emerald-400" />;
    return <Code size={16} className="text-blue-400" />;
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
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            Data Manager
          </h2>
          <p className="text-slate-500 text-sm mt-1">Global oversight and academic control of research intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 border-slate-800 flex items-center gap-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Assets</div>
                <div className="text-lg font-black text-electric-blue">{files.length}</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left Panel: Directory Structure */}
        <div className="lg:col-span-1 glass-panel border-slate-800 flex flex-col overflow-hidden bg-slate-950/20">
          <div className="p-4 border-b border-slate-800 bg-slate-900/30">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Database size={14} className="text-purple-500" />
              Hierarchy
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
            <button 
                onClick={() => { setSelectedSubjectName(null); setSelectedExperimentName(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${!selectedSubjectName ? 'bg-electric-blue/10 text-electric-blue border border-electric-blue/20' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`}
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
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${selectedSubjectName === subjectName && !selectedExperimentName ? 'bg-electric-blue/5 text-electric-blue' : expandedSubjects.includes(subjectName) ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <FolderIcon size={14} className={expandedSubjects.includes(subjectName) ? 'text-electric-blue' : 'text-slate-600'} />
                            <span className="truncate max-w-[150px]">{subjectName}</span>
                        </div>
                        {expandedSubjects.includes(subjectName) ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />}
                    </button>
                    {expandedSubjects.includes(subjectName) && (
                        <div className="ml-4 pl-2 border-l border-slate-800 space-y-1">
                            {getExperimentsForSubject(subjectName).map(expName => (
                                <button 
                                    key={expName}
                                    onClick={() => {
                                      setSelectedSubjectName(subjectName);
                                      setSelectedExperimentName(expName);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 ${selectedSubjectName === subjectName && selectedExperimentName === expName ? 'text-electric-blue bg-electric-blue/5' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
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
          <div className="glass-panel p-3 border-slate-800 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-blue transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search files or researchers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-[11px] focus:outline-none focus:ring-1 focus:ring-electric-blue/50 transition-all text-white"
              />
            </div>
            <div className="flex items-center gap-2">
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
                >
                    <option value="all">All Types</option>
                    <option value="record">Records (PDF)</option>
                    <option value="screenshot">Screenshots</option>
                    <option value="program">Programs</option>
                </select>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none focus:border-electric-blue transition-all"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="needs_correction">Corrections</option>
                </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto flex-1 scrollbar-hide">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Intelligence Asset</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Researcher</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-electric-blue/20 border-t-electric-blue rounded-full animate-spin"></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Syncing Vault...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFiles.length > 0 ? filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-900/30 transition-all group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                            {getFileIcon(file.file_type)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-electric-blue transition-colors truncate max-w-[200px]">{file.name}</div>
                            <div className="text-[9px] text-slate-500 font-medium">{(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-slate-600" />
                          <div className="text-xs font-medium text-slate-300">{file.profiles?.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{file.folders?.name}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {file.file_type.includes('pdf') ? (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                            file.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            file.status === 'needs_correction' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${
                              file.status === 'approved' ? 'bg-emerald-500' :
                              file.status === 'needs_correction' ? 'bg-rose-500' :
                              'bg-amber-500 animate-pulse'
                            }`}></div>
                            <span className="text-[9px] font-black uppercase tracking-tight">{file.status || 'pending'}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          {file.file_type.includes('pdf') && (
                            <>
                              <button 
                                onClick={() => updateRecordStatus(file.id, 'approved')}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md"
                                title="Approve Record"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button 
                                onClick={() => updateRecordStatus(file.id, 'needs_correction')}
                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md"
                                title="Needs Correction"
                              >
                                <AlertCircle size={14} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md"
                            title="Preview Intelligence"
                          >
                            <Eye size={14} />
                          </button>
                          <a 
                            href={file.url} 
                            download 
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
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
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-600 text-xs italic">
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
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-12 bg-slate-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl h-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-electric-blue">
                            {getFileIcon(previewFile.file_type)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{previewFile.name}</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                Researcher: {previewFile.profiles?.name} • {(previewFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={previewFile.url} target="_blank" className="p-2 text-slate-400 hover:text-white transition-colors">
                            <ExternalLink size={18} />
                        </a>
                        <button onClick={() => setPreviewFile(null)} className="p-2 text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-950 overflow-hidden relative">
                    {previewFile.file_type.includes('image') ? (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                        </div>
                    ) : previewFile.file_type.includes('pdf') ? (
                        <iframe src={`${previewFile.url}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <Code size={48} className="opacity-20" />
                            <p className="text-xs uppercase font-bold tracking-widest">Raw Data Sequencing Incompatible with Preview</p>
                            <a href={previewFile.url} target="_blank" className="text-electric-blue hover:underline text-xs font-bold">Open Direct Link</a>
                        </div>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataManager;
