import React, { useState } from 'react';
import {
  Search,
  RefreshCcw,
  Plus,
  PlusCircle,
  ChevronRight,
  Folder,
  Trash2,
  FileText,
  Send,
  Download
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/ThemeContext";
import GreenRecordsUI from "./GreenRecordsUI";

interface MyRecordsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSearching: boolean;
  searchLanguage: string;
  setSearchLanguage: (val: string) => void;
  searchType: string;
  setSearchType: (val: string) => void;
  searchResults: any[];
  selectedFiles: string[];
  setIsSelecting: (val: boolean) => void;
  toggleSelection: (id: string) => void;
  isSelecting: boolean;
  addSelection: (id: string) => void;
  setPreviewFile: (file: any) => void;
  setContextMenu: (menu: any) => void;
  deleteFile: (id: string) => void;
  selectedFolder: string | null;
  setSelectedFolder: (id: string | null) => void;
  currentFolders: any[];
  currentFiles: any[];
  addCategory: () => void;
  setSelectedFiles: (ids: string[]) => void;
  setSharingFileIds: (ids: string[]) => void;
  bulkDownloadFiles: () => void;
  bulkDeleteFiles: () => void;
  handleFileUpload: (files: FileList | File[] | React.ChangeEvent<HTMLInputElement>) => void;
  canUpload: boolean;
}

const getExtension = (fileType: string) => {
  if (!fileType) return '';
  if (fileType.includes('python')) return '.py';
  if (fileType.includes('javascript')) return '.js';
  if (fileType.includes('java')) return '.java';
  if (fileType.includes('cpp') || fileType.includes('c++')) return '.cpp';
  if (fileType.includes('c')) return '.c';
  if (fileType.includes('html')) return '.html';
  if (fileType.includes('css')) return '.css';
  if (fileType.includes('png')) return '.png';
  if (fileType.includes('jpeg') || fileType.includes('jpg')) return '.jpg';
  if (fileType.includes('pdf')) return '.pdf';
  return '';
};

const getFileNameWithExtension = (name: string, fileType: string) => {
  const cleanName = name.replace(/^\d+-/, ''); // Remove the numeric prefix
  const ext = getExtension(fileType);
  if (ext && !cleanName.toLowerCase().endsWith(ext)) {
    return `${cleanName}${ext}`;
  }
  return cleanName;
};

const MyRecords: React.FC<MyRecordsProps> = ({
  searchQuery,
  setSearchQuery,
  isSearching,
  searchLanguage,
  setSearchLanguage,
  searchType,
  setSearchType,
  searchResults,
  selectedFiles,
  setIsSelecting,
  toggleSelection,
  isSelecting,
  addSelection,
  setPreviewFile,
  setContextMenu,
  deleteFile,
  selectedFolder,
  setSelectedFolder,
  currentFolders,
  currentFiles,
  addCategory,
  setSelectedFiles,
  setSharingFileIds,
  bulkDownloadFiles,
  bulkDeleteFiles,
  handleFileUpload,
  canUpload
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { theme } = useTheme();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUpload) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUpload) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (canUpload && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Modern Dark variant → original dark UI (black bg, mint accents, folder clip-tabs)
  if (theme === 'dark') {
    return <GreenRecordsUI
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isSearching={isSearching}
      searchLanguage={searchLanguage}
      setSearchLanguage={setSearchLanguage}
      searchType={searchType}
      setSearchType={setSearchType}
      searchResults={searchResults}
      selectedFiles={selectedFiles}
      setIsSelecting={setIsSelecting}
      toggleSelection={toggleSelection}
      isSelecting={isSelecting}
      addSelection={addSelection}
      setPreviewFile={setPreviewFile}
      setContextMenu={setContextMenu}
      deleteFile={deleteFile}
      selectedFolder={selectedFolder}
      setSelectedFolder={setSelectedFolder}
      currentFolders={currentFolders}
      currentFiles={currentFiles}
      addCategory={addCategory}
      setSelectedFiles={setSelectedFiles}
      setSharingFileIds={setSharingFileIds}
      bulkDownloadFiles={bulkDownloadFiles}
      bulkDeleteFiles={bulkDeleteFiles}
      handleFileUpload={handleFileUpload}
      canUpload={canUpload}
    />;
  }

  return (
    <div
      className={`space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-[500px] rounded-xl transition-all ${isDraggingOver ? 'bg-primary/5 border-2 border-dashed border-primary/50 ring-4 ring-primary/10' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="eyebrow">№ 02 — Repository</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-medium tracking-tight text-foreground">
            My Records
          </h2>
          <div className="ink-rule mt-4 mb-3" />
          <p className="text-muted-foreground text-sm">Filed laboratory works, organized for measured retrieval.</p>
        </div>
        {canUpload && (
          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium text-sm hover:bg-foreground hover:text-background transition-all duration-300 border border-primary hover:border-foreground cursor-pointer">
            <PlusCircle size={16} />
            <span>New Record</span>
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* Smart Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or content..."
            className="w-full bg-card/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <RefreshCcw size={14} className="text-primary animate-spin" />
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
           <select 
             value={searchLanguage} 
             onChange={(e) => setSearchLanguage(e.target.value)}
             className="bg-muted border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
           >
             <option value="">Language</option>
             <option value="python">Python</option>
             <option value="javascript">JavaScript</option>
             <option value="java">Java</option>
             <option value="cpp">C++</option>
             <option value="c">C</option>
             <option value="html">HTML</option>
             <option value="css">CSS</option>
           </select>
           <select 
             value={searchType} 
             onChange={(e) => setSearchType(e.target.value)}
             className="bg-muted border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
           >
             <option value="">Asset Type</option>
             <option value="program">Programs</option>
             <option value="record">Records</option>
             <option value="screenshot">Screenshots</option>
           </select>
        </div>
      </div>

      {searchQuery || searchLanguage || searchType ? (
        <div className="space-y-6">
          <span className="eyebrow">Search Results · {searchResults.length}</span>
          {searchResults.length === 0 && !isSearching ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-4 glass-panel border-border">
              <div className="w-16 h-16 rounded-full bg-surface-overlay border border-border flex items-center justify-center">
                <Search size={28} className="text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-display font-medium text-foreground">No records found</h3>
                <p className="text-muted-foreground text-sm max-w-xs">Try adjusting your filters or searching for a different keyword.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {searchResults.map(file => (
                <div 
                  key={file.id} 
                  className={`glass-panel overflow-hidden hover-glow animate-in group select-none ${selectedFiles.includes(file.id) ? 'ring-2 ring-primary shadow-accent-glow' : ''}`} 
                  onMouseDown={() => { setIsSelecting(true); toggleSelection(file.id); }} 
                  onMouseEnter={() => { if (isSelecting) addSelection(file.id); }} 
                  onDoubleClick={() => setPreviewFile(file)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file.id, name: file.name, type: 'file' } }); }}
                >
                  <div className="aspect-video bg-background relative flex items-center justify-center">
                    {file.file_type.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={36} className="text-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{file.file_type.split('/')[1] || 'file'}</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap pr-2">
                      {file.language && (
                        <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md border border-primary/30 uppercase font-bold">{file.language}</span>
                      )}
                      {file.tags && file.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="text-[8px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/50">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 truncate">
                      <h3 className="font-bold truncate text-sm">{file.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {(!selectedFolder || currentFolders.length > 0) && (
            <div className="space-y-4">
              <span className="eyebrow">Categories</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentFolders.map(folder => (
                  <div key={folder.id} className="specimen-card cursor-pointer group flex items-start gap-3 animate-in" onClick={() => setSelectedFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: folder.id, name: folder.name, type: 'folder' } }); }}>
                    <div className="w-10 h-10 rounded-md bg-surface-overlay flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-border">
                      <Folder size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="text-base font-display font-medium mb-0.5 leading-tight text-foreground">{folder.name}</h3>
                      <p className="font-mono text-[10px] text-muted-foreground">{new Date(folder.created_at).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/50 self-center" />
                  </div>
                ))}

                <button onClick={addCategory} className="border border-dashed border-border rounded-md p-4 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                  <Plus size={16} />
                  <span className="text-sm">{selectedFolder ? 'New Sub-Category' : 'New Category'}</span>
                </button>
              </div>
            </div>
          )}

          {selectedFolder && (
            <>
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap items-center justify-between bg-surface-overlay border border-border rounded-md p-3 md:p-4 mb-6 animate-in gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary">№ {selectedFiles.length}</span>
                    <span className="text-sm font-medium text-foreground">files selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center sm:justify-end w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => setSelectedFiles([])} className="h-8 md:h-9 flex-1 sm:flex-none text-xs">Cancel</Button>
                    <Button variant="outline" size="sm" onClick={() => { setSharingFileIds(selectedFiles); setSelectedFiles([]); }} className="h-8 md:h-9 flex-1 sm:flex-none text-xs"><Send size={12} className="mr-1 md:mr-2" /> Share</Button>
                    <Button size="sm" onClick={bulkDownloadFiles} className="h-8 md:h-9 flex-1 sm:flex-none text-xs bg-primary text-primary-foreground hover:bg-foreground hover:text-background border-none"><Download size={12} className="mr-1 md:mr-2" /> Download</Button>
                    <Button variant="outline" size="sm" onClick={bulkDeleteFiles} className="h-8 md:h-9 flex-1 sm:flex-none text-xs text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">Delete</Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {canUpload && (
                  <label className="glass-panel p-6 border-dashed border-2 border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[160px]">
                    <PlusCircle size={32} />
                    <span className="font-bold text-sm">Upload Lab Results</span>
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                )}

                {currentFiles.map(file => {
                  const safeFileName = getFileNameWithExtension(file.name, file.file_type);
                  return (
                  <a 
                    key={file.id} 
                    href={file.url}
                    download={safeFileName}
                    className={`glass-panel overflow-hidden hover-glow animate-in group select-none block ${selectedFiles.includes(file.id) ? 'ring-2 ring-primary shadow-accent-glow' : ''}`} 
                    draggable="true"
                    onDragStart={(e) => {
                      // Chrome requires exact mime:filename:url format for DownloadURL
                      e.dataTransfer.setData("DownloadURL", `application/octet-stream:${safeFileName}:${file.url}`);
                    }}
                    onClick={(e) => {
                      // Prevent standard click navigation; allow double-click for preview
                      e.preventDefault(); 
                    }}
                    onMouseDown={() => { setIsSelecting(true); toggleSelection(file.id); }} 
                    onMouseEnter={() => { if (isSelecting) addSelection(file.id); }} 
                    onDoubleClick={() => setPreviewFile(file)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file.id, name: file.name, type: 'file' } }); }}
                  >
                    <div className="aspect-video bg-background relative flex items-center justify-center">
                      {file.file_type.startsWith('image/') ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileText size={36} className="text-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{file.file_type.split('/')[1] || 'file'}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/40 backdrop-blur-md text-foreground hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}>
                          <Search size={14} />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap pr-2">
                        {file.language && (
                          <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md border border-primary/30 uppercase font-bold">{file.language}</span>
                        )}
                        {file.tags && file.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <span key={idx} className="text-[8px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/50">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-background/40 border-t border-border flex items-center justify-between group-hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold truncate text-foreground">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteFile(file.id); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </a>
                )})}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyRecords;
