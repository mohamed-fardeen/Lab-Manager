import React from 'react';
import {
  Send,
  Download,
  FileText,
  RefreshCcw,
  MoreVertical,
  Plus,
  MessageSquare,
  Code,
  Terminal,
  Smile,
  Video,
  Eye,
  Pin,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface CollaborationProps {
  messages: any[];
  selectedUser: string | null;
  deleteMessage: (id: string) => void;
  downloadFileFromUrl: (url: string, name: string) => void;
  setCloningFileId: (id: string) => void;
  chatMessage: string;
  setChatMessage: (val: string) => void;
  handleSendMessage: () => void;
  loadMessages: () => void;
}

const Collaboration: React.FC<CollaborationProps> = ({
  messages,
  selectedUser,
  deleteMessage,
  downloadFileFromUrl,
  setCloningFileId,
  chatMessage,
  setChatMessage,
  handleSendMessage,
  loadMessages
}) => {
  return (
    <div className="flex flex-1 min-w-0 h-[calc(100vh-64px)] -m-4 md:-m-8 app-bg font-sans overflow-hidden">
      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">

        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 app-topbar flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="eyebrow">Correspondence</span>
            <span className="h-3 w-px bg-border" />
            <h2 className="text-sm font-display text-foreground tracking-tight">Laboratory Intelligence Interface</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-primary/8 text-primary rounded text-[10px] font-mono uppercase tracking-widest border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Session 04:22:15
            </div>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-surface-overlay/60">
              <Video size={16} />
            </button>
            <button onClick={loadMessages} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-surface-overlay/60">
              <RefreshCcw size={16} />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-surface-overlay/60">
              <MoreVertical size={16} />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col space-y-6 bg-background">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-2xl font-display font-medium tracking-tight text-foreground">Collaboration Stream</h3>
              <div className="flex items-center mt-2 gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">3 Active Researchers</span>
              </div>
            </div>
          </div>

          <div className="ink-rule" />

          {!messages || messages.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 space-y-4">
                <Terminal size={48} className="text-muted-foreground/40" />
                <p className="font-mono text-[10px] tracking-widest uppercase">Initializing correspondence feed...</p>
             </div>
          ) : messages.map((msg, idx) => {
            const isSystem = msg?.sender_name === 'LAB_SYSTEM' || msg?.is_system;
            const isMe = msg?.sender_id === selectedUser;
            const textContent = msg?.content?.replace(/\[\[SHARE:.*?\]\]/g, '').trim();
            const hasShares = msg?.content?.match(/\[\[SHARE:.*?\]\]/g);

            return (
              <div key={msg?.id || idx} className={`flex flex-col space-y-2 group animate-in ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-display font-medium border ${isSystem ? 'bg-surface-overlay text-rule border-rule/30' : isMe ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface-raised text-foreground border-border'}`}>
                    {msg?.sender_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-foreground tracking-tight">{msg?.sender_name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{msg?.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>

                <div className={`max-w-2xl w-full flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {textContent && (
                    <div className={isMe ? 'app-msg-own p-3 text-sm leading-relaxed' : 'app-msg-other p-3 text-sm leading-relaxed'}>
                       <div className="prose prose-sm max-w-none text-foreground"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(textContent) as string) }}
                       />
                    </div>
                  )}

                  {hasShares?.map((share: string, sIdx: number) => {
                    const parts = share.replace('[[SHARE:', '').replace(']]', '').split('|');
                    const name = parts[0];
                    const url = parts[1];
                    const id = parts[2];
                    const isCode = name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.cpp');
                    const isNewest = sIdx === 0 && idx === messages.length - 1;

                    return (
                      <div key={sIdx} className={`specimen-card mt-3 w-full max-w-2xl relative group-hover:border-primary/40 ${isNewest ? 'border-primary/50' : ''}`}>
                        {isNewest && (
                          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-mono font-medium px-2 py-0.5 tracking-widest">Newest</span>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${isNewest ? 'bg-primary/10' : 'bg-surface-overlay'} border border-border`}>
                              {isCode ? <Code size={20} className="text-primary" /> : <Terminal size={20} className="text-primary" />}
                            </div>
                            <div>
                              <p className="text-xs font-mono font-medium tracking-wide text-foreground">{name}</p>
                              <p className={`font-mono text-[10px] ${isNewest ? 'text-primary/70' : 'text-muted-foreground'}`}>{isCode ? 'Python' : 'Executable'} · 12.4 KB</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => setCloningFileId(id)} className="p-2 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors">
                               <Eye size={16} />
                             </button>
                             <button onClick={() => downloadFileFromUrl(url, name)} className="p-2 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors">
                               <Download size={16} />
                             </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Combined Input Footer */}
        <div className="p-6 app-topbar border-t border-border">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Plus size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              className="w-full app-input pl-12 pr-24 font-mono tracking-wider uppercase placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Type a message or drop files..."
              type="text"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Smile size={18} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage?.trim()}
                className={`bg-primary hover:bg-foreground text-primary-foreground px-4 py-1.5 rounded flex items-center gap-2 transition-all duration-300 ${!chatMessage?.trim() && 'opacity-50'}`}
              >
                <span className="text-[10px] font-medium uppercase tracking-widest">Send</span>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right Intelligence Sidebar ── */}
      <aside className="w-80 h-full border-l border-border bg-surface flex flex-col flex-shrink-0 font-sans">

        {/* Researchers Module */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="eyebrow">Active Researchers</h4>
            <span className="font-mono text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded tracking-widest uppercase">Online</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-medium text-xs uppercase">MF</div>
                  <div className="absolute bottom-0 right-0 h-2 w-2 bg-primary border-2 border-surface rounded-full" />
                </div>
                <span className="text-xs font-medium text-foreground">Mohamed Fardeen M</span>
              </div>
              <MessageSquare size={14} className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-rule/80 flex items-center justify-center text-primary-foreground font-display font-medium text-xs uppercase">SR</div>
                  <div className="absolute bottom-0 right-0 h-2 w-2 bg-primary border-2 border-surface rounded-full" />
                </div>
                <span className="text-xs font-medium text-foreground">Sarah Reed</span>
              </div>
              <MessageSquare size={14} className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div className="flex items-center justify-between group cursor-pointer opacity-60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-display font-medium text-xs uppercase">KJ</div>
                  <div className="absolute bottom-0 right-0 h-2 w-2 bg-muted-foreground border-2 border-surface rounded-full" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Karl Jenson</span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Away</span>
            </div>
          </div>
        </div>

        {/* Assets Module */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h4 className="eyebrow">Shared Assets</h4>
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{messages?.length || 0} Total</span>
          </div>
          <div className="space-y-2">
            {messages?.filter(m => m.content?.includes('[[SHARE:')).slice(0, 6).map((msg, i) => {
              const name = msg.content.match(/\[\[SHARE:(.*?)\|/)?.[1] || 'Asset';
              const isCode = name.endsWith('.py');
              return (
                <div key={i} className={`flex items-center p-2.5 rounded transition-all cursor-pointer border ${i === 0 ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-surface-raised border-border hover:border-primary/30'}`}>
                   {isCode ? (
                     <Terminal size={14} className={`mr-3 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                   ) : (
                     <FileText size={14} className="text-destructive mr-3" />
                   )}
                   <div className="flex-1 min-w-0">
                     <p className={`font-mono text-[11px] font-medium truncate ${i === 0 ? 'text-foreground' : 'text-foreground-muted'}`}>{name}</p>
                   </div>
                   {i === 0 ? (
                     <Shield size={12} className="text-primary" />
                   ) : (
                     <ChevronRight size={14} className="text-muted-foreground/60" />
                   )}
                </div>
              );
            })}
          </div>
          <button className="w-full mt-4 py-2 border border-border rounded text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-all">
             View File Archive
          </button>
        </div>

        {/* Pinned Module */}
        <div className="p-5 border-t border-border bg-surface-overlay/40">
          <div className="flex items-center gap-2 mb-3">
            <Pin size={14} className="text-primary" />
            <h4 className="eyebrow">Pinned Intelligence</h4>
          </div>
          <div className="space-y-3">
            <div className="p-3 border-l-2 border-primary bg-primary/5 rounded-r">
              <p className="text-[11px] font-medium leading-relaxed text-foreground">
                Critical timeout threshold identified at <span className="text-primary font-mono font-medium">250ms</span>. Adjust DNS routing scripts to compensate for jitter.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Pinned by @Mohamed</span>
                <X size={12} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
            </div>
            <div className="p-3 border-l-2 border-border bg-surface-overlay/40 rounded-r opacity-70">
              <p className="text-[11px] font-medium leading-relaxed text-foreground-muted italic font-display">
                "Wait for the PDF validation before pushing to production server."
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Pinned by @Sarah</span>
                <X size={12} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Collaboration;