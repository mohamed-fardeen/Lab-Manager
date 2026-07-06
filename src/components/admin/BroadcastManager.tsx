import React, { useState, useEffect } from 'react';
import {
  Send,
  Trash2,
  MessageSquare,
  RefreshCcw,
  Search,
  MoreVertical,
  Zap,
  Plus
} from 'lucide-react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  profiles: { name: string; rrn: string };
  created_at: string;
}

const BroadcastManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/messages');
      setMessages(res.messages || []);
    } catch (error) {
      console.error('Failed to sync broadcast stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setIsSending(true);
      await api.post('/messages', { content: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Failed to broadcast intelligence:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Purge this intelligence record from the global stream?')) return;
    try {
      await api.delete(`/admin/message/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Purge failed:', error);
    }
  };

  const filteredMessages = (messages || []).filter(m =>
    (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.profiles?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.5em] animate-pulse">Synchronizing stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 h-[calc(100vh-160px)] animate-in fade-in duration-700">
      <section className="flex-1 flex flex-col app-surface-raised rounded-xl border border-border overflow-hidden">
        {/* Stream Header */}
        <div className="p-8 border-b border-border flex items-center justify-between bg-gradient-to-r from-surface-raised to-surface">
          <div>
            <span className="eyebrow">№ D1 — Communications</span>
            <h2 className="mt-3 text-3xl font-display font-medium tracking-tight text-foreground">
              Intelligence Broadcast
            </h2>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Administrative Command Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background border border-border rounded-full py-2 pl-9 pr-4 text-xs font-mono tracking-wide text-foreground focus:outline-none focus:border-primary transition-all w-64 placeholder:text-muted-foreground"
              />
            </div>
            <button onClick={fetchMessages} className="p-2.5 rounded-md bg-surface-overlay border border-border text-muted-foreground hover:text-primary transition-all hover:border-primary/40">
              <RefreshCcw size={16} />
            </button>
            <button className="p-2.5 rounded-md bg-surface-overlay border border-border text-muted-foreground hover:text-primary transition-all hover:border-primary/40">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth bg-background">
          <AnimatePresence mode="popLayout">
            {filteredMessages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 space-y-6">
                  <MessageSquare size={64} strokeWidth={0.5} />
                  <p className="font-display text-sm italic text-center">No broadcast sequences found in history.</p>
               </div>
            ) : filteredMessages.map((msg) => (
              <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={msg.id}
                className="flex items-start gap-5 group"
              >
                <div className="mt-1 w-10 h-10 rounded-md bg-surface-raised border border-border flex items-center justify-center text-primary group-hover:border-primary/40 transition-all font-display font-medium text-xs">
                  {msg.profiles?.name?.charAt(0) || 'L'}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground tracking-tight">{msg.profiles?.name || 'LAB_SYSTEM'}</span>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="bg-surface-raised p-5 rounded-md border border-border group-hover:border-primary/20 transition-all">
                    <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Administrative Input Footer */}
        <div className="p-8 bg-surface border-t border-border">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Zap size={14} />
            <span className="font-mono text-[9px] uppercase tracking-[0.22em]">Authorized broadcast protocol active</span>
          </div>
          <div className="relative flex items-center bg-surface-raised border border-border rounded-md focus-within:border-primary transition-all p-1.5 group">
            <button className="p-3 text-muted-foreground hover:text-primary transition-colors">
              <Plus size={20} />
            </button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              className="flex-1 bg-transparent border-none text-foreground text-sm focus:ring-0 placeholder:text-muted-foreground/60 font-medium tracking-wide"
              placeholder="Broadcast command to all researchers..."
              type="text"
            />
            <button className="p-3 text-muted-foreground hover:text-primary transition-colors">
              <MessageSquare size={20} />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
              className={`ml-2 px-6 py-2.5 rounded font-mono text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all duration-300 ${newMessage.trim() ? 'bg-primary text-primary-foreground hover:bg-foreground hover:text-background' : 'bg-surface-overlay text-muted-foreground'}`}
            >
              {isSending ? (
                <RefreshCcw size={14} className="animate-spin" />
              ) : (
                <>
                  Transmit
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BroadcastManager;