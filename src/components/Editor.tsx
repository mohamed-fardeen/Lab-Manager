import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  Square, Circle, Type, MousePointer2, Minus, 
  Trash2, Save, Palette, FileText, Plus, BrainCircuit, Loader2,
  Bold, Italic, GripVertical, ChevronDown, Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '../lib/supabase';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  pageNum: number;
}

interface PdfPageData {
  bgImage: string;
  width: number;
  height: number;
}

interface EditorProps {
  fileId?: string;           
  initialPdf?: string;       
  onSave?: (name: string, pdfBase64: string, type: string, blocks: TextBlock[]) => void;
  defaultWatermark?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32;
const SCALE = 2.0; 
const LINE_SPACING = 30; // pixels between lines in overlay

// ─── Component ────────────────────────────────────────────────────────────────

const Editor: React.FC<EditorProps> = ({ 
  fileId, 
  initialPdf, 
  onSave, 
  defaultWatermark 
}) => {
  const [pages, setPages] = useState<PdfPageData[]>([]);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorStatus, setEditorStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Lab_Record_Edit.pdf');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(initialPdf || null);
  const [watermark, setWatermark] = useState(defaultWatermark || 'CONFIDENTIAL');
  const [showWatermark, setShowWatermark] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ blockId: string; startX: number; startY: number; origX: number; origY: number; } | null>(null);

  // ── PDF Rendering (CANVAS ONLY) ──────────────────────────────────────────

  const renderPdf = useCallback(async (data: string | ArrayBuffer) => {
    setIsProcessing(true);
    try {
      const source = typeof data === 'string'
        ? { data: Uint8Array.from(atob(data.replace(/^data:application\/pdf;base64,/, '')), c => c.charCodeAt(0)) }
        : { data: new Uint8Array(data) };

      const pdf = await pdfjsLib.getDocument(source).promise;
      const rendered: PdfPageData[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        
        // Disable any text layer rendering - ONLY Canvas
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        rendered.push({
          bgImage: canvas.toDataURL('image/png'),
          width: viewport.width,
          height: viewport.height
        });
      }
      setPages(rendered);
      console.log("PDF Pages Rendered (Canvas Only):", rendered.length);
    } catch (err) {
      console.error('PDF Render Error:', err);
      setEditorStatus('Render failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ── Text Extraction (OVERLAY GENERATION) ───────────────────────────────

  const handleExtractText = useCallback(async (pdfData: string | ArrayBuffer) => {
    setIsProcessing(true);
    setEditorStatus('Reconstructing Layout...');
    try {
      const source = typeof pdfData === 'string'
        ? { data: Uint8Array.from(atob(pdfData.replace(/^data:application\/pdf;base64,/, '')), c => c.charCodeAt(0)) }
        : { data: new Uint8Array(pdfData) };

      const pdf = await pdfjsLib.getDocument(source).promise;
      const newBlocks: TextBlock[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        const textContent = await page.getTextContent();
        
        // 1. Convert items to layout items with viewport coordinates
        const rawItems = textContent.items.map((item: any) => {
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          return {
            text: item.str,
            x: tx[4],
            y: tx[5] - (item.height * SCALE),
            w: item.width * SCALE,
            h: item.height * SCALE,
            fontSize: item.height * SCALE
          };
        }).filter(item => item.text.trim().length > 0);

        // 2. Group into Lines (items with similar Y)
        const lines: any[] = [];
        rawItems.forEach(item => {
          let found = false;
          for (const line of lines) {
            if (Math.abs(line.y - item.y) < 5) {
              line.items.push(item);
              found = true;
              break;
            }
          }
          if (!found) lines.push({ y: item.y, items: [item] });
        });

        // 3. Sort lines and items within lines
        lines.sort((a, b) => a.y - b.y);
        lines.forEach(line => {
          line.items.sort((a, b) => a.x - b.x);
          line.text = line.items.map((it: any) => it.str || it.text).join(' ').replace(/\s+/g, ' ').trim();
          line.x = line.items[0].x;
          line.w = line.items.reduce((acc: number, it: any) => acc + (it.w || 0), 0) + 10;
          line.h = Math.max(...line.items.map((it: any) => it.h || 0));
        });

        // 4. Group Lines into Paragraphs (similar X and close Y)
        const paragraphs: any[] = [];
        let currentPara: any = null;

        lines.forEach(line => {
          if (line.text.length < 2) return; // Skip noise

          const isSameX = currentPara && Math.abs(currentPara.x - line.x) < 20;
          const isCloseY = currentPara && (line.y - (currentPara.y + currentPara.h)) < 30;

          if (currentPara && isSameX && isCloseY) {
            currentPara.text += '\n' + line.text;
            currentPara.h = (line.y + line.h) - currentPara.y;
            currentPara.w = Math.max(currentPara.w, line.w);
          } else {
            currentPara = { ...line };
            paragraphs.push(currentPara);
          }
        });

        // 5. Convert Paragraphs to TextBlocks
        paragraphs.forEach((para, idx) => {
          if (para.text.trim().length <= 3) return; // Noise filter

          newBlocks.push({
            id: `para-p${i}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            text: para.text,
            x: para.x,
            y: para.y,
            width: para.w + 40, // Padding for editor
            height: para.h + 10,
            fontSize: para.h / (para.text.split('\n').length) || 16,
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#000000',
            pageNum: i
          });
        });
      }

      console.log("Layout Reconstruction Complete. Blocks:", newBlocks);
      setBlocks([]); 
      setTimeout(() => setBlocks(newBlocks), 20);
      setEditorStatus(`Layout reconstructed: ${newBlocks.length} sections`);
    } catch (err) {
      console.error('Layout Analysis failed:', err);
      setEditorStatus('Layout analysis failed');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setEditorStatus(null), 3000);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Single effect for initial load
  useEffect(() => {
    if (pdfBase64) {
      renderPdf(pdfBase64);
      handleExtractText(pdfBase64);
    }
  }, []); // Run ONLY once on mount

  // Load existing file from archive
  useEffect(() => {
    if (fileId) {
      const loadFileData = async () => {
        try {
          const { data: file, error } = await supabase.from('files').select('url, edited_content').eq('id', fileId).single();
          if (error) throw error;
          if (file.url) {
            const res = await fetch(file.url);
            const buf = await res.arrayBuffer();
            await renderPdf(buf);
            if (file.edited_content?.blocks?.length > 0) {
              setBlocks(file.edited_content.blocks.map((b: any) => ({ ...b, x: b.x * SCALE, y: b.y * SCALE, width: b.width * SCALE, height: b.height * SCALE, fontSize: b.fontSize * SCALE })));
            } else {
              await handleExtractText(buf);
            }
          }
        } catch (e) { console.error('Archive load failed', e); }
      };
      loadFileData();
    }
  }, [fileId]);

  // Global Drag Handler
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { blockId, startX, startY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, x: origX + dx, y: origY + dy } : b));
    };
    const onMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleOCR = async () => {
    if (!rawFile) return;
    setIsProcessing(true);
    setEditorStatus('Running Layout-Aware OCR...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', rawFile);
      
      const res = await fetch('/api/files/ocr-process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      
      const data = await res.json();
      if (data.success && data.blocks) {
        // 1. Clear existing
        setBlocks([]);
        
        // 2. Map backend blocks (scaling might be needed depending on Tesseract dpi vs PDF.js)
        // Usually Tesseract uses 300dpi, PDF.js uses 72dpi * SCALE.
        // We'll normalize them here.
        const scaledBlocks = data.blocks.map((b: any) => ({
          ...b,
          x: b.x * (zoom / 2), // Rough normalization, will refine
          y: b.y * (zoom / 2),
          width: b.w * (zoom / 2),
          height: b.h * (zoom / 2),
          fontSize: (b.fontSize || 14) * (zoom / 2),
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#000000',
        }));
        
        setBlocks(scaledBlocks);
        setEditorStatus(`Layout reconstructed: ${scaledBlocks.length} sections`);
      } else if (data.pdf) {
        setPdfBase64(data.pdf);
        await renderPdf(data.pdf);
        await handleExtractText(data.pdf);
      }
    } catch (err) {
      console.error('OCR error:', err);
      setEditorStatus('OCR Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRawFile(file);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      setBlocks([]); 
      // Use .slice() to pass a copy, preventing detachment issues
      await renderPdf(uint8Array.slice());
      await handleExtractText(uint8Array.slice());
    } catch (err) {
      console.error('Import failed:', err);
      setEditorStatus('Import failed');
    }
  };

  const updateBlock = (id: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return;
    e.preventDefault(); e.stopPropagation();
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      dragRef.current = { blockId, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
      setSelectedId(blockId);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedId);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full app-bg rounded-3xl overflow-hidden border border-border shadow-2xl relative select-none">
      
      {/* Status Toast */}
      {editorStatus && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[300] bg-primary text-primary-foreground px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl animate-bounce">
          {editorStatus}
        </div>
      )}

      {/* Header */}
      <div className="app-editor-toolbar p-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="text-primary" size={24} />
          <h2 className="font-bold text-foreground text-lg">{fileName}</h2>
        </div>
        <div className="flex items-center gap-3">
          {blocks.length === 0 && rawFile && (
            <Button onClick={handleOCR} disabled={isProcessing} className="bg-amber-600 hover:bg-amber-500 text-foreground border-none shadow-lg shadow-amber-900/20">
              {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <BrainCircuit size={16} className="mr-2" />}
              OCR AI Analysis
            </Button>
          )}
          {blocks.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setBlocks([])} className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-10 px-4">
              <Trash2 size={16} className="mr-2" /> Purge Elements
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-border text-foreground h-10 px-4">
            <Plus size={16} className="mr-2" /> Change File
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleImport} />
          <Button onClick={() => onSave?.(fileName, "dummy", "pdf", blocks)} className="bg-primary hover:bg-foreground hover:text-background text-primary-foreground font-bold h-10 px-8 shadow-lg shadow-black/20">
            <Save size={16} className="mr-2" /> Save & Close
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="app-editor-toolbar p-3 flex items-center gap-4 px-8 backdrop-blur-md">
        <div className="flex items-center gap-1 app-bg p-1 rounded-xl border border-border">
          <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className={!selectedId ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}><MousePointer2 size={18} /></Button>
          <Button variant="ghost" size="icon" onClick={() => {
            const newB: TextBlock = { id: `manual-${Date.now()}`, text: 'New Observation', x: 100, y: 150, width: 400, height: 40, fontSize: 16 * SCALE, fontWeight: 'normal', fontStyle: 'normal', color: '#000000', pageNum: 1 };
            setBlocks([...blocks, newB]); setSelectedId(newB.id);
          }} className="text-muted-foreground"><Type size={18} /></Button>
        </div>

        {selectedBlock && (
          <div className="flex items-center gap-3 animate-in-right app-bg p-1 px-4 rounded-xl border border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Text Style</span>
            <Button variant="ghost" size="icon" onClick={() => setBlocks(prev => prev.map(b => b.id === selectedId ? {...b, fontWeight: b.fontWeight === 'bold' ? 'normal' : 'bold'} : b))} className={selectedBlock.fontWeight === 'bold' ? 'text-primary' : 'text-muted-foreground'}><Bold size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={() => setBlocks(prev => prev.map(b => b.id === selectedId ? {...b, fontStyle: b.fontStyle === 'italic' ? 'normal' : 'italic'} : b))} className={selectedBlock.fontStyle === 'italic' ? 'text-primary' : 'text-muted-foreground'}><Italic size={16} /></Button>
            <input type="color" value={selectedBlock.color} onChange={e => setBlocks(prev => prev.map(b => b.id === selectedId ? {...b, color: e.target.value} : b))} className="w-6 h-6 rounded-full overflow-hidden border-none cursor-pointer" />
            <Button variant="ghost" size="icon" onClick={() => { setBlocks(blocks.filter(b => b.id !== selectedId)); setSelectedId(null); }} className="text-red-500 ml-2"><Trash2 size={16} /></Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          <input type="range" min="0.4" max="1.5" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-32 h-1 accent-primary" />
          <span className="text-xs font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-black p-12 custom-scrollbar flex flex-col items-center gap-12" onClick={() => setSelectedId(null)}>
        {pages.map((pg, idx) => {
          const pageNum = idx + 1;
          const pageBlocks = blocks.filter(b => b.pageNum === pageNum);

          return (
            <div 
              key={idx} 
              style={{ width: pg.width, height: pg.height, transform: `scale(${zoom})`, transformOrigin: 'top center' }} 
              className="app-doc-page relative flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              {/* Background Canvas (Rendered PDF Image) */}
              <img src={pg.bgImage} className="absolute inset-0 w-full h-full pointer-events-none z-0" alt="" />

              {/* Overlay Layer (Fixed positioning matches Canvas) */}
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {pageBlocks.map(block => (
                  <div
                    key={block.id}
                    style={{ 
                      position: 'absolute', 
                      left: block.x, 
                      top: block.y, 
                      width: block.width, 
                      minHeight: block.height, 
                      zIndex: selectedId === block.id ? 100 : 10,
                      pointerEvents: 'auto',
                      cursor: selectedId === block.id ? 'move' : 'default'
                    }}
                    onMouseDown={e => handleBlockMouseDown(e, block.id)}
                  >
                    {/* Block Border */}
                    <div className={`absolute inset-0 rounded ${selectedId === block.id ? 'border-2 border-primary' : 'border border-transparent hover:border-primary/30'}`} style={{ pointerEvents: 'none' }} />
                    
                    {/* Drag Handle */}
                    {selectedId === block.id && (
                      <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-lg">
                        <GripVertical size={10} /> Drag to position
                      </div>
                    )}

                    {/* Editable Text Area */}
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => updateBlock(block.id, e.currentTarget.textContent || "")}
                      className="outline-none break-words select-text p-1"
                      style={{ 
                        fontSize: block.fontSize,
                        fontWeight: block.fontWeight,
                        fontStyle: block.fontStyle,
                        color: block.color,
                        lineHeight: 1.2,
                        minWidth: '100%',
                        backgroundColor: selectedId === block.id ? 'rgba(255,255,255,0.8)' : 'transparent'
                      }}
                    >
                      {block.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Watermark */}
              {watermark && showWatermark && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 opacity-[0.03]">
                  <div className="text-[12rem] font-black -rotate-45 uppercase select-none">{watermark}</div>
                </div>
              )}

              {/* Page Number Indicator */}
              <div className="absolute -right-16 top-0 h-full flex flex-col justify-center items-center gap-2">
                <div className="h-full w-[2px] app-surface-raised" />
                <span className="text-muted-foreground font-bold text-xs uppercase vertical-text">Page {pageNum}</span>
                <div className="h-full w-[2px] app-surface-raised" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Editor;
