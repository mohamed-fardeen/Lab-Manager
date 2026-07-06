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
  Layers,
  Copy,
  RefreshCw,
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

    const highlightCode = (code: string) => {
        if (!code) return '';
        let escaped = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Field Journal code highlight palette — readable on dark editor surface
        const patterns = [
            { name: 'comment', regex: /(#.*|\/\/.*)/g, color: '#8a7f6e' },
            { name: 'string', regex: /(&quot;.*?&quot;|&#039;.*?&#039;)/g, color: '#C99A3B' },
            { name: 'keyword', regex: /\b(def|import|from|class|if|else|elif|try|except|finally|return|as|with|yield|await|async|for|while|in|is|not|and|or|lambda|None|True|False)\b/g, color: '#67E8F9' },
            { name: 'function', regex: /\b([a-zA-Z_]\w*)(?=\s*\()/g, color: '#FAF6EC' }
        ];

        let highlighted = escaped;
        patterns.forEach(p => {
            highlighted = highlighted.replace(p.regex, (match) => `<span style="color: ${p.color}">${match}</span>`);
        });

        return highlighted;
    };

    const renderPreviewContent = () => {
        const isProgram = file.language || file.file_type === 'program';
        const isRecord = file.file_type === 'application/pdf' || file.tags?.includes('record');
        const isScreenshot = file.file_type.startsWith('image/') || file.tags?.includes('screenshot');

        if (isProgram) {
            return (
                <div className="flex flex-col w-full animate-in fade-in zoom-in duration-500">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xl font-display font-medium tracking-tight text-foreground">Source Code & Content</h3>
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{file.language || 'code'} 3.11</span>
                            <button onClick={() => { navigator.clipboard.writeText(file.content || ''); alert('Code copied'); }} className="text-muted-foreground hover:text-primary transition-colors">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Code editor surface — kept dark intentionally for editor feel */}
                    <div className="bg-[#1A1714] rounded-xl border border-border overflow-hidden shadow-xl">
                        <div className="bg-[#0F0F0F] h-10 px-4 flex items-center relative border-b border-[#2A2520]">
                            <div className="flex gap-1.5 z-10">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/60"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/60"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/60"></span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">{file.name}</span>
                            </div>
                        </div>
                        <div className="p-8 font-mono text-[13px] leading-relaxed overflow-x-auto selection:bg-primary/30 min-h-[400px]">
                            <pre className="whitespace-pre">
                                <code dangerouslySetInnerHTML={{ __html: highlightCode(file.content || '# No content extracted') }} />
                            </pre>
                        </div>
                    </div>
                </div>
            );
        }

        if (isRecord) {
            return (
                <div className="bg-surface rounded-xl border border-border overflow-hidden h-[800px] w-full">
                    <iframe src={`${file.url}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                </div>
            );
        }

        if (isScreenshot) {
            return (
                <div className="bg-surface rounded-xl border border-border overflow-hidden flex items-center justify-center p-4 w-full">
                    <img src={file.url} alt={file.name} className="max-w-full rounded-lg shadow-md" />
                </div>
            );
        }

        return <div className="p-10 flex items-center justify-center text-muted-foreground italic text-xs border border-dashed border-border rounded-xl w-full">No preview available for this resource</div>;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] app-surface border-border p-0 overflow-hidden rounded-xl shadow-2xl">
                <div className="flex h-full w-full overflow-hidden">
                    {/* Left Panel — paper-cream sidebar */}
                    <aside className="w-[380px] bg-surface border-r border-border flex flex-col shrink-0 h-full overflow-y-auto">
                        <div className="p-10 space-y-12 flex flex-col min-h-full pb-20">
                            {/* Header */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-md bg-surface-raised flex items-center justify-center text-primary border border-border">
                                    <FileText size={32} />
                                </div>
                                <div className="space-y-1.5 overflow-hidden">
                                    <h2 className="text-2xl font-display font-medium text-foreground leading-tight tracking-tight truncate">{file.name}</h2>
                                    {file.language && (
                                        <span className="inline-block font-mono text-[9px] bg-primary/10 text-primary px-2.5 py-0.5 rounded border border-primary/25 uppercase tracking-[0.18em]">
                                            {file.language}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Resource Details */}
                            <div className="space-y-5">
                                <span className="eyebrow">Resource Details</span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface-raised p-5 rounded-md border border-border space-y-1">
                                        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Created</span>
                                        <p className="text-sm font-display font-medium text-foreground">{new Date(file.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-surface-raised p-5 rounded-md border border-border space-y-1">
                                        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Size</span>
                                        <p className="text-sm font-display font-medium text-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-5">
                                <span className="eyebrow">Tags</span>
                                <div className="flex flex-wrap gap-2.5">
                                    {file.tags?.map((tag, i) => (
                                        <span key={i} className="font-mono text-[10px] bg-surface-raised text-foreground-muted px-3 py-1.5 rounded border border-border">
                                            {tag}
                                        </span>
                                    ))}
                                    {(!file.tags || file.tags.length === 0) && <span className="font-mono text-[10px] text-muted-foreground/60 italic">No tags assigned</span>}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="space-y-3 pt-10 mt-auto">
                                <Button
                                    onClick={() => handleAiAction('explain')}
                                    disabled={aiLoading}
                                    className={`w-full h-14 justify-start gap-4 rounded-md px-6 transition-all duration-300 font-medium text-sm ${activeAction === 'explain' ? 'bg-primary text-primary-foreground' : 'bg-surface-raised hover:bg-primary/8 text-foreground border border-border hover:border-primary/40'}`}
                                >
                                    {aiLoading && activeAction === 'explain' ? <Loader2 size={20} className="animate-spin" /> : <Brain size={20} />}
                                    Explain this file
                                </Button>
                                <Button
                                    onClick={() => handleAiAction('summarize')}
                                    disabled={aiLoading}
                                    className={`w-full h-14 justify-start gap-4 rounded-md px-6 transition-all duration-300 font-medium text-sm ${activeAction === 'summarize' ? 'bg-primary text-primary-foreground' : 'bg-surface-raised hover:bg-primary/8 text-foreground border border-border hover:border-primary/40'}`}
                                >
                                    {aiLoading && activeAction === 'summarize' ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    Summarize
                                </Button>
                                <Button
                                    onClick={() => handleAiAction('viva')}
                                    disabled={aiLoading}
                                    className={`w-full h-14 justify-start gap-4 rounded-md px-6 transition-all duration-300 font-medium text-sm ${activeAction === 'viva' ? 'bg-primary text-primary-foreground' : 'bg-surface-raised hover:bg-primary/8 text-foreground border border-border hover:border-primary/40'}`}
                                >
                                    {aiLoading && activeAction === 'viva' ? <Loader2 size={20} className="animate-spin" /> : <HelpCircle size={20} />}
                                    Viva Q&amp;A
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Right Panel — scrollable content */}
                    <main className="flex-1 bg-background flex flex-col h-full overflow-hidden">
                        {/* Fixed Header */}
                        <header className="h-24 px-12 flex items-center justify-between border-b border-border shrink-0 app-topbar z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-surface-overlay flex items-center justify-center text-primary border border-border">
                                    <Layers size={20} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="eyebrow">Console</span>
                                    <span className="h-3 w-px bg-border" />
                                    <h3 className="text-sm font-display tracking-tight text-foreground">Resource Intelligence</h3>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 text-muted-foreground hover:text-foreground transition-colors bg-surface-overlay rounded-md border border-border">
                                <X size={20} />
                            </button>
                        </header>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-12 space-y-16">
                            {/* Source Content */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Code size={16} className="text-primary" />
                                        <span className="eyebrow">Source Code &amp; Content</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDownload}
                                        className="font-mono text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest"
                                    >
                                        <Download size={14} className="mr-2" /> Download Original
                                    </Button>
                                </div>
                                <div className="w-full">
                                    {renderPreviewContent()}
                                </div>
                            </section>

                            {/* Intelligence Section */}
                            <section id="ai-response-anchor" className="pt-16 border-t border-border space-y-10 pb-20">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/25">
                                            <Brain size={20} />
                                        </div>
                                        <div>
                                            <span className="eyebrow">AI Response</span>
                                            <h3 className="text-sm font-display tracking-tight text-foreground mt-1">Intelligence Sequence</h3>
                                        </div>
                                    </div>
                                    {aiResponse && !aiLoading && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={copyToClipboard} className="p-2.5 text-muted-foreground hover:text-primary transition-colors bg-surface-overlay rounded-md border border-border">
                                                <Copy size={16} />
                                            </button>
                                            <button onClick={() => handleAiAction(activeAction as any)} className="p-2.5 text-muted-foreground hover:text-primary transition-colors bg-surface-overlay rounded-md border border-border">
                                                <RefreshCw size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {aiLoading ? (
                                    <div className="py-32 flex flex-col items-center justify-center gap-8">
                                        <Loader2 size={56} className="animate-spin text-primary" />
                                        <span className="font-mono text-xs text-primary uppercase tracking-[0.5em] block animate-pulse">Sequencing neural pathways</span>
                                    </div>
                                ) : aiResponse ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        <div className="glass-panel p-12 border-primary/20 rounded-md">
                                            <div
                                                className="prose prose-sm max-w-none text-foreground leading-[1.8] prose-headings:text-foreground prose-headings:font-display prose-strong:text-primary"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(aiResponse) as any) }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-32 flex flex-col items-center justify-center gap-8 opacity-30">
                                        <Brain size={48} className="text-muted-foreground/40" />
                                        <p className="font-mono text-xs text-muted-foreground/60 uppercase tracking-[0.3em]">Neural link awaiting input</p>
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