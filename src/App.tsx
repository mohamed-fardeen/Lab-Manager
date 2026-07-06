import { api } from './lib/api';
import FilePreviewModal from './components/FilePreviewModal';
import { supabase } from './lib/supabase';
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import LandingPage from './components/LandingPage';
import { motion, AnimatePresence } from 'framer-motion';
import ProgramGeneratorModal from './components/ProgramGeneratorModal';
import { RecordData } from './components/RecordEditor';
import {
  Plus,
  RefreshCcw,
  MessageSquare,
  Send,
  FileText,
  Zap,
  X,
  Sparkles
} from 'lucide-react';

import UserManagement from "./components/admin/UserManagement";
import DataManager from "./components/admin/DataManager";
import Activity from "./components/admin/Activity";
import Analytics from "./components/admin/Analytics";
import AIMonitor from "./components/admin/AIMonitor";
import StorageManager from "./components/admin/StorageManager";
import BroadcastManager from "./components/admin/BroadcastManager";
import AdminSettings from "./components/admin/AdminSettings";
import CommonFileStructure from "./components/admin/CommonFileStructure";

// New Layouts & Pages
import AdminLayout from "./components/layouts/AdminLayout";
import UserLayout from "./components/layouts/UserLayout";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import UserDashboard from "./pages/user/UserDashboard";
import MyRecords from "./pages/user/MyRecords";
import Timeline from "./pages/user/Timeline";
import Collaboration from "./pages/user/Collaboration";
import UserSettings from "./pages/user/UserSettings";
import EditorPage from "./pages/user/EditorPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  rrn?: string;
  role?: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  user_id: string;
}

interface FileItem {
  id: string;
  name: string;
  file_type: string;
  size: number;
  url: string;
  created_at: string;
  folder_id: string;
  language?: string;
  tags?: string[];
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

/* Catch-all component — detects /admin anywhere in path and handles it properly */
const NotFound: React.FC<{ isAuthenticated: boolean; onLogout: (skipNavigate?: boolean) => void }> = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.toLowerCase().includes('/admin');

  React.useEffect(() => {
    if (isAdminPath) {
      navigate('/admin/login', { replace: true });
      if (isAuthenticated) {
        onLogout(true); // pass true to skip the redirect to '/'
      }
    } else {
      navigate('/', { replace: true });
    }
  }, []);

  if (isAdminPath) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-red-400 text-xs font-black uppercase tracking-widest">Redirecting to Admin Portal...</p>
      </div>
    );
  }

  return null;
};

function App() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginRrn, setLoginRrn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [globalMessage, setGlobalMessage] = useState('');
  const [sharingFileIds, setSharingFileIds] = useState<string[]>([]);
  const [cloningFileId, setCloningFileId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'layout' | 'structure'>('layout');
  const [activeHtml, setActiveHtml] = useState<string>('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLanguage, setSearchLanguage] = useState('');
  const [searchType, setSearchType] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type: 'prompt' | 'confirm';
    inputValue: string;
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'confirm', inputValue: '', onConfirm: () => { } });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [timelineTypeFilter, setTimelineTypeFilter] = useState('');
  const [timelineSubjectFilter, setTimelineSubjectFilter] = useState('');

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
    const timer = setTimeout(() => {
      if (searchQuery.trim() || searchLanguage || searchType) {
        handleSearch();
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchLanguage, searchType]);

  const handleSearch = async () => {
    if (!isAuthenticated) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (searchLanguage) params.append('language', searchLanguage);
      if (searchType) params.append('type', searchType);
      
      const data = await api.get(`/files/search?${params.toString()}`);
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let sessionInterval: NodeJS.Timeout;

    const initSession = async (session: any) => {
      if (session) {
        setIsAuthenticated(true);
        setSelectedUser(session.user.id);
        await loadUsers();
        const profile = await loadCurrentProfile(session.user.id);
        
        // --- Session Timeout Logic ---
        const isAdminUser = profile?.role === 'admin';
        const expiresAtStr = localStorage.getItem('session_expires_at');
        const now = Date.now();
        
        if (expiresAtStr && now > parseInt(expiresAtStr, 10)) {
          // Session expired
          localStorage.removeItem('session_expires_at');
          await supabase.auth.signOut();
          return;
        } else if (!expiresAtStr) {
          // New session limit: 30 mins for admin, 100 mins for users
          const timeoutMins = isAdminUser ? 30 : 100;
          localStorage.setItem('session_expires_at', (now + timeoutMins * 60 * 1000).toString());
        }
        // -----------------------------

        lastUserId.current = session.user.id;
        loadFolders();
        loadAllFiles();

        // Start active interval check
        if (sessionInterval) clearInterval(sessionInterval);
        sessionInterval = setInterval(async () => {
          const currentExpires = localStorage.getItem('session_expires_at');
          if (currentExpires && Date.now() > parseInt(currentExpires, 10)) {
            localStorage.removeItem('session_expires_at');
            await supabase.auth.signOut();
          }
        }, 60000); // Check every minute

      } else {
        localStorage.removeItem('session_expires_at');
        setIsAuthenticated(false);
        setSelectedUser(null);
        lastUserId.current = null;
        if (sessionInterval) clearInterval(sessionInterval);
      }
      if (isMounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      initSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.id === lastUserId.current) return;
      
      if (!session) {
        localStorage.removeItem('session_expires_at');
        setIsAuthenticated(false);
        setSelectedUser(null);
        lastUserId.current = null;
        if (sessionInterval) clearInterval(sessionInterval);
        if (isMounted) setLoading(false);
      } else {
        initSession(session);
      }
    });

    return () => {
      isMounted = false;
      if (sessionInterval) clearInterval(sessionInterval);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    if (!loginRrn || !loginPassword) return;
    setLoginLoading(true);
    try {
      const email = `${loginRrn.toLowerCase()}@crescent.education`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword
      });

      if (error) throw error;

      if (data.user) {
        const profile = await loadCurrentProfile(data.user.id);
        // Block admins from using the user login — they have their own portal.
        if (profile?.role === 'admin') {
          await supabase.auth.signOut();
          alert('Please use the Admin Portal at /admin/login to sign in.');
          return;
        }
        setIsAuthenticated(true);
        setSelectedUser(data.user.id);
        setLoginModalOpen(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'Authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Called by AdminLogin after it validates the user has role='admin'.
  const handleAdminLogin = async (userId: string) => {
    await loadCurrentProfile(userId);
    setIsAuthenticated(true);
    setSelectedUser(userId);
  };

  const handleGenerateRecord = async (params: any) => {
    setIsGeneratingRecord(true);
    setLastSearchParams(params);
    const currentUser = users.find((u: any) => u.id === selectedUser);
    const enrichedParams = { ...params, userName: currentUser?.name || '', userRrn: currentUser?.rrn || '' };
    try {
      const data = await api.post('/generate-record', enrichedParams);

      if (data && data.aim) {
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
        navigate('/editor');
      } else {
        alert('Record intelligence was generated but appears incomplete. Please try again.');
      }
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

  const handleUpdatePassword = async () => {
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

  const handleLogout = (skipNavigate = false) => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setSelectedUser(null);
    setSelectedFolder(null);
    setLoginRrn('');
    setLoginPassword('');
    supabase.auth.signOut().then(() => {
      if (!skipNavigate) navigate('/');
    });
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

  const handleSendMessage = async () => {
    if (!chatMessage.trim() && sharingFileIds.length === 0) return;
    const user = users.find(u => u.id === selectedUser);
    const sharedFilesMetadata = sharingFileIds.map(fid => {
      const f = allFiles.find(af => af.id === fid);
      return f ? { id: f.id, name: f.name, type: f.file_type } : null;
    }).filter(Boolean);

    try {
      await api.post('/messages', {
        senderId: selectedUser,
        senderName: user?.name || 'Researcher',
        content: chatMessage,
        files: sharedFilesMetadata
      });
      setChatMessage('');
      setSharingFileIds([]);
      loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
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

  // The selectedUser effect has been merged into the auth initialization flow

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
      const { data, error } = await supabase.from('profiles').select('*').neq('role', 'admin');
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function loadCurrentProfile(userId: string) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      setUserProfile(data);
      if (data) setIsAdmin(data.role === 'admin');
      return data;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }

  async function loadFolders() {
    try {
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

  async function loadAllFiles() {
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
            await api.post('/folders', { name, parent_id: selectedFolder || null });
            loadFolders();
          } catch (error) {
            console.error('Error adding category:', error);
          }
        }
      }
    });
  }

  async function handleFileUpload(files: FileList | File[] | React.ChangeEvent<HTMLInputElement>) {
    let fileList: FileList | File[];
    
    if ('target' in files && files.target instanceof HTMLInputElement) {
      fileList = files.target.files || [];
    } else {
      fileList = files as FileList | File[];
    }

    if (!fileList || fileList.length === 0 || !selectedFolder) return;

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
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };

  const addSelection = (id: string) => {
    setSelectedFiles(prev => prev.includes(id) ? prev : [...prev, id]);
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
          await Promise.all(selectedFiles.map(fileId => api.delete(`/files/${fileId}`)));
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
      if (file) setTimeout(() => downloadFile(file), i * 300);
    });
  }

  const onSendMessage = async () => {
    if (!chatMessage.trim() || !selectedUser) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsTyping(true);
    try {
      const data = await api.post('/action', {
        action: 'chat',
        message: userMsg,
        folder_id: selectedFolder,
        model: selectedModel,
        history: chatHistory
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response || data.message || 'Error' }]);
    } catch (error) {
      console.error('Chat Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const currentFolders = folders.filter(f => selectedFolder ? f.parent_id === selectedFolder : !f.parent_id);
  const currentFiles = files.filter(f => selectedFolder ? f.folder_id === selectedFolder : !f.folder_id);
  const canUpload = selectedFolder && !folders.some(f => f.parent_id === selectedFolder);

  const authElement = (
    <>
      <LandingPage onLoginClick={() => setLoginModalOpen(true)} />
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border p-0 overflow-hidden rounded-3xl">
          <div className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-accent-glow mb-4">
                <Zap size={24} className="text-foreground fill-white" />
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase font-orbitron text-foreground">Authorization</h2>
              <p className="text-muted-foreground text-xs">Verify your research protocol to proceed</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Researcher RRN</label>
                <input type="text" name="user-rrn" autoComplete="off" value={loginRrn} onChange={(e) => setLoginRrn(e.target.value)} placeholder="Enter RRN" className="w-full bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Access Protocol</label>
                <input type="password" name="user-access-key" autoComplete="off" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30" />
              </div>
              <Button onClick={handleLogin} disabled={loginLoading} className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all rounded-2xl mt-4 border-none shadow-accent-glow">
                {loginLoading ? 'Authenticating...' : 'Establish Connection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <div className="text-primary font-bold tracking-widest uppercase text-sm">Initializing System...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public admin login — completely separate from user auth */}
        <Route path="/admin/login" element={<AdminLogin isAdmin={isAdmin} onAdminLogin={handleAdminLogin} />} />

        <Route path="/" element={!isAuthenticated ? authElement : <Navigate to="/dashboard" replace />} />
        
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} isAdmin={isAdmin} />}>
          <Route element={<UserLayout userProfile={userProfile} onLogout={handleLogout} selectedFolder={selectedFolder} folders={folders} onBackToParent={() => setSelectedFolder(folders.find(f => f.id === selectedFolder)?.parent_id || null)} />}>
            <Route path="/dashboard" element={<UserDashboard userProfile={userProfile} stats={{ totalRecords: allFiles.length, recentActivity: 12, aiInteractions: 45, storageUsed: '1.2 GB' }} />} />
            <Route path="/my-records" element={
              <MyRecords 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearching={isSearching}
                searchLanguage={searchLanguage} setSearchLanguage={setSearchLanguage} searchType={searchType} setSearchType={setSearchType}
                searchResults={searchResults} selectedFiles={selectedFiles} setIsSelecting={setIsSelecting} toggleSelection={toggleSelection}
                isSelecting={isSelecting} addSelection={addSelection} setPreviewFile={setPreviewFile} setContextMenu={setContextMenu}
                deleteFile={deleteFile} selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder} currentFolders={currentFolders}
                currentFiles={currentFiles} addCategory={addCategory} setSelectedFiles={setSelectedFiles} setSharingFileIds={setSharingFileIds}
                bulkDownloadFiles={bulkDownloadFiles} bulkDeleteFiles={bulkDeleteFiles} handleFileUpload={handleFileUpload} canUpload={!!canUpload}
              />
            } />
            <Route path="/timeline" element={<Timeline timelineTypeFilter={timelineTypeFilter} setTimelineTypeFilter={setTimelineTypeFilter} timelineSubjectFilter={timelineSubjectFilter} setTimelineSubjectFilter={setTimelineSubjectFilter} folders={folders} loading={loading} allFiles={allFiles} setPreviewFile={setPreviewFile} downloadFile={downloadFile} />} />
            <Route path="/collaboration" element={<Collaboration messages={messages} selectedUser={selectedUser} deleteMessage={deleteMessage} downloadFileFromUrl={downloadFileFromUrl} setCloningFileId={setCloningFileId} chatMessage={chatMessage} setChatMessage={setChatMessage} handleSendMessage={handleSendMessage} loadMessages={loadMessages} />} />
            <Route path="/editor" element={<EditorPage editorMode={editorMode} setEditorMode={setEditorMode} editingFileId={editingFileId} users={users} selectedUser={selectedUser} selectedFolder={selectedFolder} setActiveTab={(tab) => navigate(`/${tab}`)} api={api} loadFiles={loadFiles} setEditingFileId={setEditingFileId} files={files} activeHtml={activeHtml} setActiveHtml={setActiveHtml} />} />
            <Route path="/settings" element={<UserSettings userProfile={userProfile} currentPass={currentPass} setCurrentPass={setCurrentPass} newPass={newPass} setNewPass={setNewPass} handleUpdatePassword={handleUpdatePassword} onLogout={handleLogout} />} />
          </Route>
        </Route>

        <Route element={<AdminRoute isAuthenticated={isAuthenticated} isAdmin={isAdmin} onLogout={handleLogout} />}>
          <Route element={<AdminLayout userProfile={userProfile} onLogout={handleLogout} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/data" element={<DataManager />} />
            <Route path="/admin/structure" element={<CommonFileStructure />} />
            <Route path="/admin/activity" element={<Activity />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/ai-monitor" element={<AIMonitor />} />
            <Route path="/admin/storage" element={<StorageManager />} />
            <Route path="/admin/broadcast" element={<BroadcastManager />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound isAuthenticated={isAuthenticated} onLogout={handleLogout} />} />
      </Routes>

      {/* Floating AI Assistant FAB */}
      {isAuthenticated && (
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="ai-fab" title="Query Lab-Bot">
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {!isChatOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />}
        </button>
      )}

      {/* AI Assistant Overlay */}
      <AnimatePresence>
        {isChatOpen && isAuthenticated && (
          <motion.aside initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="ai-assistant-overlay">
            <div className="p-4 border-b border-border flex items-center justify-between bg-background/40">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-accent-glow"><Zap size={14} className="text-primary-foreground fill-primary-foreground" /></div>
                <h2 className="font-bold text-sm">Lab-Bot Intelligence</h2>
              </div>
              <div className="flex items-center gap-2">
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bg-muted border border-border rounded-md py-1 px-2 text-[10px] font-bold text-muted-foreground focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="llama-3.3-70b-versatile">Llama 3.3</option>
                  <option value="llama-3.2-11b-vision-preview">Vision 3.2</option>
                </select>
                <button onClick={() => setIsGeneratorModalOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-accent-glow"><Sparkles size={14} /></button>
                <button onClick={() => setIsChatOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {chatHistory.length === 0 ? (
                <div className="py-12 text-center space-y-4 px-6">
                  <div className="w-12 h-12 rounded-2xl app-surface-raised flex items-center justify-center mx-auto mb-2"><MessageSquare className="text-muted-foreground" size={24} /></div>
                  <h3 className="font-bold text-sm text-foreground">Analyzer Sequence Online</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">System ready for discovery analysis.</p>
                </div>
              ) : chatHistory.map((msg, i) => (
                <div key={i} className={`flex flex-col animate-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[90%] text-xs ${msg.role === 'user' ? 'app-msg-own shadow-accent-glow' : 'app-msg-other prose prose-sm'}`}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content) as string) }} />
                  </div>
                </div>
              ))}
              {isTyping && <div className="flex items-center gap-2 text-muted-foreground px-2"><RefreshCcw size={12} className="animate-spin" /><span className="text-[10px] font-bold uppercase tracking-widest">Analyzing Lab Data...</span></div>}
            </div>
            <div className="p-4 border-t border-border bg-background/60 backdrop-blur-md">
              <div className="flex items-end gap-2 glass-panel p-1.5 focus-within:ring-1 focus-within:ring-primary transition-all bg-muted/80">
                <textarea placeholder="Ask Lab-Bot..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }} className="flex-1 bg-transparent border-none text-foreground text-xs p-2.5 outline-none resize-none max-h-32 min-h-[40px] font-medium" />
                <Button size="icon" onClick={onSendMessage} disabled={!chatMessage.trim() || !selectedUser || isTyping} className="h-10 w-10 bg-primary text-primary-foreground rounded-xl shadow-accent-glow flex-shrink-0"><Send size={18} /></Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <FilePreviewModal file={previewFile} isOpen={!!previewFile} onClose={() => setPreviewFile(null)} />
      
      {cloningFileId && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in">
          <div className="max-w-md w-full glass-panel p-8 border-border shadow-2xl space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold italic tracking-tighter uppercase">Synchronize Record</h2>
              <p className="text-muted-foreground text-xs">Select a destination subfolder to archive this intelligence.</p>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {folders.filter(f => f.parent_id).map(folder => (
                <button key={folder.id} onClick={() => cloneFileToFolder(cloningFileId, folder.id)} className="w-full text-left p-4 rounded-xl bg-card/50 border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground/60 group-hover:text-primary/60">{folders.find(p => p.id === folder.parent_id)?.name}</p>
                  <p className="text-sm font-bold text-foreground">{folder.name}</p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full text-xs font-bold border-border" onClick={() => setCloningFileId(null)}>Cancel Operation</Button>
          </div>
        </div>
      )}

      <ProgramGeneratorModal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} onGenerate={handleGenerateRecord} isGenerating={isGeneratingRecord} />

      {contextMenu.isOpen && contextMenu.item && (
        <div className="fixed z-[150] w-48 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl py-2 flex flex-col animate-in duration-200" style={{ top: Math.min(contextMenu.y, window.innerHeight - 100), left: Math.min(contextMenu.x, window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}>
          <button className="text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-2" onClick={() => setContextMenu({ isOpen: false, x: 0, y: 0, item: null })}>
             <FileText size={14} className="text-muted-foreground/50" /> Action Required
          </button>
        </div>
      )}

      <Dialog open={modalConfig.isOpen} onOpenChange={(isOpen) => !isOpen && setModalConfig(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="glass-panel border-border bg-background/90 text-foreground sm:max-w-md pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">{modalConfig.title}</DialogTitle>
            {modalConfig.description && <DialogDescription className="text-muted-foreground mt-2 text-sm">{modalConfig.description}</DialogDescription>}
          </DialogHeader>
          {modalConfig.type === 'prompt' && (
            <div className="py-4">
              <input type="text" autoFocus value={modalConfig.inputValue} onChange={(e) => setModalConfig(prev => ({ ...prev, inputValue: e.target.value }))} className="w-full bg-muted border border-border rounded-lg p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none" />
            </div>
          )}
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={() => { modalConfig.onConfirm(modalConfig.inputValue); setModalConfig(prev => ({ ...prev, isOpen: false })); }} className="bg-primary text-primary-foreground shadow-accent-glow border-none">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
