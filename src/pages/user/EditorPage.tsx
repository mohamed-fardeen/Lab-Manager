import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from "../../components/ui/button";
import Editor from "../../components/Editor";
import DocumentEditor from "../../components/DocumentEditor";

interface EditorPageProps {
  editorMode: 'layout' | 'structure';
  setEditorMode: (mode: 'layout' | 'structure') => void;
  editingFileId: string | null;
  users: any[];
  selectedUser: string | null;
  selectedFolder: string | null;
  setActiveTab: (tab: string) => void;
  api: any;
  loadFiles: (folderId: string) => void;
  setEditingFileId: (id: string | null) => void;
  files: any[];
  activeHtml: string;
  setActiveHtml: (html: string) => void;
}

const EditorPage: React.FC<EditorPageProps> = ({
  editorMode,
  setEditorMode,
  editingFileId,
  users,
  selectedUser,
  selectedFolder,
  setActiveTab,
  api,
  loadFiles,
  setEditingFileId,
  files,
  activeHtml,
  setActiveHtml
}) => {
  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant={editorMode === 'layout' ? 'default' : 'outline'} 
          onClick={() => setEditorMode('layout')}
          className="h-8 text-[10px] uppercase font-bold"
        >
          Layout Editor (OCR)
        </Button>
        <Button 
          variant={editorMode === 'structure' ? 'default' : 'outline'} 
          onClick={() => setEditorMode('structure')}
          className="h-8 text-[10px] uppercase font-bold"
        >
          Structured Editor (AI)
        </Button>
      </div>
      
      <div className="flex-1 bg-background rounded-2xl border border-border overflow-hidden">
        {editorMode === 'layout' ? (
          <Editor 
            fileId={editingFileId || undefined}
            defaultWatermark={users.find((u: any) => u.id === selectedUser)?.rrn || 'DRAFT'}
            onSave={(name, data, type, blocks) => {
              if (!selectedFolder) {
                alert("Please select a category first in the 'My Records' tab.");
                setActiveTab('records');
                return;
              }
              
              const formData = new FormData();
              const blob = new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'application/pdf' });
              formData.append('file', blob, name);
              formData.append('folder_id', selectedFolder);
              formData.append('edited_content', JSON.stringify({ blocks }));

              api.post('/files/upload', formData).then(() => {
                alert("Record successfully archived.");
                loadFiles(selectedFolder);
                setActiveTab('records');
                setEditingFileId(null);
              });
            }} 
          />
        ) : (
          <DocumentEditor 
            fileName={files.find((f: any) => f.id === editingFileId)?.name || 'New_Record.pdf'}
            initialHtml={activeHtml}
            onSave={async (html) => {
               alert("Structured record updated locally.");
               setActiveHtml(html);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EditorPage;
