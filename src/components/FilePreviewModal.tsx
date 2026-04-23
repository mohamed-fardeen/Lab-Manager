import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { 
  FileText, 
  X, 
  Brain, 
  Sparkles, 
  HelpCircle, 
  Loader2, 
  Code, 
  FileBox, 
  Calendar,
  Layers,
  Terminal,
  Copy,
  RefreshCw,
  Clock,
  ChevronRight,
  Info,
  Download
} from 'lucide-react';
import { api } from '../lib/api';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface FileItem {
    id: string;
    name: string;
    file_type: string;
    url: string;
    size: number;
    created_at: string;
    language?: string | null;
    tags?: string[] | null;
    content?: string | null;
}

interface FilePreviewModalProps {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [activeAction, setActiveAction] = useState<string | null>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!file) return null;

    const handleAiAction = async (action: 'explain' | 'summarize' | 'viva') => {
        setAiLoading(true);
        setActiveAction(action);
        
        try {
            const response = await api.post('/action', {
                action,
                fileName: file.name,
                language: file.language || 'text',
                content: file.content || ''
            });

            setAiResponse(response.response || "No response received.");
            
            // Auto-scroll to response
            setTimeout(() => {
                const element = document.getElementById('ai-response-anchor');
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (error) {
            console.error('AI Action Failed:', error);
            setAiResponse('**Error:** Failed to sequence intelligence for this record.');
        } finally {
            setAiLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(aiResponse);
        alert('Intelligence copied to clipboard');
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            window.open(file.url, '_blank');
        }
    };

    const renderPreviewContent = () => {
        const isProgram = file.language || file.file_type === 'program';
        const isRecord = file.file_type === 'application/pdf' || file.tags?.includes('record');
        const isScreenshot = file.file_type.startsWith('image/') || file.tags?.includes('screenshot');

        if (isProgram) {
            return (
                <div className="bg-[#0b0e14] rounded-2xl border border-slate-800/50 flex flex-col w-full">
                    <div className="bg-slate-900/50 px-5 py-3 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-electric-blue" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Source Code</span>
                        </div>
                        <span className="text-[9px] font-black text-electric-blue/70 bg-electric-blue/5 px-2 py-0.5 rounded border border-electric-blue/10 uppercase">{file.language}</span>
                    </div>
                    <div className="p-8 text-xs font-mono text-slate-400 leading-relaxed overflow-x-auto w-full">
                        <pre className="whitespace-pre">
                            <code>{file.content || '// No content extracted'}</code>
                        </pre>
                    </div>
                </div>
            );
        }

        if (isRecord) {
            return (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden h-[800px] w-full">
                    <iframe src={`${file.url}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                </div>
            );
        }

        if (isScreenshot) {
            return (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4 w-full">
                    <img src={file.url} alt={file.name} className="max-w-full rounded-lg shadow-2xl" />
                </div>
            );
        }

        return <div className="p-10 flex items-center justify-center text-slate-700 italic text-xs border border-dashed border-slate-800 rounded-2xl w-full">No preview available for this resource</div>;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] bg-[#020617] border-slate-800 p-0 overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-opacity-50">
                <div className="flex h-full w-full overflow-hidden">
                    {/* Left Panel: Fixed sidebar with its own scroll if needed */}
                    <aside className="w-[380px] bg-[#080b12] border-r border-slate-800/50 flex flex-col shrink-0 h-full overflow-y-auto">
                        <div className="p-10 space-y-12 flex flex-col min-h-full pb-20">
                            {/* Header */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800 shadow-xl">
                                    <FileText size={32} />
                                </div>
                                <div className="space-y-1.5 overflow-hidden">
                                    <h2 className="text-2xl font-black text-white leading-tight tracking-tight truncate">{file.name}</h2>
                                    {file.language && (
                                        <span className="inline-block text-[9px] font-black bg-electric-blue/10 text-electric-blue px-2.5 py-0.5 rounded border border-electric-blue/20 uppercase tracking-[0.2em]">
                                            {file.language}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Resource Details Section */}
                            <div className="space-y-5">
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1">Resource Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#0c1018] p-5 rounded-2xl border border-slate-800/50 space-y-1">
                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Created</span>
                                        <p className="text-sm font-bold text-slate-300">{new Date(file.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-[#0c1018] p-5 rounded-2xl border border-slate-800/50 space-y-1">
                                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Size</span>
                                        <p className="text-sm font-bold text-slate-300">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tags Section */}
                            <div className="space-y-5">
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1">Tags</h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {file.tags?.map((tag, i) => (
                                        <span key={i} className="text-[10px] font-bold bg-[#111622] text-slate-400 px-3 py-1.5 rounded-xl border border-slate-800">
                                            {tag}
                                        </span>
                                    ))}
                                    {(!file.tags || file.tags.length === 0) && <span className="text-[10px] text-slate-700 italic">No tags assigned</span>}
                                </div>
                            </div>

                            {/* Action Buttons: Explicitly styled and placed */}
                            <div className="space-y-4 pt-10 mt-auto">
                                <Button 
                                    onClick={() => handleAiAction('explain')}
                                    disabled={aiLoading}
                                    className="w-full h-14 justify-start gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:brightness-110 rounded-2xl px-6 transition-all shadow-lg border-none"
                                >
                                    {aiLoading && activeAction === 'explain' ? <Loader2 size={20} className="animate-spin" /> : <Brain size={20} />}
                                    <span className="text-sm font-bold tracking-tight">Explain this file</span>
                                </Button>
                                <Button 
                                    onClick={() => handleAiAction('summarize')}
                                    disabled={aiLoading}
                                    className="w-full h-14 justify-start gap-4 bg-[#0c1018] hover:bg-[#141a26] text-slate-300 hover:text-white border border-slate-800 rounded-2xl px-6 transition-all"
                                >
                                    {aiLoading && activeAction === 'summarize' ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    <span className="text-sm font-bold tracking-tight">Summarize</span>
                                </Button>
                                <Button 
                                    onClick={() => handleAiAction('viva')}
                                    disabled={aiLoading}
                                    className="w-full h-14 justify-start gap-4 bg-[#0c1018] hover:bg-[#141a26] text-slate-300 hover:text-white border border-slate-800 rounded-2xl px-6 transition-all"
                                >
                                    {aiLoading && activeAction === 'viva' ? <Loader2 size={20} className="animate-spin" /> : <HelpCircle size={20} />}
                                    <span className="text-sm font-bold tracking-tight">Viva Q&A</span>
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Right Panel: Scrollable content container */}
                    <main className="flex-1 bg-[#04060b] flex flex-col h-full overflow-hidden">
                        {/* Fixed Header */}
                        <header className="h-24 px-12 flex items-center justify-between border-b border-slate-900 shrink-0 bg-[#04060b]/90 backdrop-blur-md z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <Layers size={22} />
                                </div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Resource Intelligence Console</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="p-3 text-slate-500 hover:text-white transition-colors bg-slate-900/50 rounded-xl border border-slate-800">
                                    <X size={24} />
                                </button>
                            </div>
                        </header>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-12 space-y-16">
                            {/* Source Content */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Code size={16} className="text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Source Code & Content</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleDownload}
                                        className="text-[10px] text-slate-500 hover:text-blue-400 uppercase font-black tracking-widest"
                                    >
                                        <Download size={14} className="mr-2" /> Download Original
                                    </Button>
                                </div>
                                <div className="w-full">
                                    {renderPreviewContent()}
                                </div>
                            </section>

                            {/* Intelligence Section */}
                            <section id="ai-response-anchor" className="pt-16 border-t border-slate-900/80 space-y-10 pb-20">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue border border-electric-blue/20">
                                            <Brain size={22} />
                                        </div>
                                        <h3 className="text-xs font-black text-slate-200 uppercase tracking-[0.4em]">AI Intelligence Response</h3>
                                    </div>
                                    {aiResponse && !aiLoading && (
                                        <div className="flex items-center gap-3">
                                            <button onClick={copyToClipboard} className="p-2.5 text-slate-500 hover:text-blue-400 transition-colors bg-slate-900/50 rounded-lg border border-slate-800">
                                                <Copy size={18} />
                                            </button>
                                            <button onClick={() => handleAiAction(activeAction as any)} className="p-2.5 text-slate-500 hover:text-blue-400 transition-colors bg-slate-900/50 rounded-lg border border-slate-800">
                                                <RefreshCw size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {aiLoading ? (
                                    <div className="py-32 flex flex-col items-center justify-center gap-8">
                                        <Loader2 size={56} className="animate-spin text-blue-500" />
                                        <div className="text-center space-y-3">
                                            <span className="text-xs font-black text-blue-500 uppercase tracking-[0.5em] block animate-pulse">Sequencing Neural Pathways</span>
                                        </div>
                                    </div>
                                ) : aiResponse ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        <div className="w-full glass-panel p-12 border-blue-500/20 bg-blue-500/[0.03] rounded-[2rem]">
                                            <div 
                                                className="prose prose-invert prose-sm max-w-none text-slate-300 leading-[1.8] prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-strong:text-blue-400"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(aiResponse) as any) }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-32 flex flex-col items-center justify-center gap-8 opacity-10">
                                        <Brain size={48} className="text-slate-700" />
                                        <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Neural Link Awaiting Input</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}
