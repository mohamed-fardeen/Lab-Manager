import { useState, useEffect } from 'react'

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
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, userId?: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadFolders(selectedUser);
      setSelectedFolder(null);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder);
    }
  }, [selectedFolder]);

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
      const response = await fetch(`/api/files/${folderId}`);
      const data = await response.json();
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
        const foldersResponse = await fetch(`/api/folders/${userId}`);
        const userFolders = await foldersResponse.json();
        
        // Delete all files and folders for this user
        for (const folder of userFolders) {
          // Delete all files in this folder
          const filesResponse = await fetch(`/api/files/${folder._id}`);
          const files = await filesResponse.json();
          for (const file of files) {
            await fetch(`/api/files/${file._id}`, { method: 'DELETE' });
          }
          // Delete the folder
          await fetch(`/api/folders/${folder._id}`, { method: 'DELETE' });
        }
        
        // Delete the user
        await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        
        // Refresh UI
        if (selectedUser === userId) {
          setSelectedUser(null);
          setSelectedFolder(null);
        }
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  async function renameUser(userId: string, currentName: string) {
    const newName = prompt('Enter new name:', currentName);
    if (newName && newName !== currentName) {
      try {
        await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        setUsers(users.map(user => 
          user._id === userId ? { ...user, name: newName } : user
        ));
      } catch (error) {
        console.error('Error renaming user:', error);
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
    return files;
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

  async function deleteFile(fileId: string) {
    if (!selectedFolder) return;
    if (confirm('Delete file?')) {
      try {
        await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
        loadFiles(selectedFolder); // Refresh files
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
            borderRight: '1px solid var(--border-color)',
            maxHeight: '100vh',
            position: 'sticky',
            top: '0'
          }} 
          onContextMenu={(e) => { 
            e.preventDefault(); 
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setContextMenu({x: e.clientX, y: e.clientY, userId: undefined}); 
          }}>
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
                  onClick={() => { setSelectedUser(user._id); setSelectedFolder(null); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setContextMenu({x: e.clientX, y: e.clientY, userId: user._id});
                  }}
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
            {contextMenu && (
              <div 
                className="card fade-in"
                style={{ 
                  position: 'fixed', 
                  top: contextMenu.y, 
                  left: contextMenu.x, 
                  background: 'var(--tertiary-bg)', 
                  border: '1px solid var(--accent-color)',
                  padding: '8px 0',
                  zIndex: 1000,
                  minWidth: '160px',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow)'
                }} 
                onClick={() => setContextMenu(null)}
              >
                {contextMenu.userId ? (
                  // User context menu
                  <>
                    <div 
                      onClick={() => renameUser(contextMenu.userId!, users.find(u => u._id === contextMenu.userId)?.name || '')}
                      style={{ 
                        cursor: 'pointer',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      ✏️ Rename User
                    </div>
                    <div 
                      onClick={() => deleteUser(contextMenu.userId!)}
                      style={{ 
                        cursor: 'pointer',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s ease',
                        borderTop: '1px solid var(--border-color)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🗑️ Delete User
                    </div>
                  </>
                ) : (
                  // Sidebar context menu
                  <div 
                    onClick={addUser} 
                    style={{ 
                      cursor: 'pointer',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Add User
                  </div>
                )}
              </div>
            )}
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
                          onClick={() => handleFolderClick(folder._id)}
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
                      gap: '8px'
                    }}>
                      📄 Files ({currentFiles.length})
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {currentFiles.map(file => (
                        <div key={file._id} className="card" style={{ position: 'relative' }}>
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
                                  transition: 'transform 0.2s ease'
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
                              position: 'relative'
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => downloadFile(file)}
                              >
                                ⬇️ Download
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteFile(file._id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
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
                      onChange={(e) => handleFiles(e.target.files!)} 
                      style={{ 
                        display: 'none',
                        id: 'file-input'
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
        </div>
      )}
      {lightbox && (
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
      )}
      {contextMenu && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 999 }} onClick={() => setContextMenu(null)}></div>
      )}
    </div>
  );
}

export default App
