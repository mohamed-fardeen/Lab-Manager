import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  MessageSquare, 
  User, 
  Clock, 
  CheckSquare, 
  Square, 
  AlertCircle,
  RefreshCcw,
  Search,
  MoreVertical,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from "../ui/button";
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  profiles: { name: string, rrn: string };
  created_at: string;
  file_ids?: string[];
}

const BroadcastManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/messages');
      setMessages(res.messages);
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
      await api.post('/messages', { content: newMessage }); // Reuse existing message endpoint
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Failed to broadcast intelligence:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm('Purge this message from the global stream?')) return;
    try {
      await api.delete(`/admin/message/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (error) {
      console.error('Purge failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Initiate mass purge of ${selectedIds.length} messages?`)) return;
    try {
      await api.post('/admin/messages/delete', { ids: selectedIds });
      setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Mass purge failed:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map(m => m.id));
    }
  };

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.profiles.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-electric-blue/10 border-t-electric-blue rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Decoding Broadcast History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-white">
            Intelligence Broadcast
          </h2>
          <p className="text-slate-500 text-sm mt-1">Global command center for laboratory announcements and data dissemination.</p>
        </div>
        <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
                <Button 
                    variant="destructive" 
                    onClick={handleBulkDelete}
                    className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] bg-rose-500 hover:bg-white hover:text-rose-500 text-white transition-all shadow-rose-glow"
                >
                    <Trash2 size={16} className="mr-2" />
                    Mass Purge ({selectedIds.length})
                </Button>
            )}
            <Button variant="outline" onClick={fetchMessages} className="border-slate-800 rounded-xl h-12 w-12 p-0">
                <RefreshCcw size={18} />
            </Button>
        </div>
      </div>

      {/* Message Composer */}
      <div className="glass-panel p-6 border-slate-800 bg-electric-blue/5 border-l-2 border-l-electric-blue">
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-electric-blue">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Command Input</span>
            </div>
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type protocol announcement to broadcast to all researchers..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-electric-blue outline-none transition-all min-h-[100px] resize-none"
                    />
                </div>
                <Button 
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="h-auto px-8 bg-electric-blue hover:bg-white hover:text-electric-blue text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-blue-glow transition-all"
                >
                    {isSending ? <RefreshCcw size={20} className="animate-spin" /> : <Send size={20} />}
                    <span className="ml-2 hidden md:inline">Transmit</span>
                </Button>
            </div>
        </div>
      </div>

      {/* Message List */}
      <div className="glass-panel border-slate-800 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={toggleSelectAll} className="text-slate-500 hover:text-electric-blue transition-colors">
                    {selectedIds.length === filteredMessages.length && filteredMessages.length > 0 ? <CheckSquare size={20} className="text-electric-blue" /> : <Square size={20} />}
                </button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">Stream History</h3>
            </div>
            <div className="relative group min-w-[300px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-electric-blue transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-electric-blue transition-all"
                />
            </div>
        </div>

        <div className="divide-y divide-slate-800/50">
            <AnimatePresence mode="popLayout">
                {filteredMessages.map((msg) => (
                    <motion.div 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -100 }}
                        key={msg.id} 
                        className={`p-6 flex gap-4 hover:bg-slate-800/20 transition-all group ${selectedIds.includes(msg.id) ? 'bg-electric-blue/5 border-l-2 border-l-electric-blue' : ''}`}
                    >
                        <button onClick={() => toggleSelect(msg.id)} className="mt-1 text-slate-600 hover:text-electric-blue transition-colors">
                            {selectedIds.includes(msg.id) ? <CheckSquare size={18} className="text-electric-blue" /> : <Square size={18} />}
                        </button>
                        
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-electric-blue uppercase">
                                        {msg.profiles?.name?.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">{msg.profiles?.name}</span>
                                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{msg.profiles?.rrn}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <Clock size={12} />
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteSingle(msg.id)}
                                        className="text-slate-700 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {filteredMessages.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-700 space-y-4">
                    <MessageSquare size={48} strokeWidth={1} />
                    <p className="text-sm italic font-medium">No broadcast sequences found in history.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastManager;
