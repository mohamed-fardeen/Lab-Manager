import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  HardDrive, 
  Cloud, 
  Trash2, 
  FolderSync, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  User, 
  BarChart,
  Filter,
  RefreshCcw,
  MoreVertical
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface LargeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  user: string;
  timestamp: string;
}

interface TopUser {
  name: string;
  size: number;
  count: number;
}

interface StorageData {
  success: boolean;
  totalUsed: number;
  limit: number;
  topUsers: TopUser[];
  largeFiles: LargeFile[];
}

const StorageManager = () => {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageData();
  }, []);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/storage');
      setData(res);
    } catch (error) {
      console.error('Failed to sync storage nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently purge "${name}" from the laboratory vault? This action is irreversible.`)) return;
    
    try {
      setIsDeleting(id);
      await api.delete(`/admin/file/${id}`);
      fetchStorageData(); // Refresh
    } catch (error) {
      console.error('Failed to execute purge protocol:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-electric-blue/10 border-t-electric-blue rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Auditing Storage Clusters...</p>
        </div>
      </div>
    );
  }

  const usagePercent = Math.min((data.totalUsed / data.limit) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            Infrastructure Storage
          </h2>
          <p className="text-slate-500 text-sm mt-1">Global oversight for Cloudinary and Supabase data persistence layers.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchStorageData} className="border-slate-800 rounded-xl h-12 w-12 p-0 group">
                <RefreshCcw size={18} className="group-hover:rotate-180 transition-all duration-500" />
            </Button>
            <Button className="bg-white text-slate-950 font-black uppercase tracking-widest text-[10px] rounded-xl h-12 px-6 hover:bg-electric-blue hover:text-white transition-all">
                Initiate Optimization
            </Button>
        </div>
      </div>

      {/* Storage Overview Card */}
      <div className="glass-panel p-8 border-slate-800 space-y-8 bg-slate-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Aggregate Utilization</div>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white italic">{formatSize(data.totalUsed)}</span>
                    <span className="text-slate-600 font-bold">/ {formatSize(data.limit)}</span>
                </div>
            </div>
            <div className="flex-1 max-w-md space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Node Status</span>
                    <span className={usagePercent > 80 ? 'text-rose-500' : 'text-emerald-500'}>
                        {usagePercent > 80 ? 'Critical Load' : 'Optimal Capacity'} ({Math.round(usagePercent)}%)
                    </span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${usagePercent}%` }}
                        className={`h-full rounded-full ${usagePercent > 80 ? 'bg-rose-500 shadow-rose-glow' : 'bg-electric-blue shadow-blue-glow'}`}
                    ></motion.div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Large Files Surveillance */}
        <div className="xl:col-span-2 glass-panel border-slate-800 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
                    <Layers size={16} className="text-rose-500" />
                    High-Volume Asset Tracking
                </h3>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                    <Filter size={12} /> Size Descending
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Asset Name</th>
                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Researcher</th>
                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Payload</th>
                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {data.largeFiles.map((file) => (
                            <tr key={file.id} className="hover:bg-slate-800/20 transition-all group">
                                <td className="px-6 py-4 truncate max-w-[200px]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-electric-blue transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <span className="font-bold text-white text-xs truncate">{file.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                                        <User size={12} className="text-slate-600" />
                                        {file.user}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`text-xs font-black italic ${file.size > 10 * 1024 * 1024 ? 'text-rose-400' : 'text-slate-300'}`}>
                                        {formatSize(file.size)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleDeleteFile(file.id, file.name)}
                                        disabled={isDeleting === file.id}
                                        className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8 p-0"
                                    >
                                        {isDeleting === file.id ? <RefreshCcw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Top Users Usage */}
        <div className="glass-panel border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic flex items-center gap-2">
                    <BarChart size={16} className="text-electric-blue" />
                    Storage Consumers
                </h3>
            </div>
            <div className="p-6 space-y-6">
                {data.topUsers.map((user, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{user.name}</span>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{user.count} Data Assets</span>
                            </div>
                            <span className="text-xs font-black text-electric-blue">{formatSize(user.size)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(user.size / data.totalUsed) * 100}%` }}
                                className="h-full bg-slate-800 rounded-full group-hover:bg-electric-blue transition-colors"
                            ></motion.div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto p-6 bg-slate-950/40 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-3 text-amber-500 bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tighter">
                        Large asset concentrations detected in primary nodes. Initiate sync or cleanup to maintain neural efficiency.
                    </p>
                </div>
                <Button className="w-full bg-slate-900 border border-slate-800 text-white font-black uppercase tracking-widest text-[9px] h-12 rounded-xl hover:bg-slate-800">
                    Run System-wide Cleanup
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StorageManager;
