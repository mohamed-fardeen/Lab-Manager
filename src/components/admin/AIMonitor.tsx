import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  ShieldAlert, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCcw,
  Power,
  Search,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AILog {
  id: string;
  profiles: { name: string };
  action: string;
  file_name: string;
  status: 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

interface AIError {
  id: string;
  error_message: string;
  endpoint: string;
  created_at: string;
}

interface AIMonitorData {
  success: boolean;
  isMock: boolean;
  stats: {
    totalRequests: number;
    successRate: string;
    failedRequests: number;
    avgLatency: string;
  };
  logs: AILog[];
  errors: AIError[];
  aiEnabled: boolean;
}

const AIMonitor = () => {
  const [data, setData] = useState<AIMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetchMonitorData();
  }, []);

  const fetchMonitorData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/ai-monitor');
      setData(res);
    } catch (error) {
      console.error('Failed to sync neural networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAI = async () => {
    if (!data) return;
    try {
      setIsToggling(true);
      await api.post('/admin/ai-toggle', { enabled: !data.aiEnabled });
      setData({ ...data, aiEnabled: !data.aiEnabled });
    } catch (error) {
      console.error('Failed to command neural shutdown:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Accessing Neural Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-foreground">
            Neural Network Monitor
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Surveillance of Llama 3.3 cognitive processing and inference streams.</p>
        </div>
        <div className="flex items-center gap-3">
            {data.isMock && (
                <div className="flex items-center gap-2 bg-muted border border-border px-3 py-1.5 rounded-lg text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <AlertTriangle size={12} /> Simulation Mode
                </div>
            )}
            <Button 
                onClick={handleToggleAI} 
                disabled={isToggling}
                variant={data.aiEnabled ? "default" : "destructive"}
                className={`rounded-xl h-12 px-6 font-black uppercase tracking-[0.2em] text-[10px] transition-all ${data.aiEnabled ? 'bg-primary hover:bg-foreground hover:text-background text-primary-foreground' : ''}`}
            >
                <Power size={16} className="mr-2" />
                {data.aiEnabled ? 'Deactivate AI' : 'Reactivate AI'}
            </Button>
        </div>
      </div>

      {/* AI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inferences', value: data.stats.totalRequests, icon: Activity, color: 'text-primary' },
          { label: 'Intelligence Accuracy', value: data.stats.successRate, icon: CheckCircle2, color: 'text-primary' },
          { label: 'Failed Synapses', value: data.stats.failedRequests, icon: XCircle, color: 'text-muted-foreground' },
          { label: 'Neural Latency', value: data.stats.avgLatency, icon: Clock, color: 'text-muted-foreground' },
        ].map((item, i) => (
          <div key={i} className="glass-panel p-6 border-border flex flex-col items-center text-center">
            <div className={`p-3 rounded-2xl app-surface border border-border mb-4 ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div className="text-2xl font-black text-foreground italic">{item.value}</div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="xl:col-span-2 glass-panel border-border overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border app-surface flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground italic flex items-center gap-2">
                    <Terminal size={16} className="text-primary" />
                    Inference Stream Logs
                </h3>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Showing Last 50 Events</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-border app-bg">
                            <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Researcher</th>
                            <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol</th>
                            <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Asset</th>
                            <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {data.logs.map((log, i) => (
                            <tr key={log.id} className="hover:app-surface-raised transition-all">
                                <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">{log.profiles?.name}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 rounded app-surface border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 max-w-[150px] truncate text-muted-foreground italic text-xs">{log.file_name}</td>
                                <td className="px-6 py-4 text-center">
                                    {log.status === 'success' ? (
                                        <div className="flex items-center justify-center text-primary gap-1">
                                            <CheckCircle2 size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">OK</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center text-muted-foreground gap-1">
                                            <XCircle size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">FAIL</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Error Logs */}
        <div className="glass-panel border-border flex flex-col bg-muted/10">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-2">
                <ShieldAlert size={18} className="text-muted-foreground" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic">Critical Synapse Failures</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[600px]">
                {data.errors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-sm text-center">
                        <CheckCircle2 size={32} className="text-primary/20 mb-3" />
                        No critical errors detected <br/> within the neural core.
                    </div>
                ) : (
                    data.errors.map((err, i) => (
                        <div key={i} className="glass-panel p-4 border-border app-bg space-y-2 group">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{err.endpoint}</span>
                                <span className="text-[9px] text-muted-foreground font-bold">{new Date(err.created_at).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">{err.error_message}</p>
                            <div className="pt-2 flex justify-end">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Retry Sequence</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIMonitor;
