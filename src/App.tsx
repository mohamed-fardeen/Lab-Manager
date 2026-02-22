import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Users,
  Plus,
  Trash2,
  Folder,
  RefreshCcw,
  MessageSquare,
  Send,
  FileText,
  Download,
  ArrowLeft,
  X,
  PlusCircle,
  FolderPlus,
  Zap,
  MoreVertical,
  ChevronRight,
  FileIcon,
  Search,
  LayoutDashboard
} from 'lucide-react';

/* shadcn-like components (assuming they are set up or I fulfill their role) */
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  _id: string;
  name: string;
}

interface Folder {
  _id: string;
  name: string;
  parentId?: string;
  created: number;
  userId: string;
}

interface FileItem {
  _id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  added: number;
  folderId: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<FileItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');

  useEffect(() => {
    loadUsers();
  }, []);

  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedUser && selectedUser !== lastUserId.current) {
      loadFolders(selectedUser);
      lastUserId.current = selectedUser;
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder.toString());
    } else {
      setFiles([]);
    }
  }, [selectedFolder]);

  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders(userId: string) {
    try {
      const res = await fetch(`/api/folders/${userId}`);
      const data = await res.json();
      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  async function loadFiles(folderId: string) {
    try {
      const res = await fetch(`/api/files/${folderId}`);
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  async function addUser() {
    const name = prompt('Researcher Name:');
    if (name) {
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        loadUsers();
      } catch (error) {
        console.error('Error adding user:', error);
      }
    }
  }

  async function deleteUser(id: string) {
    if (confirm('Permanently delete researcher profile and all associated lab works?')) {
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        loadUsers();
        setSelectedUser(null);
        setSelectedFolder(null);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || !selectedFolder) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: base64,
              added: Date.now(),
              folderId: selectedFolder
            })
          });
          loadFiles(selectedFolder.toString());
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async function deleteFile(fileId: string) {
    if (!selectedFolder) return;
    if (confirm('Delete lab record?')) {
      try {
        await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
        loadFiles(selectedFolder.toString());
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  }

  function downloadFile(file: FileItem) {
    const link = document.createElement('a');
    link.href = `data:${file.type};base64,${file.data}`;
    link.download = file.name;
    link.click();
  }

  const onSendMessage = async () => {
    if (!chatMessage.trim() || !selectedUser) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          userId: selectedUser,
          folderId: selectedFolder,
          model: selectedModel,
          history: chatHistory
        })
      });

      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Collaboration interrupted. Please retry.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const currentFolders = folders.filter(f => f.parentId === (selectedFolder || undefined));
  const currentFiles = files.filter(f => f.folderId === (selectedFolder || undefined));
  const canUpload = selectedFolder && !folders.some(f => f.parentId === selectedFolder);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-deep-slate">
        <RefreshCcw className="animate-spin text-electric-blue mb-4" size={48} />
        <p className="text-slate-400 font-medium">Calibrating Lab Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-deep-slate text-slate-100 overflow-hidden font-sans">
      {/* Sidebar: Users/Researchers */}
      <aside className="w-80 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 flex items-center gap-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-electric-blue/10 flex items-center justify-center">
            <LayoutDashboard className="text-electric-blue" size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Lab Manager</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Researchers</span>
            <Button variant="ghost" size="icon" onClick={addUser} className="h-8 w-8 hover:bg-electric-blue/10 hover:text-electric-blue">
              <Plus size={18} />
            </Button>
          </div>

          <div className="space-y-1">
            {users.map(user => (
              <div
                key={user._id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${selectedUser === user._id
                    ? 'bg-electric-blue text-white shadow-blue-glow active-scale'
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-100'
                  }`}
                onClick={() => { setSelectedUser(user._id.toString()); setSelectedFolder(null); }}
              >
                <Avatar className="h-8 w-8 border-2 border-slate-800 shadow-sm">
                  <AvatarFallback className={selectedUser === user._id ? 'bg-white text-electric-blue' : 'bg-slate-800 text-slate-400'}>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold flex-1 truncate">{user.name}</span>
                {selectedUser === user._id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); deleteUser(user._id); }}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-900/40 relative">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {selectedFolder && (
              <Button variant="outline" size="sm" onClick={() => setSelectedFolder(null)} className="rounded-full border-slate-800 hover:border-electric-blue/50 hover:bg-electric-blue/5">
                <ArrowLeft size={16} className="mr-2" /> Back
              </Button>
            )}
            <h1 className="text-xl font-bold">
              {selectedFolder ? folders.find(f => f._id === selectedFolder)?.name : (selectedUser ? 'Lab Categories' : 'Select Researcher')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {selectedUser && (
              <Button variant="outline" size="sm" onClick={() => { if (selectedUser) loadFolders(selectedUser); if (selectedFolder) loadFiles(selectedFolder); }} className="rounded-full border-slate-800">
                <RefreshCcw size={16} />
              </Button>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <Users size={80} className="text-slate-600 mb-6" />
              <h2 className="text-2xl font-bold mb-2">Researcher Profile Required</h2>
              <p className="max-w-xs text-center">Select a profile from the left sidebar to access lab recordings and analysis.</p>
            </div>
          ) : (
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* Category Selection Grid */}
              {!selectedFolder && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentFolders.map(folder => (
                    <div
                      key={folder._id}
                      className="glass-panel p-6 hover-glow cursor-pointer group flex items-start gap-4 animate-in"
                      onClick={() => setSelectedFolder(folder._id)}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center transition-colors group-hover:bg-electric-blue/10">
                        <Folder className="text-slate-500 group-hover:text-electric-blue" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">{folder.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{new Date(folder.created).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-700 group-hover:text-electric-blue self-center" />
                    </div>
                  ))}
                  <Button variant="outline" className="h-auto border-dashed border-2 border-slate-800 py-6 rounded-2xl hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all text-slate-500 hover:text-electric-blue" onClick={() => {/* Add category logic */ }}>
                    <FolderPlus className="mr-2" /> New Category
                  </Button>
                </div>
              )}

              {/* File List Grid */}
              {selectedFolder && (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {canUpload && (
                    <label className="glass-panel p-10 border-dashed border-2 border-slate-800 hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-electric-blue animate-in">
                      <PlusCircle size={40} />
                      <span className="font-bold tracking-tight">Upload Lab Results</span>
                      <span className="text-xs opacity-60">PDF, Images, or Data files</span>
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}

                  {currentFiles.map(file => (
                    <div key={file._id} className="glass-panel overflow-hidden hover-glow animate-in" onClick={() => file.type.startsWith('image/') && setLightbox(file)}>
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {file.type.startsWith('image/') ? (
                          <img src={`data:${file.type};base64,${file.data}`} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <FileText size={48} className="text-slate-700" />
                            <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">{file.type.split('/')[1] || 'DATA'}</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); downloadFile(file); }}>
                            <Download size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div className="flex-1 truncate pr-4">
                          <h3 className="font-bold truncate text-sm">{file.name}</h3>
                          <p className="text-[10px] text-slate-500 font-mono tracking-taller">{(file.size / 1024).toFixed(1)} KB • {new Date(file.added).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); deleteFile(file._id); }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* AI Sidebar: Intelligence Panel */}
      <aside className="ai-sidebar-container shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-electric-blue flex items-center justify-center shadow-blue-glow">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <h2 className="font-bold tracking-tight">Intelligence</h2>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-3 text-[10px] font-bold text-slate-400 focus:ring-1 focus:ring-electric-blue outline-none transition-all"
          >
            <option value="llama-3.3-70b-versatile">Llama 3.3</option>
            <option value="llama-3.2-11b-vision-preview">Vision 3.2</option>
          </select>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {chatHistory.length === 0 ? (
              <div className="py-10 text-center space-y-4 px-6">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="text-slate-700" size={28} />
                </div>
                <h3 className="font-bold text-slate-300">Analyzer Online</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Ask Lab-Bot to interpret screenshots, generate code snippets, or automate category organization.</p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex flex-col animate-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[90%] text-sm ${msg.role === 'user'
                      ? 'bg-electric-blue text-white rounded-tr-none shadow-blue-glow'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none prose'
                    }`}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(msg.content) as string) }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 mt-2 uppercase tracking-widest">{msg.role === 'user' ? 'Scientist' : 'Lab-Bot'}</span>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-electric-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-end gap-3 glass-panel p-2 focus-within:ring-1 focus-within:ring-electric-blue transition-all">
            <textarea
              placeholder="Query Lab-Bot..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
              className="flex-1 bg-transparent border-none text-slate-100 text-sm p-3 outline-none resize-none max-h-32 min-h-[44px] font-medium"
            />
            <Button
              size="icon"
              onClick={onSendMessage}
              disabled={!chatMessage.trim() || !selectedUser}
              className="h-10 w-10 bg-electric-blue hover:bg-white hover:text-electric-blue transition-all shadow-blue-glow rounded-xl"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Lightbox Enhancement */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-8 transition-all animate-in"
          onClick={() => setLightbox(null)}
        >
          <Button variant="outline" size="icon" className="absolute top-8 right-8 rounded-full border-slate-800 bg-slate-900 transition-transform hover:scale-110">
            <X size={24} />
          </Button>
          <img
            src={`data:${lightbox.type};base64,${lightbox.data}`}
            alt={lightbox.name}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-blue-glow ring-1 ring-white/10"
          />
        </div>
      )}
    </div>
  );
}

export default App;
