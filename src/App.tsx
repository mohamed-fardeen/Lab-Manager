import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');

  useEffect(() => {
    loadUsers();
  }, []);

  // Fix: Only reset folder if the user actually CHANGED
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedUser) {
      loadFolders(selectedUser);
      if (selectedUser !== lastUserId.current) {
        setSelectedFolder(null);
        lastUserId.current = selectedUser;
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder);
    }
  }, [selectedFolder]);

  // Global function for copying code
  useEffect(() => {
    (window as any).copyCode = async (btn: HTMLButtonElement) => {
      const container = btn.closest('.code-block-container');
      if (!container) return;
      const codeElement = container.querySelector('code');
      if (!codeElement) return;

      const code = codeElement.innerText;
      try {
        await navigator.clipboard.writeText(code);
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span>✅ Copied!</span>';
        btn.style.color = 'var(--success-color)';
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd' && selectedUser) {
        e.preventDefault();
        deleteUser(selectedUser);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, users]);

  async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders(userId: string) {
    try {
      const response = await fetch(`/api/folders/${userId}`);
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  async function loadFiles(folderId: string) {
    try {
      console.log(`Fetching files for folder: ${folderId}`);
      const response = await fetch(`/api/files/${folderId}`);
      const data = await response.json();
      console.log(`Loaded ${data.length} files from server.`);
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  async function addUser() {
    const name = prompt('User name:');
    if (name) {
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const result = await response.json();
        const userId = result.insertedId;
        setUsers([...users, { _id: userId, name }]);

        // Create default folders
        const topFolders = ['Algorithmic Design', 'Network Methodologies', 'Data Mining'];
        for (const folderName of topFolders) {
          const folderResponse = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: folderName, userId, created: Date.now() })
          });
          const folderResult = await folderResponse.json();
          const folderId = folderResult.insertedId;

          // Create subfolders
          await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Program', parentId: folderId, userId, created: Date.now() })
          });
          await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Other as Screenshots', parentId: folderId, userId, created: Date.now() })
          });
        }
        loadUsers(); // Refresh users
      } catch (error) {
        console.error('Error adding user:', error);
      }
    }
  }

  async function deleteUser(userId: string) {
    if (confirm('Delete user and all their data?')) {
      try {
        // Get all folders for this user
        const foldersResponse = await fetch(`/ api / folders / ${userId} `);
        const userFolders = await foldersResponse.json();

        // Delete all files and folders for this user
        for (const folder of userFolders) {
          // Delete all files in this folder
          const filesResponse = await fetch(`/ api / files / ${folder._id} `);
          const files = await filesResponse.json();
          for (const file of files) {
            const deleteFileResponse = await fetch(`/ api / files / ${file._id} `, { method: 'DELETE' });
            if (!deleteFileResponse.ok) {
              console.error('Failed to delete file:', file._id);
            }
          }
          // Delete the folder
          const deleteFolderResponse = await fetch(`/ api / folders / ${folder._id} `, { method: 'DELETE' });
          if (!deleteFolderResponse.ok) {
            console.error('Failed to delete folder:', folder._id);
          }
        }

        // Delete the user
        const deleteUserResponse = await fetch(`/ api / users / ${userId} `, { method: 'DELETE' });
        if (!deleteUserResponse.ok) {
          throw new Error(`Failed to delete user: ${deleteUserResponse.status} `);
        }

        // Refresh UI
        if (selectedUser === userId) {
          setSelectedUser(null);
          setSelectedFolder(null);
        }
        loadUsers();
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please check console for details.');
      }
    }
  }

  function getCurrentFolders() {
    if (!selectedUser) return [];
    if (!selectedFolder) {
      return folders.filter(f => f.userId === selectedUser && !f.parentId);
    } else {
      return folders.filter(f => f.parentId === selectedFolder);
    }
  }

  function getCurrentFiles() {
    if (!selectedFolder) return [];
    const filtered = files.filter(f => {
      const match = String(f.folderId).trim() === String(selectedFolder).trim();
      return match;
    });
    return filtered;
  }

  function handleFolderClick(folderId: string) {
    const folder = folders.find(f => f._id === folderId);
    if (folder && folders.some(f => f.parentId === folderId)) {
      setSelectedFolder(folderId);
    } else {
      setSelectedFolder(folderId);
    }
  }

  async function handleFiles(fileList: FileList) {
    if (!selectedFolder) return;
    for (const file of Array.from(fileList)) {
      if (file.size > 4 * 1024 * 1024) {
        alert('File too large (>4MB)');
        continue;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const fileItem: Omit<FileItem, '_id'> = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          added: Date.now(),
          folderId: selectedFolder
        };
        try {
          await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fileItem)
          });
          loadFiles(selectedFolder); // Refresh files
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleFileSelection(e: React.MouseEvent, fileId: string) {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd+Click
      if (selectedFiles.includes(fileId)) {
        setSelectedFiles(selectedFiles.filter(id => id !== fileId));
      } else {
        setSelectedFiles([...selectedFiles, fileId]);
      }
    } else {
      // Single select with regular click
      setSelectedFiles([fileId]);
    }
  }

  function handleSelectionStart(e: React.MouseEvent) {
    // Only start selection if clicking on the grid background, not on a card or button
    if ((e.target as HTMLElement).closest('.card') || (e.target as HTMLElement).closest('.btn')) return;

    setIsSelecting(true);
    setSelectionStart({ x: e.clientX, y: e.clientY });
    setSelectionEnd({ x: e.clientX, y: e.clientY });
    setSelectedFiles([]);
  }

  function handleSelectionMove(e: React.MouseEvent) {
    if (isSelecting && selectionStart) {
      setSelectionEnd({ x: e.clientX, y: e.clientY });

      const fileGrid = e.currentTarget as HTMLElement;
      const fileElements = fileGrid.querySelectorAll('[data-file-id]');

      const rectA = {
        left: Math.min(selectionStart.x, e.clientX),
        top: Math.min(selectionStart.y, e.clientY),
        right: Math.max(selectionStart.x, e.clientX),
        bottom: Math.max(selectionStart.y, e.clientY)
      };

      const selectedIds: string[] = [];
      fileElements.forEach(element => {
        const rectB = element.getBoundingClientRect();
        const fileId = element.getAttribute('data-file-id');

        if (fileId) {
          // Check for intersection (Standard rectangle collision)
          const isIntersecting = !(
            rectB.left > rectA.right ||
            rectB.right < rectA.left ||
            rectB.top > rectA.bottom ||
            rectB.bottom < rectA.top
          );

          if (isIntersecting) {
            selectedIds.push(fileId);
          }
        }
      });
      setSelectedFiles(selectedIds);
    }
  }

  function handleSelectionEnd() {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }

  async function deleteFile(fileId: string) {
    if (!selectedFolder) return;
    if (confirm('Delete file?')) {
      try {
        await fetch(`/ api / files / ${fileId} `, { method: 'DELETE' });
        loadFiles(selectedFolder); // Refresh files
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  }

  function downloadFile(file: FileItem) {
    const link = document.createElement('a');
    link.href = `data:${file.type}; base64, ${file.data} `;
    link.download = file.name;
    link.click();
  }

  async function handleChat() {
    if (!chatMessage.trim() || !selectedUser) return;

    const userMsg = { role: 'user', content: chatMessage };
    setChatHistory([...chatHistory, userMsg]);
    setChatMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          userId: selectedUser,
          folderId: selectedFolder,
          model: selectedModel,
          history: chatHistory
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]);

      // Check for file creation tags in the response - support both single and double quotes
      const fileCreationMatch = Array.from(data.message.matchAll(/<create_file filename=["'](.*?)["'] folder=["'](.*?)["']>([\s\S]*?)<\/create_file>/g) as Iterable<RegExpMatchArray>);
      let createdAny = false;

      for (const match of fileCreationMatch) {
        const [_, filename, folderName, content] = match;
        console.log(`Processing AI file request: ${filename} in ${folderName} `);
        try {
          const res = await fetch('/api/files/ai-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: selectedUser,
              filename,
              content: content.trim(),
              folderName,
              preferredFolderId: selectedFolder
            })
          });

          if (!res.ok) throw new Error(await res.text());

          createdAny = true;
          console.log(`AI Auto-created file: ${filename} in ${folderName}`);

          // Add a permanent local message to confirm creation
          setChatHistory(prev => [...prev, {
            role: 'assistant',
            content: `✅ **SYSTEM UPDATE**: File \`${filename}\` has been locked into the \`${folderName}\` category.`
          }]);
        } catch (err: any) {
          console.error('Failed to auto-create file:', err);
          setChatHistory(prev => [...prev, {
            role: 'assistant',
            content: `❌ **SYSTEM ERROR**: Failed to save \`${filename}\`. ${err.message}`
          }]);
        }
      }

      if (createdAny) {
        // Delay refresh slightly to ensure DB consistency and prevent flickering
        setTimeout(() => {
          if (selectedUser) loadFolders(selectedUser);
          if (selectedFolder) loadFiles(selectedFolder);
        }, 500);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  }

  const currentFolders = getCurrentFolders();
  const currentFiles = getCurrentFiles();
  const canUpload = selectedFolder && !folders.some(f => f.parentId === selectedFolder);

  return (
    <div className="fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <header style={{
        textAlign: 'center',
        padding: '24px 20px',
        background: 'linear-gradient(135deg, var(--secondary-bg) 0%, var(--tertiary-bg) 100%)',
        fontSize: '28px',
        fontWeight: 'bold',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        🧪 Lab Works Manager
      </header>
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '100px',
          fontSize: '18px'
        }}>
          <div className="loading"></div>
          <span style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading your lab workspace...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{
            width: '280px',
            background: 'var(--secondary-bg)',
            padding: '20px',
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: '100vh',
            position: 'sticky',
            top: '0'
          }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                👥 Users
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-sm"
                  onClick={addUser}
                  style={{
                    fontSize: '18px',
                    width: '32px',
                    height: '32px',
                    padding: '0',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Add User"
                >
                  ➕
                </button>
                {selectedUser && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteUser(selectedUser)}
                    style={{
                      fontSize: '14px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete Selected User (Ctrl+D)"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {users.map(user => (
                <div
                  key={user._id}
                  className="card"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedUser === user._id ? 'var(--accent-color)' : 'var(--secondary-bg)',
                    border: selectedUser === user._id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onClick={() => { setSelectedUser(user._id.toString()); setSelectedFolder(null); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: selectedUser === user._id ? 'var(--text-color)' : 'var(--accent-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: selectedUser === user._id ? 'var(--accent-color)' : 'var(--text-color)'
                    }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click to explore</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* User context menu removed */}
          </div>
          <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
            {selectedUser ? (
              <>
                {selectedFolder && (
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedFolder(null)}
                    >
                      ← Back to Folders
                    </button>
                  </div>
                )}

                {currentFolders.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h2 style={{
                      margin: '0 0 20px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: 'var(--text-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📁 {selectedFolder ? 'Subfolders' : 'Lab Categories'}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                      {currentFolders.map(folder => (
                        <div
                          key={folder._id}
                          className="card"
                          style={{
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onClick={() => handleFolderClick(folder._id.toString())}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px'
                          }}>
                            <div style={{
                              fontSize: '32px',
                              filter: 'hue-rotate(200deg)'
                            }}>
                              📂
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                marginBottom: '4px'
                              }}>
                                {folder.name}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                📅 {new Date(folder.created).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            fontSize: '20px',
                            opacity: 0.5
                          }}>
                            →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canUpload && currentFiles.length > 0 && (
                  <div>
                    <h2 style={{
                      margin: '0 0 20px 0',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: 'var(--text-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <span>📄 Files ({currentFiles.length})</span>
                      {selectedFiles.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {selectedFiles.length} selected
                          </span>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              selectedFiles.forEach(fileId => {
                                const file = currentFiles.find(f => f._id === fileId);
                                if (file) downloadFile(file);
                              });
                            }}
                          >
                            ⬇️ Download All
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              if (confirm(`Delete ${selectedFiles.length} selected files?`)) {
                                selectedFiles.forEach(fileId => {
                                  deleteFile(fileId);
                                });
                                setSelectedFiles([]);
                              }
                            }}
                          >
                            🗑️ Delete All
                          </button>
                        </div>
                      )}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', position: 'relative' }}
                      onMouseDown={handleSelectionStart}
                      onMouseMove={handleSelectionMove}
                      onMouseUp={handleSelectionEnd}
                      onMouseLeave={handleSelectionEnd}
                    >
                      {currentFiles.map(file => (
                        <div
                          key={file._id}
                          className="card"
                          data-file-id={file._id}
                          style={{
                            position: 'relative',
                            border: selectedFiles.includes(file._id) ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                            background: selectedFiles.includes(file._id) ? 'rgba(99, 102, 241, 0.1)' : 'var(--secondary-bg)',
                            transition: 'all 0.1s ease',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => handleFileSelection(e, file._id)}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              zIndex: 10
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFiles.includes(file._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFiles([...selectedFiles, file._id]);
                                } else {
                                  setSelectedFiles(selectedFiles.filter(id => id !== file._id));
                                }
                              }}
                              style={{ marginRight: '8px' }}
                            />
                          </div>
                          {file.type.startsWith('image/') ? (
                            <div style={{ position: 'relative' }}>
                              <img
                                src={`data:${file.type};base64,${file.data}`}
                                alt={file.name}
                                style={{
                                  width: '100%',
                                  height: '160px',
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  borderRadius: '8px 8px 0 0',
                                  transition: 'transform 0.2s ease',
                                  opacity: 1
                                }}
                                onClick={() => setLightbox(file)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                🖼️ Image
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              height: '160px',
                              background: 'linear-gradient(135deg, var(--tertiary-bg) 0%, var(--secondary-bg) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '48px',
                              borderRadius: '8px 8px 0 0',
                              position: 'relative',
                              opacity: 1
                            }}>
                              📄
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                📎 Document
                              </div>
                            </div>
                          )}
                          <div style={{ padding: '16px' }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              marginBottom: '8px',
                              wordBreak: 'break-word'
                            }}>
                              {file.name}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '12px'
                            }}>
                              <div>📊 {(file.size / 1024).toFixed(1)} KB</div>
                              <div>🕒 {new Date(file.added).toLocaleString()}</div>
                            </div>
                            {/* Inline buttons removed */}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canUpload && (
                  <div
                    className="card"
                    style={{
                      border: '2px dashed var(--accent-color)',
                      padding: '48px',
                      textAlign: 'center',
                      marginTop: '32px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.1) 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'var(--success-color)';
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.1) 100%)';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.1) 100%)';
                      handleFiles(e.dataTransfer.files);
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      Drop files here to upload
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      or click to browse
                    </div>
                    <input
                      type="file"
                      multiple
                      id="file-input"
                      onChange={(e) => handleFiles(e.target.files!)}
                      style={{
                        display: 'none'
                      }}
                    />
                    <label
                      htmlFor="file-input"
                      className="btn"
                      style={{ cursor: 'pointer' }}
                    >
                      📁 Choose Files
                    </label>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                      Maximum file size: 4MB
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '100px',
                fontSize: '18px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
                <div style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>No User Selected</div>
                <div style={{ fontSize: '14px' }}>Select a user from the sidebar to view their lab folders</div>
              </div>
            )}
          </div>

          <div className="ai-sidebar">
            <div style={{
              padding: '20px 16px',
              borderBottom: '1px solid var(--border-color)',
              fontWeight: '700',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span> Lab-Bot
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    fontSize: '10px',
                    padding: '2px 4px',
                    outline: 'none',
                    cursor: 'pointer',
                    marginLeft: '8px'
                  }}
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                  <option value="llama-3.2-11b-vision-preview">Llama 3.2 Vision</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                </select>
              </span>
              {chatHistory.length > 0 && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setChatHistory([])}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Clear Chat
                </button>
              )}
            </div>
            <div className="chat-container">
              {chatHistory.length === 0 && (
                <div style={{
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  marginTop: '60px',
                  padding: '0 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '48px', opacity: 0.5 }}>🧪</div>
                  <div style={{ fontWeight: '500', color: 'var(--text-color)' }}>Welcome to Lab-Bot!</div>
                  <div style={{ fontSize: '13px' }}>
                    I can help you analyze your screenshots, generate code snippets, or organize your lab categories.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                    {['Explain my files', 'How to organize?', 'Write React code'].map(suggestion => (
                      <button
                        key={suggestion}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '11px', borderRadius: '20px' }}
                        onClick={() => { setChatMessage(suggestion); }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className="markdown-content"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(marked.parse(msg.content.replace(/<create_file[\s\S]*?<\/create_file>/g, ''), {
                          renderer: Object.assign(new marked.Renderer(), {
                            code(token: any, language?: string) {
                              const code = typeof token === 'object' ? token.text : token;
                              const lang = typeof token === 'object' ? token.lang : language;
                              return `
                                <div class="code-block-container">
                                  <div class="code-block-header">
                                    <span>${lang || 'code'}</span>
                                    <button class="copy-code-btn" onclick="window.copyCode(this)">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L15.83 2.21A2 2 0 0014.4 1.6H10a2 2 0 00-2 2z"></path><path d="M16 20v2a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h2"></path></svg>
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                  <pre><code class="language-${lang}">${code}</code></pre>
                                </div>
                              `;
                            }
                          })
                        }) as string, {
                          ADD_ATTR: ['onclick']
                        })
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: '500' }}>{msg.content}</div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="chat-message bot-message" style={{ display: 'flex', gap: '4px', padding: '12px' }}>
                  <div className="loading" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lab-Bot is thinking...</span>
                </div>
              )}
            </div>
            <div className="chat-input-area">
              {!selectedUser && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--danger-color)',
                  textAlign: 'center',
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '6px'
                }}>
                  ⚠️ Select a user to start chatting
                </div>
              )}
              <textarea
                className="chat-input"
                placeholder={selectedUser ? "Ask Lab-Bot something..." : "Select a user first..."}
                value={chatMessage}
                disabled={!selectedUser || isTyping}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                style={{
                  minHeight: '80px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
                onClick={handleChat}
                disabled={!selectedUser || isTyping || !chatMessage.trim()}
              >
                {isTyping ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )
      }
      {
        lightbox && (
          <div
            className="fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              cursor: 'pointer'
            }}
            onClick={() => setLightbox(null)}
          >
            <div style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)'
            }}>
              <img
                src={`data:${lightbox.type};base64,${lightbox.data}`}
                alt={lightbox.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                color: 'white',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                  {lightbox.name}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {(lightbox.size / 1024).toFixed(1)} KB • {new Date(lightbox.added).toLocaleString()}
                </div>
              </div>
              <button
                className="btn btn-danger"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(null);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )
      }
      {/* Selection Rectangle Overlay */}
      {
        isSelecting && selectionStart && selectionEnd && (
          <div style={{
            position: 'fixed',
            left: Math.min(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionStart.x - selectionEnd.x),
            height: Math.abs(selectionStart.y - selectionEnd.y),
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid var(--accent-color)',
            pointerEvents: 'none',
            zIndex: 10000,
            borderRadius: '2px'
          }} />
        )
      }
    </div >
  );
}

export default App
