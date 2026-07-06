import React from 'react';

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

const GreenRecordsUI: React.FC<MyRecordsProps> = ({
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
  const displayFiles = searchQuery || searchLanguage || searchType ? searchResults : currentFiles;

  const folderColors = [
    { bg: 'bg-[#6effce]/20', border: 'hover:border-[#6effce]/50', icon: 'text-[#6effce]', hoverBg: 'group-hover:bg-[#6effce]/30' },
    { bg: 'bg-[#9ecaff]/20', border: 'hover:border-[#9ecaff]/50', icon: 'text-[#9ecaff]', hoverBg: 'group-hover:bg-[#9ecaff]/30' },
    { bg: 'bg-[#ffbf4e]/20', border: 'hover:border-[#ffbf4e]/50', icon: 'text-[#ffbf4e]', hoverBg: 'group-hover:bg-[#ffbf4e]/30' },
    { bg: 'bg-[#ffb4ab]/20', border: 'hover:border-[#ffb4ab]/50', icon: 'text-[#ffb4ab]', hoverBg: 'group-hover:bg-[#ffb4ab]/30' },
  ];

  return (
    <div className="bg-[#0F0F0F] text-[#e5e2e1] font-sans antialiased selection:bg-[#00e5b0]/30 min-h-[500px] rounded-3xl p-8 relative">
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .folder-clip {
            clip-path: polygon(0% 0%, 65% 0%, 75% 15%, 100% 15%, 100% 100%, 0% 100%);
        }
        .card-premium {
            background: linear-gradient(145deg, #222222, #181818);
            box-shadow: inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.5);
        }
        .card-premium:hover {
            box-shadow: inset 0 1px 1px rgba(110, 255, 206, 0.1), 0 10px 30px rgba(0,0,0,0.7);
        }
        .inner-glow-py { box-shadow: inset 0 0 15px rgba(110, 255, 206, 0.05); }
        .inner-glow-csv { box-shadow: inset 0 0 15px rgba(158, 202, 255, 0.05); }
        .inner-glow-pdf { box-shadow: inset 0 0 15px rgba(255, 180, 171, 0.05); }

        .code-snippet-bg {
            background: radial-gradient(circle at top left, #2a2a2a 0%, #1a1a1a 100%);
        }
        .pdf-fold {
            clip-path: polygon(0 0, 85% 0, 100% 15%, 100% 100%, 0 100%);
        }
        .pdf-corner {
            position: absolute;
            top: 0;
            right: 0;
            width: 15%;
            height: 15%;
            background: rgba(255,255,255,0.1);
            border-bottom-left-radius: 4px;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 10s linear infinite;
        }
      `}</style>

      {/* Page Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <span className="text-xs font-semibold text-[#6effce] uppercase mb-2 block tracking-wider">System Repository</span>
          <h1 className="text-4xl font-semibold tracking-tight text-[#e5e2e1]">My Records</h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#2E2E2E] text-[#9ecaff] hover:bg-[#252525] rounded transition-colors text-sm font-medium">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filters
          </button>
          {canUpload && (
            <label className="flex items-center gap-2 px-6 py-2 bg-[#00e5b0] text-[#006149] hover:opacity-90 rounded font-semibold transition-all shadow-[0_4px_10px_rgba(0,229,176,0.1)] hover:shadow-[0_4px_15px_rgba(0,229,176,0.2)] cursor-pointer">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>upload</span>
              New Record
              <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Filters & Stats Bento */}
      <div className="grid grid-cols-12 gap-6 mb-12">
        {/* Active Filters */}
        <div className="col-span-12 lg:col-span-8 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6">
          <div className="flex flex-col mb-6">
             <div className="relative flex-1 group w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-zinc-500 text-sm">search</span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or content..."
                  className="w-full bg-[#0F0F0F] border border-[#2E2E2E] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#00e5b0] transition-all text-[#e5e2e1] placeholder:text-zinc-600"
                />
             </div>
          </div>
          <div className="flex flex-wrap gap-8">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-3 tracking-wider">LANGUAGE</span>
              <div className="flex gap-2">
                {['python', 'javascript', 'cpp', 'rust'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSearchLanguage(searchLanguage === lang ? '' : lang)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${searchLanguage === lang ? 'bg-[#00E5B0] text-[#003829] shadow-[0_0_15px_rgba(0,229,176,0.3)]' : 'border border-[#2E2E2E] text-zinc-400 hover:border-[#00E5B0]'}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px bg-zinc-800 self-stretch hidden md:block"></div>
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-3 tracking-wider">ASSET TYPE</span>
              <div className="flex gap-2">
                {[
                  { id: 'program', label: 'Programs' },
                  { id: 'record', label: 'Records' },
                  { id: 'screenshot', label: 'Screenshots' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSearchType(searchType === type.id ? '' : type.id)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${searchType === type.id ? 'bg-[#00E5B0] text-[#003829] shadow-[0_0_15px_rgba(0,229,176,0.3)]' : 'border border-[#2E2E2E] text-zinc-400 hover:border-[#00E5B0]'}`}
                  >
                    {type.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="col-span-12 lg:col-span-4 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider">TOTAL STORAGE</span>
            <span className="text-[#6effce] font-mono text-sm">1.28%</span>
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#00e5b0]" style={{ width: '1.28%' }}></div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-semibold leading-none">{currentFiles.length + currentFolders.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">Items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold leading-none">7.96</p>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">MB Used</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5b0] animate-pulse"></span>
                <p className="text-2xl font-semibold leading-none">ONLINE</p>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">Status</p>
            </div>
          </div>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between bg-[#00E5B0]/10 border border-[#00E5B0]/30 rounded-xl p-4 mb-8 shadow-[0_0_15px_rgba(0,229,176,0.1)] animate-in fade-in zoom-in duration-300">
          <span className="font-semibold text-[#00E5B0]">{selectedFiles.length} item(s) selected</span>
          <div className="flex gap-3">
            <button onClick={() => setSelectedFiles([])} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={bulkDownloadFiles} className="px-4 py-2 bg-[#00E5B0]/20 text-[#00E5B0] rounded text-xs font-semibold hover:bg-[#00E5B0]/30 transition-colors">Download</button>
            <button onClick={bulkDeleteFiles} className="px-4 py-2 bg-[#ffb4ab]/20 text-[#ffb4ab] rounded text-xs font-semibold hover:bg-[#ffb4ab]/30 transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Record Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

        {/* Folders (only show if not searching) */}
        {!searchQuery && !searchLanguage && !searchType && currentFolders.map((folder, idx) => {
          const name = folder.name.toLowerCase();

          let icon = 'folder';
          let accentClass = 'text-[#00e5b0]';
          let bgAccentClass = 'bg-[#00e5b0]/10';
          let borderAccentClass = 'border-[#00e5b0]/20';
          let tabColor = 'bg-[#00e5b0]/20';

          if (name.includes('design') || name.includes('algo')) {
            icon = 'account_tree';
            accentClass = 'text-[#00e5b0]';
            bgAccentClass = 'bg-[#00e5b0]/10';
            borderAccentClass = 'border-[#00e5b0]/20';
            tabColor = 'bg-[#00e5b0]/20';
          } else if (name.includes('network') || name.includes('topo')) {
            icon = 'hub';
            accentClass = 'text-[#9ecaff]';
            bgAccentClass = 'bg-[#9ecaff]/10';
            borderAccentClass = 'border-[#9ecaff]/20';
            tabColor = 'bg-[#9ecaff]/20';
          } else if (name.includes('bio') || name.includes('sync')) {
            icon = 'science';
            accentClass = 'text-[#ffbf4e]';
            bgAccentClass = 'bg-[#ffbf4e]/10';
            borderAccentClass = 'border-[#ffbf4e]/20';
            tabColor = 'bg-[#ffbf4e]/20';
          } else if (name.includes('hardware') || name.includes('schematic')) {
            icon = 'memory';
            accentClass = 'text-[#ffb4ab]';
            bgAccentClass = 'bg-[#ffb4ab]/10';
            borderAccentClass = 'border-[#ffb4ab]/20';
            tabColor = 'bg-[#ffb4ab]/20';
          } else if (name.includes('data') || name.includes('arch')) {
            icon = 'database';
            accentClass = 'text-[#00e5b0]';
            bgAccentClass = 'bg-[#00e5b0]/10';
            borderAccentClass = 'border-[#00e5b0]/20';
            tabColor = 'bg-[#00e5b0]/20';
          } else if (name.includes('ai') || name.includes('intel')) {
            icon = 'psychology';
            accentClass = 'text-[#9ecaff]';
            bgAccentClass = 'bg-[#9ecaff]/10';
            borderAccentClass = 'border-[#9ecaff]/20';
            tabColor = 'bg-[#9ecaff]/20';
          }

          return (
            <div
              key={folder.id}
              className="group relative"
              onClick={() => setSelectedFolder(folder.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: folder.id, name: folder.name, type: 'folder' } }); }}
            >
              <div className={`absolute -top-1.5 left-0 w-32 h-6 ${tabColor} transition-colors folder-clip`}></div>
              <div className="relative h-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6 pt-8 hover:bg-[#202020] transition-all cursor-pointer group-hover:-translate-y-1">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-10 h-10 ${bgAccentClass} border ${borderAccentClass} rounded-lg flex items-center justify-center ${accentClass}`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <span className="material-symbols-outlined text-zinc-600 hover:text-zinc-400 text-sm" data-icon="more_vert">more_vert</span>
                </div>

                <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#e5e2e1] mb-2 truncate">{folder.name}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 mb-6">
                  {folder.description || `Automated subject classification for ${folder.name.toLowerCase()} laboratory datasets.`}
                </p>

                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex justify-end">
                   <span className="font-['Inter'] text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                      {new Date(folder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                   </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* New Folder / Import Button */}
        {!searchQuery && !searchLanguage && !searchType && (
          <div className="group relative" onClick={selectedFolder ? () => document.getElementById('file-upload-input')?.click() : addCategory}>
            <div className="absolute -top-1.5 left-0 w-32 h-6 bg-zinc-800/20 group-hover:bg-zinc-700/30 transition-colors folder-clip"></div>
            <div className="relative h-full bg-[#0F0F0F] border border-dashed border-[#2E2E2E] rounded-lg p-5 pt-7 flex flex-col items-center justify-center hover:bg-zinc-900/50 transition-all cursor-pointer group-hover:border-[#00e5b0]/30 min-h-[180px]">
              <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3 group-hover:text-[#00e5b0] transition-colors">
                <span className="material-symbols-outlined">
                  {selectedFolder ? 'upload_file' : 'create_new_folder'}
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-300 tracking-wider">
                {selectedFolder ? 'Import Files' : 'New Category'}
              </p>
              {selectedFolder && (
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              )}
            </div>
          </div>
        )}

        {/* Files */}
        {displayFiles.map((file, idx) => {
          const isSelected = selectedFiles.includes(file.id);
          const fileExt = file.name.split('.').pop()?.toLowerCase();

          let accentColor = '#00E5B0';
          let icon = 'description';
          let textColor = 'text-[#00E5B0]';
          let bgColor = 'bg-[#00E5B0]/10';
          let borderColor = 'group-hover:border-[#00E5B0]/40';
          let glowClass = 'inner-glow-py';

          if (fileExt === 'py' || file.language === 'python') {
            accentColor = '#00E5B0';
            icon = 'code';
            textColor = 'text-[#00E5B0]';
            bgColor = 'bg-[#00E5B0]/10';
            borderColor = 'group-hover:border-[#00E5B0]/40';
            glowClass = 'inner-glow-py';
          } else if (fileExt === 'csv' || fileExt === 'sql') {
            accentColor = '#9ecaff';
            icon = 'table_chart';
            textColor = 'text-[#9ecaff]';
            bgColor = 'bg-[#9ecaff]/10';
            borderColor = 'group-hover:border-[#9ecaff]/40';
            glowClass = 'inner-glow-csv';
          } else if (fileExt === 'pdf') {
            accentColor = '#ffb4ab';
            icon = 'picture_as_pdf';
            textColor = 'text-[#ffb4ab]';
            bgColor = 'bg-[#ffb4ab]/10';
            borderColor = 'group-hover:border-red-400/40';
            glowClass = 'inner-glow-pdf';
          }

          const contentSnippet = file.content ? file.content.split('\n').slice(0, 4).join('\n') : '';

          return (
            <div
              key={file.id}
              className={`card-premium border border-[#2E2E2E] rounded-xl group transition-all cursor-pointer relative overflow-hidden flex flex-col h-[280px] ${borderColor} ${isSelected ? 'ring-2 ring-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.2)]' : ''}`}
              onMouseDown={() => { setIsSelecting(true); toggleSelection(file.id); }}
              onMouseEnter={() => { if (isSelecting) addSelection(file.id); }}
              onDoubleClick={() => setPreviewFile(file)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file.id, name: file.name, type: 'file' } }); }}
            >
              <div className="flex-1 p-0 flex flex-col overflow-hidden">
                {/* Header Preview Section */}
                <div className={`h-32 border-b border-[#2E2E2E] overflow-hidden relative ${glowClass} ${fileExt === 'py' ? 'code-snippet-bg' : 'bg-[#151515]'}`}>
                  {fileExt === 'py' ? (
                    <div className="p-4 font-mono text-[9px] text-zinc-500 overflow-hidden">
                      <div className="absolute top-2 right-3 flex gap-1 z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500/50"></span>
                      </div>
                      {contentSnippet ? (
                        <pre className="text-[#00E5B0]/70 leading-relaxed overflow-hidden">
                          {contentSnippet}
                        </pre>
                      ) : (
                        <>
                          <code className="block text-[#00E5B0]/70">import os, sys</code>
                          <code className="block ml-2 mt-0.5">def main():</code>
                          <code className="block mt-1 text-zinc-600">  # Initializing...</code>
                        </>
                      )}
                    </div>
                  ) : fileExt === 'csv' ? (
                    <div className="w-full h-full p-6 opacity-30 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 200 100">
                        <path d="M0,80 Q25,20 50,60 T100,30 T150,70 T200,10" fill="none" stroke={accentColor} strokeWidth="2" className="sparkline-path"></path>
                      </svg>
                      <span className="material-symbols-outlined absolute text-5xl text-[#9ecaff]/10" data-icon="table_chart">table_chart</span>
                    </div>
                  ) : fileExt === 'pdf' ? (
                    <div className="p-6 relative w-full h-full">
                      <div className="pdf-fold absolute inset-4 bg-zinc-800 border border-zinc-700/50 shadow-lg p-3">
                        <div className="pdf-corner"></div>
                        <div className="w-full h-1 bg-red-400/40 mb-2"></div>
                        <div className="w-3/4 h-1 bg-zinc-700/50 mb-1"></div>
                        <div className="w-full h-1 bg-zinc-700/50 mb-1"></div>
                      </div>
                    </div>
                  ) : file.file_type.startsWith('image/') ? (
                    <img alt={file.name} className="w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300" src={file.url} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:bg-[#151515] transition-colors">
                      <span className={`material-symbols-outlined text-4xl opacity-10 group-hover:opacity-20 transition-opacity ${textColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {icon}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-['Space_Grotesk'] text-base truncate text-[#e5e2e1]">{file.name}</h3>
                      <span
                        className="material-symbols-outlined text-zinc-600 hover:text-zinc-400 text-sm"
                        onClick={(e) => { e.stopPropagation(); setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, item: { id: file.id, name: file.name, type: 'file' } }); }}
                      >
                        more_vert
                      </span>
                    </div>
                    <p className="text-[10px] font-['Inter'] text-zinc-500 mb-4 uppercase tracking-widest font-semibold">
                      {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`${bgColor} ${textColor} px-2 py-1 rounded text-[9px] font-mono border border-current opacity-60`}>
                      {file.language ? file.language.toUpperCase() : (fileExt ? fileExt.toUpperCase() : 'FILE')}
                    </span>
                    {file.tags && file.tags.slice(0, 1).map((tag: string, tidx: number) => (
                      <span key={tidx} className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[9px] font-mono border border-[#333]">
                        {tag.toUpperCase()}
                      </span>
                    ))}
                    {!file.language && !file.tags && (
                      <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[9px] font-mono border border-[#333]">
                        { (file.size / 1024).toFixed(1) } KB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GreenRecordsUI;