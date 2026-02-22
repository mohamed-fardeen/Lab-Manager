import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import LandingPage from './components/LandingPage';
import {
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
  Zap,
  PenLine,
  ChevronRight,
  Settings,
  LogOut,
  Clock,
  Database,
  Home,
  Shield,
  Trash
} from 'lucide-react';

/* shadcn-like components (assuming they are set up or I fulfill their role) */
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface User {
  _id: string;
  name: string;
  rrn?: string;
  password?: string;
  role?: string;
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

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  file?: {
    _id: string;
    name: string;
    type: string;
  };
  files?: {
    _id: string;
    name: string;
    type: string;
  }[];
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<FileItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'recent' | 'settings' | 'collaboration' | 'admin'>('records');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginRrn, setLoginRrn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [globalMessage, setGlobalMessage] = useState('');
  const [sharingFileIds, setSharingFileIds] = useState<string[]>([]);
  const [cloningFileId, setCloningFileId] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type: 'prompt' | 'confirm';
    inputValue: string;
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'confirm', inputValue: '', onConfirm: () => { } });

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    item: { id: string; name: string; type: 'folder' | 'file' } | null;
  }>({ isOpen: false, x: 0, y: 0, item: null });

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLogin = async () => {
    if (!loginRrn || !loginPassword) return;
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rrn: loginRrn, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedUser(data.user._id);
        setIsAuthenticated(true);
        setIsAdmin(!!data.isAdmin);
        setLoginModalOpen(false);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Network error during authentication');
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPass || !newPass) return;
    try {
      const res = await fetch(`/api/users/${selectedUser}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      if (res.ok) {
        alert('Access Protocol updated successfully');
        setCurrentPass('');
        setNewPass('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update protocol');
      }
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setSelectedUser(null);
    setSelectedFolder(null);
    setLoginRrn('');
    setLoginPassword('');
  };

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const sendGlobalMessage = async () => {
    if (!globalMessage.trim() && sharingFileIds.length === 0) return;
    const user = users.find(u => u._id === selectedUser);
    const sharedFilesMetadata = sharingFileIds.map(fid => {
      const f = allFiles.find(af => af._id === fid);
      return f ? { _id: f._id, name: f.name, type: f.type } : null;
    }).filter(Boolean);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: selectedUser,
          senderName: user?.name || 'Researcher',
          content: globalMessage,
          files: sharedFilesMetadata
        })
      });
      setGlobalMessage('');
      setSharingFileIds([]);
      loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const clearAllMessages = async () => {
    if (!window.confirm('Are you sure you want to clear ALL messages globally?')) return;
    try {
      await fetch('/api/admin/messages', { method: 'DELETE' });
      loadMessages();
    } catch (err) {
      console.error('Error clearing messages:', err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
      loadMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const cloneFileToFolder = async (fileId: string, targetFolderId: string) => {
    try {
      const res = await fetch('/api/files/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, targetFolderId })
      });
      if (res.ok) {
        alert('Record synchronized to your folder successfully.');
        setCloningFileId(null);
        if (selectedUser) loadAllFiles(selectedUser);
      }
    } catch (err) {
      console.error('Error cloning file:', err);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    const handleClick = () => setContextMenu(prev => ({ ...prev, isOpen: false }));
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedUser && selectedUser !== lastUserId.current) {
      loadFolders(selectedUser);
      loadAllFiles(selectedUser);
      lastUserId.current = selectedUser;
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && (activeTab === 'dashboard' || activeTab === 'recent')) {
      loadAllFiles(selectedUser);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder.toString());
      setSelectedFiles([]);
    } else {
      setFiles([]);
      setSelectedFiles([]);
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

  async function loadAllFiles(userId: string) {
    try {
      const res = await fetch(`/api/files/user/${userId}`);
      const data = await res.json();
      setAllFiles(data);
    } catch (error) {
      console.error('Error loading all files:', error);
    }
  }


  async function addCategory() {
    const defaultName = selectedFolder ? 'New Sub-Category' : 'New Category';
    setModalConfig({
      isOpen: true,
      title: defaultName,
      description: `Enter a name for the ${defaultName.toLowerCase()}:`,
      type: 'prompt',
      inputValue: '',
      onConfirm: async (name) => {
        if (name && selectedUser) {
          try {
            await fetch('/api/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                userId: selectedUser,
                parentId: selectedFolder || null,
                created: Date.now()
              })
            });
            loadFolders(selectedUser);
          } catch (error) {
            console.error('Error adding category:', error);
          }
        }
      }
    });
  }

  async function renameFolder(id: string, currentName: string) {
    setModalConfig({
      isOpen: true,
      title: 'Rename Category',
      description: 'Enter a new name for this category.',
      type: 'prompt',
      inputValue: currentName,
      onConfirm: async (name) => {
        if (!name || name === currentName) return;
        try {
          await fetch(`/api/folders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (selectedUser) loadFolders(selectedUser);
        } catch (error) {
          console.error('Error renaming category:', error);
        }
      }
    });
  }

  async function deleteFolder(id: string) {
    setModalConfig({
      isOpen: true,
      title: 'Delete Category?',
      description: 'Are you sure you want to permanently delete this category?',
      type: 'confirm',
      inputValue: '',
      onConfirm: async () => {
        try {
          await fetch(`/api/folders/${id}`, { method: 'DELETE' });
          if (selectedUser) loadFolders(selectedUser);
          if (selectedFolder === id) setSelectedFolder(null);
        } catch (error) {
          console.error('Error deleting category:', error);
        }
      }
    });
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
    setModalConfig({
      isOpen: true,
      title: 'Delete lab record?',
      description: 'Are you sure you want to permanently delete this file?',
      type: 'confirm',
      inputValue: '',
      onConfirm: async () => {
        try {
          await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
          loadFiles(selectedFolder.toString());
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    });
  }

  async function renameFile(fileId: string, currentName: string) {
    setModalConfig({
      isOpen: true,
      title: 'Rename File',
      description: 'Enter a new name for this lab record.',
      type: 'prompt',
      inputValue: currentName,
      onConfirm: async (name) => {
        if (!name || name === currentName) return;
        try {
          await fetch(`/api/files/${fileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (selectedFolder) loadFiles(selectedFolder.toString());
        } catch (error) {
          console.error('Error renaming file:', error);
        }
      }
    });
  }

  function downloadFile(file: FileItem) {
    const link = document.createElement('a');
    link.href = `data:${file.type};base64,${file.data}`;
    link.download = file.name;
    link.click();
  }

  const toggleSelection = (id: string) => {
    setSelectedFiles(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const addSelection = (id: string) => {
    setSelectedFiles(prev =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  async function bulkDeleteFiles() {
    if (selectedFiles.length === 0 || !selectedFolder) return;
    setModalConfig({
      isOpen: true,
      title: 'Bulk Delete',
      description: `Permanently delete ${selectedFiles.length} selected records?`,
      type: 'confirm',
      inputValue: '',
      onConfirm: async () => {
        try {
          await Promise.all(selectedFiles.map(fileId =>
            fetch(`/api/files/${fileId}`, { method: 'DELETE' })
          ));
          loadFiles(selectedFolder.toString());
          setSelectedFiles([]);
        } catch (error) {
          console.error('Error in bulk delete:', error);
        }
      }
    });
  }

  function bulkDownloadFiles() {
    selectedFiles.forEach((fileId, i) => {
      const file = files.find(f => f._id === fileId);
      if (file) {
        setTimeout(() => downloadFile(file), i * 300);
      }
    });
  }

  const onSendMessage = async () => {
    if (!chatMessage.trim() || !selectedUser) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsTyping(true);
    setLoading(true); // Signal activity

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
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Chat API Error');
      }

      let aiMessage = data.message || 'Error: Empty response';
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      const fileRegex = /<create_file\s+filename="([^"]+)"\s*(?:folder="([^"]+)")?>([\s\S]*?)<\/create_file>/g;
      let match;
      let refreshNeeded = false;
      while ((match = fileRegex.exec(aiMessage)) !== null) {
        const filename = match[1];
        const folderName = match[2] || '';
        const content = match[3].trim();

        try {
          const createRes = await fetch('/api/files/ai-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: selectedUser,
              filename,
              folderName,
              content,
              preferredFolderId: selectedFolder
            })
          });
          if (createRes.ok) refreshNeeded = true;
        } catch (err) {
          console.error("Failed to execute AI file creation:", err);
        }
      }

      if (refreshNeeded) {
        if (selectedUser) loadFolders(selectedUser);
        if (selectedFolder) loadFiles(selectedFolder);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Collaboration interrupted. Please retry. (' + (error as Error).message + ')' }]);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const currentFolders = folders.filter(f => selectedFolder ? f.parentId === selectedFolder : !f.parentId);
  const currentFiles = files.filter(f => selectedFolder ? f.folderId === selectedFolder : !f.folderId);
  const canUpload = selectedFolder && !folders.some(f => f.parentId === selectedFolder);

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onLoginClick={() => setLoginModalOpen(true)} />

        <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
          <DialogContent className="sm:max-w-[420px] bg-[#020617] border-slate-800 p-0 overflow-hidden rounded-3xl">
            <div className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-electric-blue flex items-center justify-center shadow-blue-glow mb-4">
                  <Zap size={24} className="text-white fill-white" />
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase font-orbitron">Authorization</h2>
                <p className="text-slate-500 text-xs">Verify your research protocol to proceed</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Researcher RRN</label>
                  <input
                    type="text"
                    value={loginRrn}
                    onChange={(e) => setLoginRrn(e.target.value)}
                    placeholder="Enter RRN"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Access Protocol</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
                <Button onClick={handleLogin} disabled={loginLoading} className="w-full h-14 bg-electric-blue text-white font-black uppercase tracking-widest hover:bg-white hover:text-electric-blue transition-all rounded-2xl mt-4 border-none shadow-blue-glow">
                  {loginLoading ? 'Authenticating...' : 'Establish Connection'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-electric-blue/30">
      <aside className="w-[240px] flex flex-col bg-slate-950 border-r border-slate-800 z-30">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-slate-950" />
          </div>
          <h2 className="text-lg font-bold tracking-tighter uppercase italic">Lab-Sync</h2>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'records', label: 'My Records', icon: Database },
            { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
            { id: 'recent', label: 'Timeline', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
            ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
          ].map((link) => (
            <button key={link.id} onClick={() => setActiveTab(link.id as any)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative ${activeTab === link.id ? 'bg-electric-blue/10 text-electric-blue' : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900'}`}>
              {activeTab === link.id && <div className="absolute left-0 w-1 h-5 bg-electric-blue rounded-r-full" />}
              <link.icon size={18} />
              <span className="text-sm font-bold">{link.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <div className="glass-panel p-3 rounded-xl border-slate-800 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-800 text-slate-300 text-[10px]">
                {users.find(u => u._id === selectedUser)?.name.charAt(0).toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-[11px] font-bold text-white truncate">{users.find(u => u._id === selectedUser)?.name || 'Researcher'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-900/40 relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {selectedFolder && activeTab === 'records' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedFolder(folders.find(f => f._id === selectedFolder)?.parentId || null)} className="rounded-full border-slate-800 h-8 px-3 text-xs">
                <ArrowLeft size={14} className="mr-1.5" /> Back
              </Button>
            )}
            <h1 className="text-lg font-bold">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'recent' && 'Discovery Timeline'}
              {activeTab === 'collaboration' && 'Collaboration Hub'}
              {activeTab === 'settings' && 'System Configuration'}
              {activeTab === 'admin' && 'Administrative Command Center'}
              {activeTab === 'records' && (selectedFolder ? folders.find(f => f._id === selectedFolder)?.name : 'Lab Categories')}
              {activeTab === 'collaboration' && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={loadMessages} className="text-slate-400 hover:text-electric-blue">
                    <RefreshCcw size={14} className="mr-1" /> Sync
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={clearAllMessages} className="text-red-400 hover:text-red-500">
                      <Trash size={14} className="mr-1" /> Clear All
                    </Button>
                  )}
                </div>
              )}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => { if (selectedUser) { loadFolders(selectedUser); loadAllFiles(selectedUser); } if (selectedFolder) loadFiles(selectedFolder); }} className="rounded-full border-slate-800 h-8 w-8 p-0">
            <RefreshCcw size={14} />
          </Button>
        </header>

        <section className="flex-1 overflow-y-auto p-6">
          {activeTab === 'records' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {(!selectedFolder || currentFolders.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {currentFolders.map(folder => (
                    <div key={folder._id} className="glass-panel p-4 hover-glow cursor-pointer group flex items-start gap-3 animate-in" onClick={() => setSelectedFolder(folder._id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: folder._id, name: folder.name, type: 'folder' } }); }}>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-electric-blue/10">
                        <Folder size={20} className="text-slate-500 group-hover:text-electric-blue" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="text-base font-bold mb-0.5 leading-tight">{folder.name}</h3>
                        <p className="text-[10px] text-slate-500">{new Date(folder.created).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-700 self-center" />
                    </div>
                  ))}
                  <Button variant="outline" className="h-auto border-dashed border-2 border-slate-800 py-4 rounded-xl hover:border-electric-blue text-slate-500 flex items-center" onClick={addCategory}>
                    <Plus size={18} className="mr-2" /> <span className="text-sm">{selectedFolder ? 'New Sub-Category' : 'New Category'}</span>
                  </Button>
                </div>
              )}

              {selectedFolder && (
                <>
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center justify-between bg-electric-blue/10 border border-electric-blue/30 rounded-2xl p-4 mb-6 shadow-blue-glow animate-in">
                      <span className="font-bold text-electric-blue">{selectedFiles.length} file(s) selected</span>
                      <div className="flex gap-3">
                        <Button variant="outline" size="sm" onClick={() => setSelectedFiles([])}>Cancel</Button>
                        <Button variant="secondary" size="sm" onClick={() => { setSharingFileIds(selectedFiles); setActiveTab('collaboration'); }} className="bg-electric-blue/20 text-electric-blue border-electric-blue/30"><Send size={14} className="mr-2" /> Share</Button>
                        <Button variant="secondary" size="sm" onClick={bulkDownloadFiles} className="bg-electric-blue text-white shadow-blue-glow"><Download size={14} className="mr-2" /> Download</Button>
                        <Button variant="outline" size="sm" onClick={bulkDeleteFiles} className="text-red-400 border-red-500/30">Delete</Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {canUpload && (
                      <label className="glass-panel p-6 border-dashed border-2 border-slate-800 hover:border-electric-blue/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-slate-500 min-h-[160px]">
                        <PlusCircle size={32} />
                        <span className="font-bold text-sm">Upload Lab Results</span>
                        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                      </label>
                    )}

                    {currentFiles.map(file => (
                      <div key={file._id} className={`glass-panel overflow-hidden hover-glow animate-in group select-none ${selectedFiles.includes(file._id) ? 'ring-2 ring-electric-blue shadow-blue-glow' : ''}`} onMouseDown={() => { setIsSelecting(true); toggleSelection(file._id); }} onMouseEnter={() => { if (isSelecting) addSelection(file._id); }} onDoubleClick={() => file.type.startsWith('image/') && setLightbox(file)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file._id, name: file.name, type: 'file' } }); }}>
                        <div className="aspect-video bg-slate-950 relative flex items-center justify-center">
                          {file.type.startsWith('image/') ? (
                            <img src={`data:${file.type};base64,${file.data}`} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={36} className="text-slate-700" />
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex-1 truncate">
                            <h3 className="font-bold truncate text-sm">{file.name}</h3>
                            <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • {new Date(file.added).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); deleteFile(file._id); }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 border-slate-800 space-y-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Active Researcher</div>
                  <div className="text-2xl font-bold text-white">{users.find(u => u._id === selectedUser)?.name || 'N/A'}</div>
                </div>
                <div className="glass-panel p-6 border-slate-800 space-y-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Categories</div>
                  <div className="text-2xl font-bold text-electric-blue">{folders.length}</div>
                </div>
                <div className="glass-panel p-6 border-slate-800 space-y-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Lab Records</div>
                  <div className="text-2xl font-bold text-white">{allFiles.length}</div>
                </div>
              </div>
              <div className="glass-panel p-8 border-slate-800 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                  <Zap size={32} />
                </div>
                <h3 className="text-lg font-bold text-white uppercase italic">{loading ? 'Processing...' : 'System Synchronized'}</h3>
                <p className="text-slate-500 text-sm max-w-sm">{isTyping ? 'Lab-Bot is analyzing local discovery data...' : 'All lab infrastructures are operational. Use the sidebar to browse categories or query Lab-Bot for discovery analysis.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Discovery Timeline</h2>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Last 20 records</span>
              </div>
              <div className="space-y-3">
                {[...allFiles].sort((a, b) => b.added - a.added).slice(0, 20).map(file => (
                  <div key={file._id} className="glass-panel p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all group">
                    <div className="flex items-center gap-4 truncate">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                        {file.type.startsWith('image/') ? <img src={`data:${file.type};base64,${file.data}`} className="w-6 h-6 object-cover rounded" /> : <FileText size={18} className="text-slate-500" />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-white truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {folders.find(f => f._id === file.folderId)?.name || 'Archived'} • {new Date(file.added).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => downloadFile(file)} className="h-8 w-8 text-slate-700 hover:text-electric-blue">
                      <Download size={16} />
                    </Button>
                  </div>
                ))}
                {allFiles.length === 0 && (
                  <div className="text-center py-20 text-slate-600 italic text-sm">No discovery records found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'collaboration' && (
            <div className="flex flex-col h-full max-w-5xl mx-auto w-full animate-in">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.map(msg => (
                  <div key={msg._id} className={`flex flex-col ${msg.senderId === selectedUser ? 'items-end' : 'items-start'} animate-in`}>
                    <div className="flex items-center gap-2 mb-1 px-2">
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">{msg.senderName}</span>
                      <span className="text-[8px] text-slate-700">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isAdmin && (
                        <button onClick={() => deleteMessage(msg._id)} className="text-slate-800 hover:text-red-500 transition-colors">
                          <Trash size={10} />
                        </button>
                      )}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.senderId === selectedUser ? 'bg-electric-blue text-white rounded-tr-none shadow-blue-glow' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                      {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                      {((msg.files || (msg.file ? [msg.file] : [])) as any[]).filter(Boolean).map((file, idx) => (
                        <div key={idx} className={`mt-2 p-3 rounded-xl border flex items-center justify-between gap-4 ${msg.senderId === selectedUser ? 'bg-black/20 border-white/10' : 'bg-slate-900/50 border-slate-700'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <FileText size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold line-clamp-1">{file.name}</p>
                              <p className="text-[9px] opacity-50 uppercase">{file.type.split('/')[1]}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/20" onClick={() => {
                              const f = allFiles.find(af => af._id === file._id);
                              if (f) {
                                const link = document.createElement('a');
                                link.href = `data:${f.type};base64,${f.data}`;
                                link.download = f.name;
                                link.click();
                              } else {
                                alert('Synchronizing record content...');
                              }
                            }}>
                              <Download size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/20 text-electric-blue" onClick={() => setCloningFileId(file._id)}>
                              <RefreshCcw size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
                    <MessageSquare size={48} strokeWidth={1} />
                    <p className="text-sm italic font-medium">Broadcast intelligence sequence not yet initiated.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-950/20 backdrop-blur-md border-t border-slate-800 flex flex-col gap-3">
                {sharingFileIds.length > 0 && (
                  <div className="flex items-center justify-between bg-electric-blue/10 border border-electric-blue/30 p-2 px-4 rounded-xl text-xs text-electric-blue animate-in">
                    <span className="flex items-center gap-2"><FileText size={14} /> Sharing {sharingFileIds.length} Record(s)</span>
                    <button onClick={() => setSharingFileIds([])}><X size={14} /></button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Button variant="outline" size="icon" className="rounded-xl border-slate-800 hover:border-electric-blue h-12 w-12 cursor-pointer" onClick={() => setModalConfig({
                      isOpen: true,
                      title: 'Share Record',
                      description: 'Select a record from your vault to share with the group.',
                      type: 'confirm',
                      inputValue: '',
                      onConfirm: () => setActiveTab('records') // Hint to go back and select
                    })}>
                      <Plus size={20} />
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={globalMessage}
                    onChange={(e) => setGlobalMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendGlobalMessage()}
                    placeholder="Broadcast intelligence to all researchers..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-5 h-12 text-sm focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                  />
                  <Button onClick={sendGlobalMessage} className="bg-electric-blue hover:bg-white hover:text-electric-blue text-white shadow-blue-glow h-12 w-12 p-0 rounded-xl transition-all">
                    <Send size={20} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="max-w-6xl mx-auto py-6 space-y-6 animate-in">
              <div className="glass-panel border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Researcher</th>
                      <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">RRN (ID)</th>
                      <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Access Protocol</th>
                      <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Role</th>
                      <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">{u.name.charAt(0)}</div>
                            <span className="font-medium text-slate-100">{u.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-electric-blue">{u.rrn}</td>
                        <td className="p-4 font-mono text-xs text-slate-400 group-hover:text-slate-100 transition-colors">{u.password}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                            {u.role || 'researcher'}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u._id); setActiveTab('records'); }} className="text-xs h-8 text-slate-500 hover:text-electric-blue">View Vault</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md mx-auto py-10 space-y-6 animate-in">
              <div className="glass-panel p-6 border-slate-800 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-slate-800 pb-4">Personalization</h3>
                <div className="space-y-4 border-b border-slate-800 pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Appearance Mode</span>
                    <span className="text-[10px] font-bold text-electric-blue uppercase">Deep Slate (Default)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Collaboration Bot</span>
                    <span className="text-[10px] font-bold text-green-500 uppercase">Active</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Change Access Protocol</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Protocol"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                    />
                    <input
                      type="password"
                      placeholder="New Protocol"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                    />
                    <Button onClick={handlePasswordChange} className="w-full h-10 bg-electric-blue text-white text-xs font-bold hover:bg-white hover:text-electric-blue transition-all border-none">
                      Update Protocol
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={handleLogout} variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10">Terminate Connection (Logout)</Button>
            </div>
          )}
        </section>
      </main>

      <aside className="ai-sidebar-container shadow-2xl z-20">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-electric-blue flex items-center justify-center shadow-blue-glow">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <h2 className="font-bold text-sm">Intelligence</h2>
          </div>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-md py-1 px-2 text-[10px] font-bold text-slate-400 focus:ring-1 focus:ring-electric-blue outline-none transition-all">
            <option value="llama-3.3-70b-versatile">Llama 3.3</option>
            <option value="llama-3.2-11b-vision-preview">Vision 3.2</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="py-8 text-center space-y-3 px-4">
              <MessageSquare className="mx-auto text-slate-700" size={20} />
              <h3 className="font-bold text-sm text-slate-300">Analyzer Online</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">Ask Lab-Bot to interpret screenshots, generate code snippets, or automate category organization.</p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col animate-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[90%] text-xs ${msg.role === 'user' ? 'bg-electric-blue text-white rounded-tr-none' : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none prose prose-sm'}`}>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content) as string) }} />
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-end gap-2 glass-panel p-1.5 focus-within:ring-1 focus-within:ring-electric-blue transition-all">
            <textarea placeholder="Query Lab-Bot..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }} className="flex-1 bg-transparent border-none text-slate-100 text-xs p-2.5 outline-none resize-none max-h-24 min-h-[36px] font-medium" />
            <Button size="icon" onClick={onSendMessage} disabled={!chatMessage.trim() || !selectedUser} className="h-8 w-8 bg-electric-blue rounded-lg shadow-blue-glow">
              <Send size={18} />
            </Button>
          </div>
        </div>
      </aside>

      {lightbox && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-8 transition-all animate-in" onClick={() => setLightbox(null)}>
          <Button variant="outline" size="icon" className="absolute top-8 right-8 rounded-full border-slate-800 bg-slate-900">
            <X size={24} />
          </Button>
          <img src={`data:${lightbox.type};base64,${lightbox.data}`} alt={lightbox.name} className="max-w-full max-h-full object-contain rounded-2xl shadow-blue-glow ring-1 ring-white/10" />
        </div>
      )}

      {cloningFileId && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in">
          <div className="max-w-md w-full glass-panel p-8 border-slate-800 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold italic tracking-tighter uppercase text-center">Synchronize Record</h2>
              <p className="text-slate-400 text-xs text-center">Select a destination subfolder to archive this intelligence.</p>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {folders.filter(f => f.parentId).map(folder => {
                const parent = folders.find(p => p._id === folder.parentId);
                return (
                  <button key={folder._id} onClick={() => cloneFileToFolder(cloningFileId, folder._id)} className="w-full text-left p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-electric-blue hover:bg-electric-blue/5 transition-all group">
                    <p className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-electric-blue/60">{parent?.name}</p>
                    <p className="text-sm font-bold text-slate-100">{folder.name}</p>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" className="w-full text-xs font-bold border-slate-800" onClick={() => setCloningFileId(null)}>Cancel Operation</Button>
          </div>
        </div>
      )}

      {contextMenu.isOpen && contextMenu.item && (
        <div className="fixed z-[150] w-48 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col animate-in duration-200" style={{ top: Math.min(contextMenu.y, window.innerHeight - 100), left: Math.min(contextMenu.x, window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}>
          <button className="text-left px-4 py-2 text-sm text-slate-300 hover:bg-electric-blue/10 hover:text-electric-blue flex items-center gap-2" onClick={() => { if (!contextMenu.item) return; const { id, name, type } = contextMenu.item; setContextMenu({ isOpen: false, x: 0, y: 0, item: null }); if (type === 'folder') renameFolder(id, name); else renameFile(id, name); }}>
            <PenLine size={14} /> Rename
          </button>

          {contextMenu.item.type === 'file' && (
            <button className="text-left px-4 py-2 text-sm text-electric-blue/80 hover:bg-electric-blue/10 hover:text-electric-blue flex items-center gap-2" onClick={() => { if (!contextMenu.item) return; const ids = selectedFiles.length > 0 && selectedFiles.includes(contextMenu.item.id) ? selectedFiles : [contextMenu.item.id]; setSharingFileIds(ids); setActiveTab('collaboration'); setContextMenu({ isOpen: false, x: 0, y: 0, item: null }); }}>
              <Send size={14} /> {selectedFiles.length > 0 && selectedFiles.includes(contextMenu.item.id) ? `Share ${selectedFiles.length} Selected` : 'Send to Group'}
            </button>
          )}


          {contextMenu.item.type === 'folder' && (
            <button className="text-left px-4 py-2 text-sm text-red-500/80 hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2" onClick={() => { const id = contextMenu.item?.id; setContextMenu({ isOpen: false, x: 0, y: 0, item: null }); if (id) deleteFolder(id); }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}

      <Dialog open={modalConfig.isOpen} onOpenChange={(isOpen) => !isOpen && setModalConfig(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="glass-panel border-slate-700 bg-slate-950/90 text-slate-100 sm:max-w-md pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">{modalConfig.title}</DialogTitle>
            {modalConfig.description && <DialogDescription className="text-slate-400 mt-2 text-sm">{modalConfig.description}</DialogDescription>}
          </DialogHeader>
          {modalConfig.type === 'prompt' && (
            <div className="py-4">
              <input type="text" autoFocus value={modalConfig.inputValue} onChange={(e) => setModalConfig(prev => ({ ...prev, inputValue: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { modalConfig.onConfirm(modalConfig.inputValue); setModalConfig(prev => ({ ...prev, isOpen: false })); } }} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none" />
            </div>
          )}
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={() => { modalConfig.onConfirm(modalConfig.inputValue); setModalConfig(prev => ({ ...prev, isOpen: false })); }} className="bg-electric-blue text-white shadow-blue-glow border-none">{modalConfig.type === 'prompt' ? 'Save Changes' : 'Confirm Action'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
