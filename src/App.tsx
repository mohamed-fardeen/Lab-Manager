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
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <header style={{ textAlign: 'center', padding: '20px', background: 'var(--secondary-bg)', fontSize: '24px', fontWeight: 'bold' }}>
        Lab Works
      </header>
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '18px' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ width: '250px', background: 'var(--secondary-bg)', padding: '10px', overflowY: 'auto' }} onContextMenu={(e) => { e.preventDefault(); setContextMenu({x: e.clientX, y: e.clientY}); }}>
            <h3>Users</h3>
            {users.map(user => (
              <div key={user._id} style={{ padding: '5px', cursor: 'pointer', background: selectedUser === user._id ? 'var(--accent-color)' : 'transparent' }} onClick={() => { setSelectedUser(user._id); setSelectedFolder(null); }}>
                {user.name}
              </div>
            ))}
            {contextMenu && (
              <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--secondary-bg)', border: '1px solid var(--border-color)', padding: '5px', zIndex: 1000 }} onClick={() => setContextMenu(null)}>
                <div onClick={addUser} style={{ cursor: 'pointer' }}>Add User</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {selectedUser ? (
              <>
                {selectedFolder && (
                  <button onClick={() => setSelectedFolder(null)} style={{ marginBottom: '10px' }}>Back</button>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                  {currentFolders.map(folder => (
                    <div key={folder._id} style={{ border: '1px solid var(--border-color)', padding: '15px', background: 'var(--secondary-bg)', cursor: 'pointer', borderRadius: '8px' }} onClick={() => handleFolderClick(folder._id)}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{folder.name}</div>
                      <div style={{ fontSize: '12px', color: '#ccc' }}>{new Date(folder.created).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {canUpload && currentFiles.map(file => (
                    <div key={file._id} style={{ border: '1px solid var(--border-color)', padding: '10px', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
                      {file.type.startsWith('image/') ? (
                        <img src={`data:${file.type};base64,${file.data}`} alt={file.name} style={{ width: '100%', height: '120px', objectFit: 'cover', cursor: 'pointer', borderRadius: '4px' }} onClick={() => setLightbox(file)} />
                      ) : (
                        <div style={{ height: '120px', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', borderRadius: '4px' }}>
                          📄
                        </div>
                      )}
                      <div style={{ fontSize: '14px', marginTop: '10px' }}>{file.name}</div>
                      <div style={{ fontSize: '12px', color: '#ccc' }}>{(file.size / 1024).toFixed(1)} KB</div>
                      <div style={{ fontSize: '12px', color: '#ccc' }}>{new Date(file.added).toLocaleString()}</div>
                      <div style={{ marginTop: '10px' }}>
                        <button onClick={() => downloadFile(file)} style={{ marginRight: '5px' }}>Download</button>
                        <button onClick={() => deleteFile(file._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                {canUpload && (
                  <div
                    style={{ border: '2px dashed var(--accent-color)', padding: '40px', textAlign: 'center', marginTop: '20px', borderRadius: '8px', background: 'rgba(100, 108, 255, 0.1)' }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFiles(e.dataTransfer.files);
                    }}
                  >
                    Drop files here or <input type="file" multiple onChange={(e) => handleFiles(e.target.files!)} style={{ marginLeft: '10px' }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '18px' }}>Select a user to view their folders</div>
            )}
          </div>
        </div>
      )}
      {lightbox && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setLightbox(null)}>
          <img src={`data:${lightbox.type};base64,${lightbox.data}`} alt={lightbox.name} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}
      {contextMenu && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 999 }} onClick={() => setContextMenu(null)}></div>}
    </div>
  );
}

export default App