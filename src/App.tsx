import { api } from './lib/api';
import { supabase } from './lib/supabase';
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import LandingPage from './components/LandingPage';
import Editor from './components/Editor';
import { motion, AnimatePresence } from 'framer-motion';
import ProgramGeneratorModal from './components/ProgramGeneratorModal';
import RecordEditor, { RecordData } from './components/RecordEditor';
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
  Trash,
  Menu,
  Sparkles
} from 'lucide-react';

/* shadcn-like components (assuming they are set up or I fulfill their role) */
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface User {
  id: string; // Changed from _id to match Supabase UUID
  name: string;
  rrn?: string;
  role?: string;
}

interface Folder {
  id: string; // Changed from _id
  name: string;
  parent_id?: string; // Changed from parentId
  created_at: string; // Changed from created
  user_id: string;
}

interface FileItem {
  id: string;
  name: string;
  file_type: string; // Changed from type
  size: number;
  url: string; // Cloudinary URL
  created_at: string;
  folder_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

function App() {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'recent' | 'settings' | 'collaboration' | 'admin' | 'editor'>('records');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginRrn, setLoginRrn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [globalMessage, setGlobalMessage] = useState('');
  const [sharingFileIds, setSharingFileIds] = useState<string[]>([]);
  const [cloningFileId, setCloningFileId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

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

  // AI Record Generation States
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [activeRecordData, setActiveRecordData] = useState<RecordData | null>(null);
  const [isGeneratingRecord, setIsGeneratingRecord] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);

  useEffect(() => {
    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setSelectedUser(session.user.id);
        loadUsers();
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setSelectedUser(session.user.id);
        loadUsers();
      } else {
        setIsAuthenticated(false);
        setSelectedUser(null);
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!loginRrn || !loginPassword) return;
    setLoginLoading(true);
    try {
      // 🚀 Use Supabase Auth directly
      const email = `${loginRrn.toLowerCase()}@crescent.education`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword
      });

      if (error) throw error;

      if (data.user) {
        setIsAuthenticated(true);
        setSelectedUser(data.user.id);
        setLoginModalOpen(false);
        navigate('/users');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'Authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGenerateRecord = async (params: any) => {
    setIsGeneratingRecord(true);
    setLastSearchParams(params);
    const currentUser = users.find((u: any) => u.id === selectedUser);
    const enrichedParams = { ...params, userName: currentUser?.name || '', userRrn: currentUser?.rrn || '' };
    try {
      const data = await api.post('/generate-record', enrichedParams);

      setActiveRecordData({
        programNumber: data.programNumber || params.programNumber,
        date: data.date || params.date,
        programName: data.title || params.programName,
        aim: data.aim,
        algorithm: data.algorithm,
        programCode: data.code,
        output: data.output,
        result: data.result,
        vivaQuestions: data.vivaQuestions
      });
      
      setIsGeneratorModalOpen(false);
      setActiveTab('editor');
    } catch (err) {
      console.error(err);
      alert('Failed to generate record intelligence: ' + (err as any).message);
    } finally {
      setIsGeneratingRecord(false);
    }
  };

  const handleRegenerateRecord = async () => {
    if (!lastSearchParams) return;
    setIsGeneratingRecord(true);
    const currentUser = users.find((u: any) => u.id === selectedUser);
    const enrichedParams = { ...lastSearchParams, userName: currentUser?.name || '', userRrn: currentUser?.rrn || '' };
    try {
      const data = await api.post('/generate-record', enrichedParams);

      setActiveRecordData(prev => prev ? ({
        ...prev,
        aim: data.aim,
        algorithm: data.algorithm,
        programCode: data.code,
        output: data.output,
        result: data.result,
        vivaQuestions: data.vivaQuestions
      }) : null);
    } catch (err) {
      console.error(err);
      alert('Failed to re-sequence DNA strands: ' + (err as any).message);
    } finally {
      setIsGeneratingRecord(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPass || !newPass) return;
    try {
      await api.put(`/users/${selectedUser}/password`, { currentPassword: currentPass, newPassword: newPass });
      alert('Access Protocol updated successfully');
      setCurrentPass('');
      setNewPass('');
    } catch (error: any) {
      console.error('Password change error:', error);
      alert(error.message || 'Failed to update protocol');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setSelectedUser(null);
    setSelectedFolder(null);
    setLoginRrn('');
    setLoginPassword('');
    navigate('/');
  };

  const loadMessages = async () => {
    try {
      const data = await api.get('/messages');
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
    const user = users.find(u => u.id === selectedUser);
    const sharedFilesMetadata = sharingFileIds.map(fid => {
      const f = allFiles.find(af => af.id === fid);
      return f ? { id: f.id, name: f.name, type: f.file_type } : null;
    }).filter(Boolean);

    try {
      await api.post('/messages', {
        senderId: selectedUser,
        senderName: user?.name || 'Researcher',
        content: globalMessage,
        files: sharedFilesMetadata
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
      await api.delete('/messages');
      loadMessages();
    } catch (err) {
      console.error('Error clearing messages:', err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      loadMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const cloneFileToFolder = async (fileId: string, targetFolderId: string) => {
    try {
      await api.post('/files/clone', { fileId, targetFolderId });
      setCloningFileId(null);
      if (selectedUser) loadAllFiles(selectedUser);
      if (selectedFolder) loadFiles(selectedFolder);
      // Show success feedback inline
      alert('✅ Record synchronized to your vault successfully!');
    } catch (err) {
      console.error('Error syncing file:', err);
      alert('❌ Synchronization failed. Please try again.');
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
      loadCurrentProfile(selectedUser);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function loadFolders(userId: string) {
    try {
      // Backend now gets identity from JWT
      const data = await api.get(`/folders`);
      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  async function loadFiles(folderId: string) {
    try {
      const data = await api.get(`/files/folder/${folderId}`);
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  async function loadAllFiles(userId: string) {
    try {
      const data = await api.get(`/files`);
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
        if (name) {
          try {
            await api.post('/folders', {
              name,
              parent_id: selectedFolder || null
            });
            if (selectedUser) loadFolders(selectedUser);
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
          await api.put(`/folders/${id}`, { name });
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
          await api.delete(`/folders/${id}`);
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_id', selectedFolder);
      
      try {
        await api.post('/files/upload', formData);
        loadFiles(selectedFolder.toString());
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
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
          await api.delete(`/files/${fileId}`);
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
          await api.put(`/files/${fileId}`, { name });
          if (selectedFolder) loadFiles(selectedFolder.toString());
        } catch (error) {
          console.error('Error renaming file:', error);
        }
      }
    });
  }

  async function downloadFileFromUrl(url: string, filename: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  }

  function downloadFile(file: FileItem) {
    const cleanName = file.name.replace(/^\d+-/, '');
    downloadFileFromUrl(file.url, cleanName);
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
            api.delete(`/files/${fileId}`)
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
      const file = allFiles.find(f => f.id === fileId);
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
      const data = await api.post('/ai/chat', {
        message: userMsg,
        folder_id: selectedFolder,
        model: selectedModel,
        history: chatHistory
      });

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

  const currentFolders = folders.filter(f => selectedFolder ? f.parent_id === selectedFolder : !f.parent_id);
  const currentFiles = files.filter(f => selectedFolder ? f.folder_id === selectedFolder : !f.folder_id);
  const canUpload = selectedFolder && !folders.some(f => f.parent_id === selectedFolder);

  const authElement = (
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

  const appElement = (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-electric-blue/30 relative">
      {/* Sidebar Backdrop (Mobile Only) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 w-[240px] flex flex-col bg-slate-950 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
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
            { id: 'editor', label: 'Editor', icon: PenLine },
            { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
            { id: 'recent', label: 'Timeline', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
            ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
          ].map((link) => (
            <button key={link.id} onClick={() => { setActiveTab(link.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative ${activeTab === link.id ? 'bg-electric-blue/10 text-electric-blue' : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900'}`}>
              {activeTab === link.id && <div className="absolute left-0 w-1 h-5 bg-electric-blue rounded-r-full" />}
              <link.icon size={18} />
              <span className="text-sm font-bold">{link.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <div className="glass-panel p-3 rounded-xl border-slate-800 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-bold">
                {userProfile?.name?.charAt(0).toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-[11px] font-bold text-white truncate">{userProfile?.name || 'Researcher'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-900/40 relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <Menu size={20} />
            </button>
            {selectedFolder && activeTab === 'records' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedFolder(folders.find(f => f.id === selectedFolder)?.parent_id || null)} className="rounded-full border-slate-800 h-8 px-3 text-xs">
                <ArrowLeft size={14} className="mr-1.5" /> Back
              </Button>
            )}
            <h1 className="text-lg font-bold">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'recent' && 'Discovery Timeline'}
              {activeTab === 'collaboration' && 'Collaboration Hub'}
              {activeTab === 'settings' && 'System Configuration'}
              {activeTab === 'admin' && 'Administrative Command Center'}
              {activeTab === 'editor' && 'Lab Record Editor'}
              {activeTab === 'records' && (selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'Lab Categories')}
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
                    <div key={folder.id} className="glass-panel p-4 hover-glow cursor-pointer group flex items-start gap-3 animate-in" onClick={() => setSelectedFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: folder.id, name: folder.name, type: 'folder' } }); }}>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-electric-blue/10">
                        <Folder size={20} className="text-slate-500 group-hover:text-electric-blue" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="text-base font-bold mb-0.5 leading-tight">{folder.name}</h3>
                        <p className="text-[10px] text-slate-500">{new Date(folder.created_at).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-700 self-center" />
                    </div>
                  ))}
                  
                  <div className="flex flex-col gap-4">
                    <Button variant="outline" className="h-auto border-dashed border-2 border-slate-800 py-4 rounded-xl hover:border-electric-blue text-slate-500 flex items-center" onClick={addCategory}>
                      <Plus size={18} className="mr-2" /> <span className="text-sm">{selectedFolder ? 'New Sub-Category' : 'New Category'}</span>
                    </Button>
                  </div>
                </div>
              )}

              {selectedFolder && (
                <>
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between bg-electric-blue/10 border border-electric-blue/30 rounded-2xl p-3 md:p-4 mb-6 shadow-blue-glow animate-in gap-3">
                      <span className="font-bold text-electric-blue text-sm md:text-base">{selectedFiles.length} file(s) selected</span>
                      <div className="flex flex-wrap gap-2 md:gap-3 justify-center sm:justify-end w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setSelectedFiles([])} className="h-8 md:h-9 flex-1 sm:flex-none text-[10px] md:text-xs">Cancel</Button>
                        <Button variant="secondary" size="sm" onClick={() => { setSharingFileIds(selectedFiles); setSelectedFiles([]); setActiveTab('collaboration'); }} className="h-8 md:h-9 flex-1 sm:flex-none text-[10px] md:text-xs bg-electric-blue/20 text-electric-blue border-electric-blue/30"><Send size={12} className="mr-1 md:mr-2" /> Share</Button>
                        <Button variant="secondary" size="sm" onClick={bulkDownloadFiles} className="h-8 md:h-9 flex-1 sm:flex-none text-[10px] md:text-xs bg-electric-blue text-white shadow-blue-glow"><Download size={12} className="mr-1 md:mr-2" /> Download</Button>
                        <Button variant="outline" size="sm" onClick={bulkDeleteFiles} className="h-8 md:h-9 flex-1 sm:flex-none text-[10px] md:text-xs text-red-400 border-red-500/30">Delete</Button>
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
                      <div key={file.id} className={`glass-panel overflow-hidden hover-glow animate-in group select-none ${selectedFiles.includes(file.id) ? 'ring-2 ring-electric-blue shadow-blue-glow' : ''}`} onMouseDown={() => { setIsSelecting(true); toggleSelection(file.id); }} onMouseEnter={() => { if (isSelecting) addSelection(file.id); }} onDoubleClick={() => file.file_type.startsWith('image/') && setLightbox(file)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file.id, name: file.name, type: 'file' } }); }}>
                        <div className="aspect-video bg-slate-950 relative flex items-center justify-center">
                          {file.file_type.startsWith('image/') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={36} className="text-slate-700" />
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex-1 truncate">
                            <h3 className="font-bold truncate text-sm">{file.name}</h3>
                            <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}>
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
                  <div className="text-2xl font-bold text-white">{users.find(u => u.id === selectedUser)?.name || 'N/A'}</div>
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
                {[...allFiles].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20).map(file => (
                  <div key={file.id} className="glass-panel p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all group">
                    <div className="flex items-center gap-4 truncate">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                        {file.file_type.startsWith('image/') ? <img src={file.url} className="w-6 h-6 object-cover rounded" /> : <FileText size={18} className="text-slate-500" />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-white truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {folders.find(f => f.id === file.folder_id)?.name || 'Archived'} • {new Date(file.created_at).toLocaleString()}
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
                  <div key={msg.id} className={`flex flex-col ${msg.sender_id === selectedUser ? 'items-end' : 'items-start'} animate-in`}>
                    <div className="flex items-center gap-2 mb-1 px-2">
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">{msg.sender_name}</span>
                      <span className="text-[8px] text-slate-700">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isAdmin && (
                        <button onClick={() => deleteMessage(msg.id)} className="text-slate-800 hover:text-red-500 transition-colors">
                          <Trash size={10} />
                        </button>
                      )}
                    </div>
                    <div className={`max-w-[80%] space-y-3 ${msg.sender_id === selectedUser ? 'items-end' : 'items-start'}`}>
                      {/* Text Content - only show if there's text outside of share tags */}
                      {msg.content && msg.content.replace(/\[\[SHARE:.*?\]\]/g, '').trim() && (
                        <div className={`p-4 rounded-2xl ${msg.sender_id === selectedUser ? 'bg-electric-blue text-white rounded-tr-none shadow-blue-glow' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                          <div 
                            className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content.replace(/\[\[SHARE:.*?\]\]/g, '')) as any) }} 
                          />
                        </div>
                      )}

                      {/* Interactive Share Blocks */}
                      {msg.content.match(/\[\[SHARE:.*?\]\]/g)?.map((share, idx) => {
                        const [name, url, id] = share.replace('[[SHARE:', '').replace(']]', '').split('|');
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
                                <RefreshCcw size={14} className="mr-2" /> Sync
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
                      <tr key={u.id} className="hover:bg-slate-800/20 transition-colors group">
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
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u.id); setActiveTab('records'); }} className="text-xs h-8 text-slate-500 hover:text-electric-blue">View Vault</Button>
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

          {activeTab === 'editor' && (
            <div className={`flex-1 overflow-hidden h-full flex flex-col ${activeRecordData ? '' : 'p-4 md:p-6 items-center'}`}>
              {activeRecordData ? (
                <RecordEditor 
                  data={activeRecordData}
                  userRrn={users.find(u => u.id === selectedUser)?.rrn || 'DRAFT'}
                  onChange={(field, value) => setActiveRecordData(prev => prev ? ({ ...prev, [field]: value }) : null)}
                  onRegenerate={handleRegenerateRecord}
                  isGenerating={isGeneratingRecord}
                />
              ) : (
                <Editor 
                  defaultWatermark={users.find(u => u.id === selectedUser)?.rrn || 'DRAFT'}
                  onSave={(name, data, type) => {
                    if (!selectedFolder) {
                      alert("Please select a category first in the 'My Records' tab.");
                      setActiveTab('records');
                      return;
                    }
                    // We'll use a better notification later, for now simple alert
                    api.post('/files', {
                      name,
                      type,
                      size: 25600, // Dummy size
                      data: "ZHVtbXktZGF0YQ==", // 'dummy-data' in b64
                      added: Date.now(),
                      folder_id: selectedFolder
                    }).then(() => {
                      alert("Record successfully saved to vault.");
                      loadFiles(selectedFolder);
                      setActiveTab('records');
                    });
                  }} 
                />
              )}
            </div>
          )}
        </section>
      </main>

      {/* Floating AI Assistant FAB */}
      {isAuthenticated && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="ai-fab"
          title="Query Lab-Bot"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {!isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
          )}
        </button>
      )}

      {/* AI Assistant Overlay */}
      <AnimatePresence>
        {isChatOpen && isAuthenticated && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="ai-assistant-overlay"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-electric-blue flex items-center justify-center shadow-blue-glow">
                  <Zap size={14} className="text-white fill-white" />
                </div>
                <h2 className="font-bold text-sm">Lab-Bot Intelligence</h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-md py-1 px-2 text-[10px] font-bold text-slate-400 focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3</option>
                  <option value="llama-3.2-11b-vision-preview">Vision 3.2</option>
                </select>
                <button
                  onClick={() => setIsGeneratorModalOpen(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-electric-blue/10 text-electric-blue hover:bg-electric-blue hover:text-white transition-all shadow-blue-glow"
                  title="Initiate Academic Protocol"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {chatHistory.length === 0 ? (
                <div className="py-12 text-center space-y-4 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="text-slate-500" size={24} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-300">Analyzer Sequence Online</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
                    System ready for discovery analysis.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col animate-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[90%] text-xs ${msg.role === 'user' ? 'bg-electric-blue text-white rounded-tr-none shadow-blue-glow' : 'bg-slate-800/50 border border-slate-800 text-slate-200 rounded-tl-none prose prose-sm'}`}>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content) as string) }} />
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex items-center gap-2 text-slate-500 px-2">
                  <RefreshCcw size={12} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Analyzing Lab Data...</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 backdrop-blur-md">
              <div className="flex items-end gap-2 glass-panel p-1.5 focus-within:ring-1 focus-within:ring-electric-blue transition-all bg-slate-900/80">
                <textarea
                  placeholder="Ask Lab-Bot..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                  className="flex-1 bg-transparent border-none text-slate-100 text-xs p-2.5 outline-none resize-none max-h-32 min-h-[40px] font-medium"
                />
                <Button
                  size="icon"
                  onClick={onSendMessage}
                  disabled={!chatMessage.trim() || !selectedUser || isTyping}
                  className="h-10 w-10 bg-electric-blue rounded-xl shadow-blue-glow flex-shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {lightbox && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-8 transition-all animate-in" onClick={() => setLightbox(null)}>
          <Button variant="outline" size="icon" className="absolute top-8 right-8 rounded-full border-slate-800 bg-slate-900">
            <X size={24} />
          </Button>
          <img src={`data:${lightbox.file_type};base64,${lightbox.data}`} alt={lightbox.name} className="max-w-full max-h-full object-contain rounded-2xl shadow-blue-glow ring-1 ring-white/10" />
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
              {folders.filter(f => f.parent_id).map(folder => {
                const parent = folders.find(p => p.id === folder.parent_id);
                return (
                  <button key={folder.id} onClick={() => cloneFileToFolder(cloningFileId, folder.id)} className="w-full text-left p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-electric-blue hover:bg-electric-blue/5 transition-all group">
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
      <ProgramGeneratorModal 
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
        onGenerate={handleGenerateRecord}
        isGenerating={isGeneratingRecord}
      />
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={!isAuthenticated ? authElement : <Navigate to="/users" replace />} />
      <Route path="/auth" element={!isAuthenticated ? authElement : <Navigate to="/users" replace />} />
      <Route path="/users/*" element={isAuthenticated ? appElement : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
