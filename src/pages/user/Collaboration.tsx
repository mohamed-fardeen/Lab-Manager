import React from 'react';
import { 
  Send, 
  Trash, 
  Download, 
  FileText, 
  RefreshCcw, 
  ShieldAlert,
  MessageSquare,
  User,
  Clock
} from 'lucide-react';
import { Button } from "../../components/ui/button";
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
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide min-h-[400px]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
             <MessageSquare size={48} strokeWidth={1} />
             <p className="text-sm italic">No intelligence logs in the current stream.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender_id === selectedUser ? 'items-end' : 'items-start'} animate-in`}>
            <div className="flex items-center gap-2 mb-1 px-2">
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">{msg.sender_name}</span>
              <span className="text-[8px] text-slate-700">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={`max-w-[80%] space-y-3 ${msg.sender_id === selectedUser ? 'items-end' : 'items-start'}`}>
              {/* Text Content */}
              {msg.content && msg.content.replace(/\[\[SHARE:.*?\]\]/g, '').trim() && (
                <div className={`p-4 rounded-2xl ${msg.sender_id === selectedUser ? 'bg-electric-blue text-white rounded-tr-none shadow-blue-glow' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                  <div 
                    className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content.replace(/\[\[SHARE:.*?\]\]/g, '')) as any) }} 
                  />
                </div>
              )}

              {/* Interactive Share Blocks */}
              {msg.content.match(/\[\[SHARE:.*?\]\]/g)?.map((share: string, idx: number) => {
                const parts = share.replace('[[SHARE:', '').replace(']]', '').split('|');
                const name = parts[0];
                const url = parts[1];
                const id = parts[2];
                return (
                  <div key={idx} className="glass-panel p-4 border-slate-800 bg-slate-900/80 w-full min-w-[280px] animate-in group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Lab Record</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => downloadFileFromUrl(url, name)}
                        className="flex-1 h-9 bg-slate-800 hover:bg-slate-700 text-white border-none text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Download size={14} className="mr-2" /> Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCloningFileId(id)}
                        className="flex-1 h-9 border-slate-800 hover:border-electric-blue hover:bg-electric-blue/10 text-slate-400 hover:text-electric-blue text-[10px] font-bold uppercase tracking-widest"
                      >
                        Clone
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 md:p-6 bg-slate-950/40 border-t border-slate-800 backdrop-blur-xl shrink-0">
        <div className="relative group">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Broadcast a message or intelligence report..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 pr-16 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-electric-blue/30 focus:border-electric-blue transition-all min-h-[80px] resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatMessage.trim()}
            className={`absolute bottom-4 right-4 p-3 rounded-xl transition-all ${chatMessage.trim() ? 'bg-electric-blue text-white shadow-blue-glow hover:scale-105' : 'bg-slate-800 text-slate-600'}`}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
           <div className="flex items-center gap-2">
              <ShieldAlert size={12} className="text-amber-500/50" />
              <span>Broadcast Protocol Active</span>
           </div>
           <button onClick={loadMessages} className="hover:text-electric-blue transition-colors flex items-center gap-1">
              <RefreshCcw size={10} /> Refresh Stream
           </button>
        </div>
      </div>
    </div>
  );
};

export default Collaboration;
