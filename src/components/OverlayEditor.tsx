import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Save, Trash2, Plus, Bold, Italic, Loader2, BrainCircuit, GripVertical, Type, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';

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
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

interface OverlayEditorProps {
  fileId?: string;           // DB file ID for saving
  initialPdfBase64?: string; // Base64 PDF from OCR response
  initialBlocks?: TextBlock[];
  onSaved?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32;
const SCALE = 1.5;

// ─── Component ────────────────────────────────────────────────────────────────

const OverlayEditor: React.FC<OverlayEditorProps> = ({
  fileId,
  initialPdfBase64,
  initialBlocks = [],
  onSaved,
}) => {
  const [pages, setPages] = useState<PdfPageData[]>([]);
  const [blocks, setBlocks] = useState<TextBlock[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOcring, setIsOcring] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Track drag state via refs to avoid stale closures
  const dragRef = useRef<{
    blockId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // ── PDF Rendering ────────────────────────────────────────────────────────

  const renderPdf = useCallback(async (pdfData: ArrayBuffer | string) => {
    setIsLoadingPdf(true);
    try {
      const source = typeof pdfData === 'string'
        ? { data: Uint8Array.from(atob(pdfData), c => c.charCodeAt(0)) }
        : { data: new Uint8Array(pdfData) };

      const pdf = await pdfjsLib.getDocument(source).promise;
      const rendered: PdfPageData[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        rendered.push({ canvas, width: viewport.width, height: viewport.height });
      }

      setPages(rendered);
    } catch (err) {
      console.error('PDF render error:', err);
      setStatus('Failed to render PDF');
    } finally {
      setIsLoadingPdf(false);
    }
  }, []);

  // Render on mount if initialPdfBase64 given
  useEffect(() => {
    if (initialPdfBase64) renderPdf(initialPdfBase64);
  }, [initialPdfBase64, renderPdf]);

  // Scale blocks to match the SCALE factor (backend uses 1x, canvas uses SCALE)
  useEffect(() => {
    if (initialBlocks.length > 0) {
      setBlocks(initialBlocks.map(b => ({
        ...b,
        x: b.x * SCALE,
        y: b.y * SCALE,
        width: b.width * SCALE,
        height: Math.max(b.height * SCALE, 24),
        fontSize: Math.round(b.fontSize * SCALE),
      })));
    }
  }, []);

  // ── File Import ─────────────────────────────────────────────────────────

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    setStatus('Loading PDF...');

    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      await renderPdf(buffer);
      setBlocks([]);
      setStatus('PDF loaded — click "Run OCR" to extract editable text');
      setTimeout(() => setStatus(null), 4000);
    }
  };

  // ── OCR ──────────────────────────────────────────────────────────────────

  const handleOCR = async () => {
    if (!rawFile) return;
    setIsOcring(true);
    setStatus('Running OCR... This may take a moment');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', rawFile);

      const res = await fetch('/api/files/ocr-process', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });

      if (!res.ok) throw new Error('OCR failed');

      const json = await res.json();

      // Re-render PDF from OCR output
      if (json.pdf) await renderPdf(json.pdf);

      // Load text blocks
      if (json.blocks?.length > 0) {
        setBlocks(json.blocks.map((b: any) => ({
          ...b,
          x: b.x * SCALE,
          y: b.y * SCALE,
          width: b.width * SCALE,
          height: Math.max(b.height * SCALE, 24),
          fontSize: Math.round((b.fontSize || 14) * SCALE),
          fontWeight: b.fontWeight || 'normal',
          fontStyle: 'normal',
          color: '#000000',
        })));
        setStatus(`OCR complete — ${json.blocks.length} text blocks extracted`);
      } else {
        setStatus('OCR complete — no text detected');
      }
    } catch (err) {
      console.error(err);
      setStatus('OCR failed. Try again.');
    } finally {
      setIsOcring(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  // ── Drag Handlers ────────────────────────────────────────────────────────

  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    if ((e.target as HTMLElement).getAttribute('contenteditable') === 'true') return;
    e.preventDefault();
    e.stopPropagation();

    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    dragRef.current = {
      blockId,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x,
      origY: block.y,
    };
    setSelectedId(blockId);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { blockId, startX, startY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      setBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, x: origX + dx, y: origY + dy } : b
      ));
    };

    const onMouseUp = () => { dragRef.current = null; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom]);

  // ── Block Operations ─────────────────────────────────────────────────────

  const updateBlock = (id: string, updates: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSelectedId(null);
  };

  const addBlock = (pageNum: number) => {
    const newBlock: TextBlock = {
      id: `block-${Date.now()}`,
      text: 'New text',
      x: 72 * SCALE,
      y: 80 * SCALE,
      width: 300 * SCALE,
      height: 32,
      fontSize: 14 * SCALE,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      pageNum,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!fileId) {
      setStatus('No file ID — save the file first before saving edits');
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Normalize blocks back to 1x coordinates for storage
      const normalizedBlocks = blocks.map(b => ({
        ...b,
        x: Math.round(b.x / SCALE),
        y: Math.round(b.y / SCALE),
        width: Math.round(b.width / SCALE),
        height: Math.round(b.height / SCALE),
        fontSize: Math.round(b.fontSize / SCALE),
      }));

      const res = await fetch(`/api/files/${fileId}/overlay`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ blocks: normalizedBlocks }),
      });

      if (!res.ok) throw new Error('Save failed');
      setStatus('Saved successfully!');
      onSaved?.();
    } catch (err) {
      console.error(err);
      setStatus('Save failed. Try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // ── Selected Block ───────────────────────────────────────────────────────

  const selectedBlock = blocks.find(b => b.id === selectedId);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full app-bg rounded-3xl overflow-hidden border border-border backdrop-blur-sm shadow-2xl">

      {/* Status Toast */}
      {status && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-primary text-primary-foreground px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-accent-glow animate-bounce pointer-events-none">
          {status}
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="app-editor-toolbar p-3 px-5 flex items-center gap-3 flex-wrap">
        {/* Import */}
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-border h-8 text-xs">
          <Plus size={14} className="mr-1" /> Import PDF
        </Button>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileImport} />

        {/* OCR */}
        {rawFile && (
          <Button
            size="sm"
            onClick={handleOCR}
            disabled={isOcring}
            className="bg-amber-600 hover:bg-amber-500 text-foreground h-8 text-xs"
          >
            {isOcring
              ? <Loader2 size={14} className="animate-spin mr-1" />
              : <BrainCircuit size={14} className="mr-1" />}
            Run OCR
          </Button>
        )}

        <div className="h-5 border-l border-border" />

        {/* Text formatting — only shown when a block is selected */}
        {selectedBlock && (
          <>
            <button
              onClick={() => updateBlock(selectedId!, { fontWeight: selectedBlock.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${selectedBlock.fontWeight === 'bold' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:app-surface-raised'}`}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() => updateBlock(selectedId!, { fontStyle: selectedBlock.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${selectedBlock.fontStyle === 'italic' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:app-surface-raised'}`}
              title="Italic"
            >
              <Italic size={13} />
            </button>

            {/* Font size */}
            <div className="flex items-center gap-1 app-surface rounded-lg border border-border px-2 py-1">
              <Type size={12} className="text-muted-foreground" />
              <select
                value={selectedBlock.fontSize}
                onChange={e => updateBlock(selectedId!, { fontSize: parseInt(e.target.value) })}
                className="bg-transparent text-xs text-foreground border-none outline-none cursor-pointer"
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map(s => (
                  <option key={s} value={Math.round(s * SCALE)}>{s}px</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <input
              type="color"
              value={selectedBlock.color}
              onChange={e => updateBlock(selectedId!, { color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
              title="Text color"
            />

            {/* Delete block */}
            <button
              onClick={() => deleteBlock(selectedId!)}
              className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete block"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}

        {/* Zoom */}
        <div className="ml-auto flex items-center gap-2 app-surface rounded-xl border border-border px-3 py-1">
          <span className="text-[10px] text-muted-foreground font-black uppercase">Zoom</span>
          <input
            type="range" min="0.3" max="2" step="0.05" value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="w-20 h-1 appearance-none accent-primary app-surface-raised rounded"
          />
          <span className="text-[10px] font-mono text-muted-foreground w-8">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground h-8 text-xs ml-1 shadow-accent-glow">
          {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
          Save Edits
        </Button>
      </div>

      {/* ── Workspace ─────────────────────────────────────────────────────── */}
      <div
        ref={workspaceRef}
        className="flex-1 overflow-auto app-bg flex flex-col items-center p-8 gap-8"
        onClick={() => setSelectedId(null)}
      >
        {/* Empty state */}
        {pages.length === 0 && !isLoadingPdf && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 select-none">
            <div className="w-16 h-20 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center">
              <Type size={24} className="text-slate-600" />
            </div>
            <p className="text-muted-foreground font-mono text-sm">Import a PDF to begin</p>
          </div>
        )}

        {isLoadingPdf && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={40} className="text-primary animate-spin" />
            <p className="text-muted-foreground font-mono text-sm">Rendering PDF...</p>
          </div>
        )}

        {/* Pages */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            display: 'flex',
            flexDirection: 'column',
            gap: PAGE_GAP,
            alignItems: 'center',
            marginBottom: 120,
          }}
        >
          {pages.map((pg, pageIdx) => {
            const pageNum = pageIdx + 1;
            const pageBlocks = blocks.filter(b => b.pageNum === pageNum);

            return (
              <div key={pageIdx} style={{ position: 'relative' }}>
                {/* Page label */}
                <div className="absolute -top-6 left-0 text-[10px] text-muted-foreground font-mono select-none">
                  Page {pageNum} of {pages.length}
                </div>

                {/* Page container — PDF canvas + overlay together */}
                <div
                  style={{ width: pg.width, height: pg.height, position: 'relative' }}
                  className="app-doc-page overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* ── Background: PDF Canvas (read-only) ──── */}
                  <canvas
                    ref={el => { if (el && pg.canvas) { el.width = pg.canvas.width; el.height = pg.canvas.height; el.getContext('2d')!.drawImage(pg.canvas, 0, 0); } }}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  />

                  {/* ── Overlay: Editable text blocks ──────── */}
                  {pageBlocks.map(block => (
                    <DraggableBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedId === block.id}
                      onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
                      onSelect={() => setSelectedId(block.id)}
                      onChange={(text) => updateBlock(block.id, { text })}
                    />
                  ))}

                  {/* Add block button — bottom-right of page */}
                  <button
                    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-primary/90 hover:bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg shadow-accent-glow transition-all opacity-60 hover:opacity-100"
                    onClick={e => { e.stopPropagation(); addBlock(pageNum); }}
                    title="Add text block to this page"
                  >
                    <Plus size={11} /> Add Text
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── DraggableBlock ────────────────────────────────────────────────────────────

interface DraggableBlockProps {
  block: TextBlock;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: () => void;
  onChange: (text: string) => void;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({
  block, isSelected, onMouseDown, onSelect, onChange,
}) => {
  const editRef = useRef<HTMLDivElement>(null);

  // Sync text from outside into contentEditable without caret jumping
  useEffect(() => {
    const el = editRef.current;
    if (el && el.textContent !== block.text) {
      el.textContent = block.text;
    }
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        minHeight: block.height,
        zIndex: isSelected ? 100 : 10,
        cursor: 'move',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Drag handle + selection outline */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          border: isSelected ? '1.5px solid var(--primary)' : '1px solid transparent',
          borderRadius: 4,
          pointerEvents: 'none',
          transition: 'border-color 0.15s',
          boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.15)' : 'none',
        }}
      />

      {/* Drag grip (shown only when selected) */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--primary)',
            borderRadius: '4px 4px 0 0',
            padding: '2px 6px',
            fontSize: 10,
            color: 'var(--primary-foreground)',
            fontWeight: 700,
            cursor: 'move',
            whiteSpace: 'nowrap',
          }}
          onMouseDown={onMouseDown}
        >
          <GripVertical size={10} />
          Drag to move
        </div>
      )}

      {/* Content-editable text area */}
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange((e.target as HTMLDivElement).textContent || '')}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={(e) => e.stopPropagation()} // Allow cursor placement inside text
        style={{
          width: '100%',
          minHeight: block.height,
          fontSize: block.fontSize,
          fontWeight: block.fontWeight,
          fontStyle: block.fontStyle,
          color: block.color,
          fontFamily: 'inherit',
          lineHeight: 1.4,
          padding: '2px 4px',
          outline: 'none',
          background: isSelected ? 'rgba(255,255,255,0.85)' : 'transparent',
          borderRadius: 2,
          wordBreak: 'break-word',
          cursor: 'text',
          transition: 'background 0.15s',
          caretColor: 'var(--primary)',
        }}
      />
    </div>
  );
};

export default OverlayEditor;
