import React from 'react';
import { 
  Clock, 
  RefreshCcw, 
  Code, 
  FileText, 
  Zap, 
  Search, 
  Download 
} from 'lucide-react';
import { Button } from "../../components/ui/button";

interface TimelineProps {
  timelineTypeFilter: string;
  setTimelineTypeFilter: (val: string) => void;
  timelineSubjectFilter: string;
  setTimelineSubjectFilter: (val: string) => void;
  folders: any[];
  loading: boolean;
  allFiles: any[];
  setPreviewFile: (file: any) => void;
  downloadFile: (file: any) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  timelineTypeFilter,
  setTimelineTypeFilter,
  timelineSubjectFilter,
  setTimelineSubjectFilter,
  folders,
  loading,
  allFiles,
  setPreviewFile,
  downloadFile
}) => {
  const filtered = allFiles.filter(f => {
    const typeMatch = !timelineTypeFilter || f.tags?.includes(timelineTypeFilter) || (timelineTypeFilter === 'program' && f.language) || (timelineTypeFilter === 'record' && f.file_type === 'application/pdf');
    
    const folder = folders.find(fd => fd.id === f.folder_id);
    const parentFolder = folder?.parent_id ? folders.find((p: any) => p.id === folder.parent_id) : folder;
    const subjectMatch = !timelineSubjectFilter || parentFolder?.name === timelineSubjectFilter;
    
    return typeMatch && subjectMatch;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const groups: { [key: string]: any[] } = {};
  filtered.forEach(f => {
    const date = new Date(f.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let group = 'Older Intelligence';
    if (date.toDateString() === today.toDateString()) group = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) group = 'Yesterday';
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(f);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Enhanced Discovery Timeline</h2>
          <p className="text-[10px] font-bold text-slate-600 uppercase mt-1">Intelligence Sequencing Feed</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timelineTypeFilter}
            onChange={(e) => setTimelineTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 outline-none focus:ring-1 focus:ring-electric-blue"
          >
            <option value="">All Types</option>
            <option value="program">Programs</option>
            <option value="record">Records</option>
            <option value="screenshot">Screenshots</option>
          </select>
          <select 
            value={timelineSubjectFilter}
            onChange={(e) => setTimelineSubjectFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 outline-none focus:ring-1 focus:ring-electric-blue"
          >
            <option value="">All Subjects</option>
            {folders.filter(f => !f.parent_id).map(f => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8">
        {loading && (
          <div className="py-20 text-center space-y-4">
            <RefreshCcw size={32} className="text-electric-blue animate-spin mx-auto" />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Loading timeline...</p>
          </div>
        )}
        
        {!loading && allFiles.length === 0 && (
          <div className="py-20 text-center space-y-4 glass-panel border-slate-800">
            <Clock size={48} className="text-slate-700 mx-auto" />
            <h3 className="text-lg font-bold">No activity yet</h3>
            <p className="text-sm text-slate-500">Your research discoveries will appear here as you archive them.</p>
          </div>
        )}

        {!loading && allFiles.length > 0 && (
          filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-sm text-slate-500">No records match your timeline filters.</p>
            </div>
          ) : (
            ['Today', 'Yesterday', 'Older Intelligence'].map(groupName => {
              if (!groups[groupName]) return null;
              return (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-[10px] font-black text-electric-blue uppercase tracking-widest px-1 flex items-center gap-2">
                    <Clock size={12} />
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {groups[groupName].map(file => {
                      const folder = folders.find(fd => fd.id === file.folder_id);
                      const isProgram = file.language || file.tags?.includes('program');
                      const isRecord = file.file_type === 'application/pdf' || file.tags?.includes('record');

                      return (
                        <div 
                          key={file.id} 
                          onDoubleClick={() => setPreviewFile(file)}
                          className="glass-panel p-4 flex items-center justify-between hover:bg-slate-800/40 transition-all group cursor-pointer border-l-2 border-l-transparent hover:border-l-electric-blue"
                        >
                          <div className="flex items-center gap-4 truncate">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-500 group-hover:text-electric-blue group-hover:border-electric-blue/30 transition-colors">
                              {isProgram ? <Code size={18} /> : isRecord ? <FileText size={18} /> : <Zap size={18} />}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-bold text-white truncate">
                                {file.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                {file.language && <span className="text-electric-blue">{file.language}</span>}
                                {file.language && <span>•</span>}
                                <span>({folder?.name || 'Archive'})</span>
                                <span>•</span>
                                <span>{new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="h-8 w-8 text-slate-600 hover:text-electric-blue">
                              <Search size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); downloadFile(file); }} className="h-8 w-8 text-slate-600 hover:text-electric-blue">
                              <Download size={16} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default Timeline;
