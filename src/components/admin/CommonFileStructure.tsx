import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Folder as FolderIcon,
  FolderPlus,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Eraser,
  Layers,
  Loader2,
  RefreshCcw,
  ChevronRight,
  ChevronDown,
  Info,
  Plus,
  X,
  Upload,
  FileText,
  FileCode2,
  Check,
  File as FileIcon,
  FilePlus
} from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface AdminFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface AdminFile {
  id: string;
  name: string;
  file_type: string;
  size?: number;
  folder_id?: string;
  url?: string;
  created_at?: string;
}

interface TreeNode {
  folder: AdminFolder;
  children: TreeNode[];
  files: AdminFile[];
}

type CreateTarget = { parentId: string | null; type: 'folder' | 'file' } | null;
type DeleteTarget =
  | { kind: 'folder'; id: string; name: string; descendantCount: number }
  | { kind: 'file'; id: string; name: string }
  | null;

function buildTree(folders: AdminFolder[], files: AdminFile[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  folders.forEach((f) => {
    map.set(f.id, { folder: f, children: [], files: [] });
  });
  const roots: TreeNode[] = [];
  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // Attach files to their folder — fall back to folder-name match if folder_id missing
  files.forEach((file) => {
    let targetFolderId = file.folder_id;
    if (!targetFolderId && (file as any).folders?.name) {
      const matched = folders.find(
        (f) =>
          f.name === (file as any).folders.name &&
          f.parent_id === (file as any).folders.parent_id
      );
      targetFolderId = matched?.id;
    }
    if (targetFolderId && map.has(targetFolderId)) {
      map.get(targetFolderId)!.files.push(file);
    }
  });
  // Sort siblings alphabetically
  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
    nodes.forEach((n) => {
      n.files.sort((a, b) => a.name.localeCompare(b.name));
      sortRecursive(n.children);
    });
  };
  sortRecursive(roots);
  return roots;
}

function countDescendants(node: TreeNode): number {
  let count = node.files.length;
  for (const c of node.children) {
    count += 1 + countDescendants(c);
  }
  return count;
}

const CommonFileStructure = () => {
  const [folders, setFolders] = useState<AdminFolder[]>([]);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin's own user id — needed for /folders POST because the backend
  // extracts user_id from the JWT, but the admin role may not auto-resolve.
  // Pulling it from the supabase session so we can pass it explicitly.
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  // Tree interaction state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createTarget, setCreateTarget] = useState<CreateTarget>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Destructive actions
  const [showEmptyFilesModal, setShowEmptyFilesModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [emptyConfirmText, setEmptyConfirmText] = useState('');
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isEmptyingFiles, setIsEmptyingFiles] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Card hover state (preserved from previous version)
  const [activeAction, setActiveAction] = useState<'empty' | 'clear' | null>(null);

  useEffect(() => {
    fetchStructure();
    // Load admin's user id from the supabase session
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setAdminUserId(session?.user?.id || null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const [foldersRes, filesRes] = await Promise.all([
        api.get('/admin/folders'),
        api.get('/admin/files'),
      ]);
      setFolders(foldersRes.folders || []);
      setFiles(filesRes.files || []);
    } catch (error) {
      console.error('Failed to sync common structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const tree = useMemo(() => buildTree(folders, files), [folders, files]);

  // Auto-expand root folders on first load so the user sees the structure
  useEffect(() => {
    if (tree.length > 0 && expanded.size === 0) {
      setExpanded(new Set(tree.map((n) => n.folder.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.length]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Create folder/file ─────────────────────────────────────────────────────
  const startCreate = (parentId: string | null, type: 'folder' | 'file') => {
    setCreateTarget({ parentId, type });
    setNewItemName('');
    setCreateError(null);
    // Auto-expand the parent so the input is visible
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
  };

  const handleCreateItem = async () => {
    if (!createTarget || !newItemName.trim()) {
      setCreateError('Name cannot be empty.');
      return;
    }

    const name = newItemName.trim();
    const parentId = createTarget.parentId;
    const isFile = createTarget.type === 'file';

    try {
      setIsCreating(true);
      setCreateError(null);

      if (parentId === null) {
        if (isFile) throw new Error("Cannot create files at root level.");
        // Root subject
        await api.post('/admin/subject', { name });
      } else {
        const parentFolder = folders.find(f => f.id === parentId);
        if (!parentFolder) throw new Error("Parent folder not found");
        
        if (parentFolder.parent_id === null) {
          // Creating inside a Subject (Experiment level)
          if (isFile) throw new Error("Cannot create files directly under a Subject.");
          await api.post('/admin/experiment', {
            name,
            subjectName: parentFolder.name,
          });
        } else {
          // Creating inside an Experiment (File level)
          if (!isFile) throw new Error("Cannot create nested subfolders.");
          
          const subjectFolder = folders.find(f => f.id === parentFolder.parent_id);
          if (!subjectFolder) throw new Error("Subject folder not found");
          
          await api.post('/admin/file', {
            name,
            experimentName: parentFolder.name,
            subjectName: subjectFolder.name
          });
        }
      }

      setCreateTarget(null);
      setNewItemName('');
      await fetchStructure();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[CommonFileStructure] Create failed:', error);
      setCreateError(
        `Create failed: ${error.message || 'unknown error'}. ` +
          'Open the browser console (F12) for the full request/response log.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const cancelCreate = () => {
    setCreateTarget(null);
    setNewItemName('');
    setCreateError(null);
  };

  // ── File upload ───────────────────────────────────────────────────────
  const triggerFileUpload = (folderId: string) => {
    setUploadTarget(folderId);
    // Defer click so React state has time to apply
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) {
      e.target.value = '';
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_id', uploadTarget);
      await api.post('/files/upload', formData);
      await fetchStructure();
    } catch (error: any) {
      alert(error.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
      e.target.value = '';
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const startDeleteFolder = (node: TreeNode) => {
    const descendantCount = countDescendants(node);
    setDeleteTarget({
      kind: 'folder',
      id: node.folder.id,
      name: node.folder.name,
      descendantCount,
    });
  };

  const startDeleteFile = (file: AdminFile) => {
    setDeleteTarget({ kind: 'file', id: file.id, name: file.name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      if (deleteTarget.kind === 'folder') {
        // Cascade — collect the folder id + all descendant folder ids
        const idsToDelete = collectFolderIds(folders, deleteTarget.id);
        await api.post('/admin/folders/delete', { ids: idsToDelete });
      } else {
        await api.delete(`/admin/file/${deleteTarget.id}`);
      }
      setDeleteTarget(null);
      await fetchStructure();
    } catch (error: any) {
      alert(error.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Destructive actions (unchanged) ───────────────────────────────────
  const handleEmptyFiles = async () => {
    if (emptyConfirmText !== 'EMPTY FILES') {
      alert('Authorization failed. Type "EMPTY FILES" exactly to proceed.');
      return;
    }
    try {
      setIsEmptyingFiles(true);
      await api.delete('/admin/reset', { type: 'files' });
      setFiles([]);
      setShowEmptyFilesModal(false);
      setEmptyConfirmText('');
      alert('Files purged. Folder hierarchy preserved.');
    } catch (error: any) {
      alert(error.message || 'Failed to empty files.');
    } finally {
      setIsEmptyingFiles(false);
    }
  };

  const handleClearEverything = async () => {
    if (clearConfirmText !== 'CLEAR EVERYTHING') {
      alert('Authorization failed. Type "CLEAR EVERYTHING" exactly to proceed.');
      return;
    }
    try {
      setIsClearingAll(true);
      await api.delete('/admin/reset', { type: 'full' });
      setFiles([]);
      setFolders([]);
      setShowClearAllModal(false);
      setClearConfirmText('');
      alert('Complete wipe executed. Structure rebuilt as default.');
    } catch (error: any) {
      alert(error.message || 'Failed to execute clear.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const totalSubjects = folders.filter((f) => !f.parent_id).length;
  const totalSubfolders = folders.filter((f) => f.parent_id).length;
  const totalFolders = folders.length;

  // ── Render: tree row ──────────────────────────────────────────────────
  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.folder.id);
    const fileCount = node.files.length;
    const childCount = node.children.length;
    const hasChildren = childCount + fileCount > 0;
    const isCreatingHere =
      createTarget?.parentId === node.folder.id;

    return (
      <div key={node.folder.id} className="select-none">
        <div
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            isExpanded ? 'bg-primary/5' : 'hover:bg-surface-overlay'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {/* Chevron toggle */}
          <button
            onClick={() => hasChildren && toggleExpand(node.folder.id)}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            ) : (
              <div className="w-1 h-1 rounded-full bg-border" />
            )}
          </button>

          {/* Folder icon + name */}
          <FolderIcon
            size={13}
            className={`shrink-0 ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`}
          />
          <span className="text-xs font-bold text-foreground truncate flex-1">
            {node.folder.name}
          </span>

          {/* File count badge */}
          {fileCount > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground/70 shrink-0">
              {fileCount}
            </span>
          )}

          {/* Hover actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
            {node.folder.parent_id === null && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreate(node.folder.id, 'folder');
                }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Add subfolder"
              >
                <FolderPlus size={12} />
              </button>
            )}
            {node.folder.parent_id !== null && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreate(node.folder.id, 'file');
                }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Create empty file"
              >
                <FilePlus size={12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerFileUpload(node.folder.id);
              }}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Upload file"
              disabled={isUploading}
            >
              <Upload size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startDeleteFolder(node);
              }}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Delete folder"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Expanded children + files + inline create */}
        {isExpanded && (
          <div className="space-y-0.5">
            {/* Inline create input for this folder */}
            {isCreatingHere && (
              <InlineFolderInput
                parentName={node.folder.name}
                depth={depth + 1}
                value={newItemName}
                error={createError}
                loading={isCreating}
                onChange={setNewItemName}
                onSubmit={handleCreateItem}
                onCancel={cancelCreate}
              />
            )}

            {/* Subfolders */}
            {node.children.map((child) => renderTreeNode(child, depth + 1))}

            {/* Files in this folder */}
            {node.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                depth={depth + 1}
                onDelete={() => startDeleteFile(file)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase font-orbitron text-foreground">
            Common File Structure
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the shared academic taxonomy. Click any folder to add subfolders or files.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchStructure}
            variant="outline"
            className="h-10 px-4 border-border text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl"
          >
            <RefreshCcw size={14} className="mr-2" /> Resync
          </Button>
          <div className="glass-panel px-4 py-2 border-border flex items-center gap-3">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Total Nodes
            </div>
            <div className="text-lg font-black text-primary">{totalFolders + files.length}</div>
          </div>
        </div>
      </div>

      {/* Hidden file input — triggered by upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        disabled={isUploading}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4 border-border app-surface">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Subjects
          </div>
          <div className="text-2xl font-display font-medium text-foreground">{totalSubjects}</div>
        </div>
        <div className="glass-panel p-4 border-border app-surface">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Subfolders
          </div>
          <div className="text-2xl font-display font-medium text-foreground">{totalSubfolders}</div>
        </div>
        <div className="glass-panel p-4 border-border app-surface">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Files
          </div>
          <div className="text-2xl font-display font-medium text-primary">{files.length}</div>
        </div>
        <div className="glass-panel p-4 border-border app-surface">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Total Depth
          </div>
          <div className="text-2xl font-display font-medium text-foreground">
            {folders.length === 0 ? 0 : Math.max(...folders.map((f) => depthOf(f, folders)))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left: Interactive Tree */}
        <div className="lg:col-span-2 glass-panel border-border flex flex-col overflow-hidden app-bg">
          <div className="p-4 border-b border-border app-surface flex items-center justify-between">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              Common Directory
            </h3>
            <Button
              onClick={() => startCreate(null, 'folder')}
              className="h-7 px-3 bg-primary text-primary-foreground hover:bg-foreground hover:text-background text-[9px] font-black uppercase tracking-widest rounded-lg border-none shadow-accent-glow"
            >
              <Plus size={12} className="mr-1" /> New Subject
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 size={20} className="text-primary animate-spin" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Syncing…
                </span>
              </div>
            ) : (
              <>
                {/* Inline create at root — ALWAYS rendered when "New Subject" is clicked,
                    regardless of whether the tree is empty or not. */}
                {createTarget?.parentId === null && (
                  <InlineFolderInput
                    parentName="root"
                    depth={0}
                    value={newItemName}
                    error={createError}
                    loading={isCreating}
                    onChange={setNewItemName}
                    onSubmit={handleCreateItem}
                    onCancel={cancelCreate}
                  />
                )}

                {/* Empty state — only when there are no folders AND the user isn't in the
                    middle of creating one. */}
                {tree.length === 0 && !createTarget && (
                  <EmptyTree onCreate={() => startCreate(null, 'folder')} />
                )}

                {/* Tree */}
                {tree.map((node) => renderTreeNode(node))}
              </>
            )}
          </div>

          {isUploading && (
            <div className="px-4 py-2 border-t border-border app-surface flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary">
              <Loader2 size={12} className="animate-spin" />
              Uploading file…
            </div>
          )}
        </div>

        {/* Right: Destructive Action Cards */}
        <div className="space-y-6 content-start">
          <div
            onMouseEnter={() => setActiveAction('empty')}
            onMouseLeave={() => setActiveAction(null)}
            className={`glass-panel p-6 border-border app-surface flex flex-col gap-4 transition-all ${
              activeAction === 'empty' ? 'border-amber-500/40 shadow-2xl' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Eraser size={22} />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-amber-500/80 border border-amber-500/20 px-2 py-0.5 rounded">
                Selective
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                Empty Files
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Remove every uploaded file across all researchers while{' '}
                <span className="text-foreground font-bold">preserving the folder hierarchy</span>{' '}
                intact.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              <Info size={12} className="text-amber-500" />
              <span>
                Type <span className="text-foreground">EMPTY FILES</span> to confirm
              </span>
            </div>
            <Button
              onClick={() => {
                setShowEmptyFilesModal(true);
                setEmptyConfirmText('');
              }}
              disabled={files.length === 0}
              className="mt-auto h-11 bg-amber-500/15 hover:bg-amber-500 hover:text-foreground text-amber-500 border border-amber-500/30 font-mono text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-40"
            >
              <Eraser size={14} className="mr-2" /> Empty Files · Keep Folders
            </Button>
          </div>

          <div
            onMouseEnter={() => setActiveAction('clear')}
            onMouseLeave={() => setActiveAction(null)}
            className={`glass-panel p-6 border-destructive/30 bg-destructive/5 flex flex-col gap-4 transition-all ${
              activeAction === 'clear' ? 'border-destructive shadow-2xl' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                <ShieldAlert size={22} />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-destructive/80 border border-destructive/30 px-2 py-0.5 rounded">
                Catastrophic
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-destructive">
                Clear Everything
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wipe <span className="text-foreground font-bold">all files and folders</span> from
                the global vault permanently.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              <AlertTriangle size={12} className="text-destructive" />
              <span>
                Type <span className="text-destructive">CLEAR EVERYTHING</span> to confirm
              </span>
            </div>
            <Button
              onClick={() => {
                setShowClearAllModal(true);
                setClearConfirmText('');
              }}
              disabled={totalFolders === 0 && files.length === 0}
              className="mt-auto h-11 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl border-none disabled:opacity-40"
            >
              <Trash2 size={14} className="mr-2" /> Clear Everything
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md glass-panel border-destructive/30 bg-destructive/5 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-destructive/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-destructive">
                    Delete {deleteTarget.kind}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
                    {deleteTarget.name}
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                    {deleteTarget.kind === 'folder' ? (
                      <>
                        <p>
                          Permanently delete folder{' '}
                          <span className="text-destructive font-bold">
                            "{deleteTarget.name}"
                          </span>
                          ?
                        </p>
                        {deleteTarget.descendantCount > 0 && (
                          <p>
                            This folder contains{' '}
                            <span className="text-destructive font-bold">
                              {deleteTarget.descendantCount}
                            </span>{' '}
                            sub-item
                            {deleteTarget.descendantCount === 1 ? '' : 's'} (subfolders + files) that
                            will also be removed.
                          </p>
                        )}
                      </>
                    ) : (
                      <p>
                        Permanently delete file{' '}
                        <span className="text-destructive font-bold">"{deleteTarget.name}"</span>?
                      </p>
                    )}
                    <p className="text-muted-foreground/80">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="flex-1 h-11 border-border text-muted-foreground hover:text-foreground hover:bg-surface-overlay font-mono text-[10px] uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 h-11 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl border-none disabled:opacity-40"
                  >
                    {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Empty Files Modal */}
      <AnimatePresence>
        {showEmptyFilesModal && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md glass-panel border-amber-500/30 bg-amber-500/5 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-amber-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Eraser size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-500">
                    Empty Files · Keep Folders
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
                    Folders remain operational
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Permanently delete{' '}
                    <span className="text-amber-500 font-bold">{files.length}</span> file
                    {files.length === 1 ? '' : 's'}. The {totalSubjects} subject
                    {totalSubjects === 1 ? '' : 's'} and {totalSubfolders} subfolder
                    {totalSubfolders === 1 ? '' : 's'} in your hierarchy will remain.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    Authorization Phrase
                  </label>
                  <input
                    type="text"
                    placeholder="Type: EMPTY FILES"
                    value={emptyConfirmText}
                    onChange={(e) => setEmptyConfirmText(e.target.value)}
                    autoFocus
                    className="w-full app-bg border border-border rounded-xl py-3 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmptyFilesModal(false);
                      setEmptyConfirmText('');
                    }}
                    disabled={isEmptyingFiles}
                    className="flex-1 h-11 border-border text-muted-foreground hover:text-foreground hover:bg-surface-overlay font-mono text-[10px] uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmptyFiles}
                    disabled={isEmptyingFiles || emptyConfirmText !== 'EMPTY FILES'}
                    className="flex-1 h-11 bg-amber-500 hover:bg-amber-500/80 text-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl border-none disabled:opacity-40"
                  >
                    {isEmptyingFiles ? 'Emptying…' : 'Confirm Empty'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Everything Modal */}
      <AnimatePresence>
        {showClearAllModal && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md glass-panel border-destructive/30 bg-destructive/5 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-destructive/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-destructive">
                    Clear Everything
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
                    Total vault purge
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This will wipe{' '}
                    <span className="text-destructive font-bold">all {files.length} files</span>,{' '}
                    <span className="text-destructive font-bold">{totalSubjects} subjects</span>,
                    and{' '}
                    <span className="text-destructive font-bold">
                      {totalSubfolders} subfolders
                    </span>{' '}
                    from every researcher. This action cannot be reversed.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    Authorization Phrase
                  </label>
                  <input
                    type="text"
                    placeholder="Type: CLEAR EVERYTHING"
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    autoFocus
                    className="w-full app-bg border border-border rounded-xl py-3 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground focus:outline-none focus:border-destructive/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowClearAllModal(false);
                      setClearConfirmText('');
                    }}
                    disabled={isClearingAll}
                    className="flex-1 h-11 border-border text-muted-foreground hover:text-foreground hover:bg-surface-overlay font-mono text-[10px] uppercase tracking-widest rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleClearEverything}
                    disabled={isClearingAll || clearConfirmText !== 'CLEAR EVERYTHING'}
                    className="flex-1 h-11 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-mono text-[10px] uppercase tracking-widest rounded-xl border-none disabled:opacity-40"
                  >
                    {isClearingAll ? 'Wiping…' : 'Confirm Wipe'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Inline create input ─────────────────────────────────────────────────
const InlineFolderInput: React.FC<{
  parentName: string;
  depth: number;
  value: string;
  error: string | null;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ parentName, depth, value, error, loading, onChange, onSubmit, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="flex flex-col gap-1"
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
        <FolderPlus size={13} className="text-primary shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
          New folder in {parentName === 'root' ? '/' : parentName}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="folder name"
          disabled={loading}
          className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/40 min-w-0"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="p-1 rounded text-primary hover:bg-primary/20 transition-all disabled:opacity-30"
          title="Create (Enter)"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-all"
          title="Cancel (Esc)"
        >
          <X size={12} />
        </button>
      </div>
      {error && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px] leading-relaxed"
          style={{ marginLeft: `${depth * 14 + 8}px` }}
          role="alert"
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-mono uppercase tracking-widest text-[9px] mb-0.5">Error</div>
            <div className="text-foreground/90 font-sans normal-case tracking-normal">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── File row ────────────────────────────────────────────────────────────
const FileRow: React.FC<{
  file: AdminFile;
  depth: number;
  onDelete: () => void;
}> = ({ file, depth, onDelete }) => {
  const isCode = file.file_type && !file.file_type.includes('image') && !file.file_type.includes('pdf');
  const Icon = isCode ? FileCode2 : file.file_type?.includes('image') ? FileIcon : FileText;
  return (
    <div
      className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-surface-overlay transition-all"
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <div className="w-4 h-4 shrink-0" />
      <Icon size={12} className="text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground truncate flex-1">{file.name}</span>
      {file.size !== undefined && (
        <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
        title="Delete file"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────
const EmptyTree: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
      <FolderPlus size={24} />
    </div>
    <div className="space-y-1">
      <h4 className="text-sm font-bold text-foreground">No structure yet</h4>
      <p className="text-xs text-muted-foreground max-w-xs">
        Start by creating your first subject. You can nest experiments and subfolders under it
        later.
      </p>
    </div>
    <Button
      onClick={onCreate}
      className="h-9 px-4 bg-primary text-primary-foreground hover:bg-foreground hover:text-background text-[10px] font-black uppercase tracking-widest rounded-lg border-none shadow-accent-glow"
    >
      <Plus size={12} className="mr-1" /> Create First Subject
    </Button>
  </div>
);

// ── Helpers ─────────────────────────────────────────────────────────────
function collectFolderIds(folders: AdminFolder[], rootId: string): string[] {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = folders.filter((f) => f.parent_id === current).map((f) => f.id);
    ids.push(...children);
    queue.push(...children);
  }
  return ids;
}

function depthOf(folder: AdminFolder, all: AdminFolder[]): number {
  let depth = 0;
  let current: AdminFolder | undefined = folder;
  while (current && current.parent_id) {
    depth++;
    current = all.find((f) => f.id === current!.parent_id);
  }
  return depth;
}

export default CommonFileStructure;