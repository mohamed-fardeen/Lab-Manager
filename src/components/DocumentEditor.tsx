import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, Download, FileText, Type, Heading1, Heading2, 
  Bold, List, Undo, Redo, Loader2, Sparkles, Minus, Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface DocumentEditorProps {
  initialHtml?: string;
  fileName: string;
  onSave?: (name: string, pdfBase64: string, type: string, blocks: any[]) => void;
  defaultWatermark?: string;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  initialHtml = '', 
  fileName,
  onSave,
  defaultWatermark = 'rrn'
}) => {
  const [pages, setPages] = useState<{ id: number, blocks: any[], image: string, width: number, height: number, hasImages: boolean }[]>([]);
  const [dragBlock, setDragBlock] = useState<{ pageId: number, blockId: string, startX: number, startY: number, initialX: number, initialY: number } | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [mode, setMode] = useState<'edit' | 'move'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [watermarkText, setWatermarkText] = useState(defaultWatermark);
  const [watermarkSelection, setWatermarkSelection] = useState<string>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If a valid RRN was passed directly from App.tsx, use it.
    if (defaultWatermark && defaultWatermark !== 'DRAFT' && defaultWatermark !== 'rrn') {
      setWatermarkText(defaultWatermark);
      return;
    }
    
    // Otherwise, robustly extract it from the authenticated user's email prefix (e.g., 240171601189@...)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const emailPrefix = session.user.email.split('@')[0].toUpperCase();
        setWatermarkText(emailPrefix);
      }
    });
  }, [defaultWatermark]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragBlock || mode !== 'move') return;
      
      const dx = (e.clientX - dragBlock.startX) / zoom;
      const dy = (e.clientY - dragBlock.startY) / zoom;

      setPages(prev => prev.map(p => {
        if (p.id !== dragBlock.pageId) return p;
        return {
          ...p,
          blocks: p.blocks.map(b => {
            if (b.id !== dragBlock.blockId) return b;
            return {
              ...b,
              x: dragBlock.initialX + (dx * 2), // Multiply by 2 because coordinates are at scale 2.0
              y: dragBlock.initialY + (dy * 2)
            };
          })
        };
      }));
    };

    const handleMouseUp = () => setDragBlock(null);

    if (dragBlock && mode === 'move') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragBlock, zoom, mode]);

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setPages([]);
    
    try {
      const Tesseract = (window as any).Tesseract;
      if (!Tesseract) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/tesseract.js@v5.0.3/dist/tesseract.min.js';
        document.head.appendChild(script);
        await new Promise(r => script.onload = r);
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      
      let globalInsideOutputZone = false;
      const newPages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; 
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // --- SMART INNER WIPE ENGINE (DARK BORDERS) ---
        
        // PASS 1: Render full original content to tempCanvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tCtx = tempCanvas.getContext('2d');
        await page.render({ canvasContext: tCtx!, viewport }).promise;

        const textContent = await page.getTextContent();
        const bCtx = canvas.getContext('2d');
        let pageHasImages = false;
        
        if (bCtx) {
          // Render full page to main canvas (keeps borders dark and perfectly intact)
          await page.render({ canvasContext: bCtx, viewport }).promise;

          // Identify Zones
          let outputY = globalInsideOutputZone ? 0 : -1;
          let resultY = viewport.height;
          let aimY = 0;
          
          textContent.items.forEach((item: any) => {
            const text = item.str.toLowerCase();
            const tx = (window as any).pdfjsLib.Util.transform(viewport.transform, item.transform);
            const itemY = (tx[5] - (item.transform[0] * scale));
            
            if (text.includes('output')) { 
              outputY = itemY + (item.transform[0] * scale); 
              globalInsideOutputZone = true; 
            }
            if (text.includes('result')) { 
              resultY = itemY; 
              globalInsideOutputZone = false; 
            }
            if (text === 'aim' || text === 'aim:') {
              aimY = itemY;
            }
          });

          // PASS 2: Smart Inner Wipe (Kills watermark and body text, protects outer borders)
          bCtx.fillStyle = 'white';
          
          const wipeLeft = viewport.width * 0.08; // Protect left border (8% margin)
          const wipeWidth = viewport.width * 0.84; // Protect right border
          const wipeTop = aimY > 0 ? aimY - 30 : viewport.height * 0.18; // Protect header borders
          const wipeHeight = viewport.height - wipeTop - (viewport.height * 0.06); // Protect bottom border
          
          // Wipe the central body area pure white
          if (outputY === -1) {
            bCtx.fillRect(wipeLeft, wipeTop, wipeWidth, wipeHeight);
          } else {
            // If there's an image zone, wipe before and after it
            bCtx.fillRect(wipeLeft, wipeTop, wipeWidth, Math.max(0, outputY - wipeTop));
            if (!globalInsideOutputZone || resultY < viewport.height) {
              const bottomWipeTop = Math.max(resultY, wipeTop);
              const bottomWipeHeight = (wipeTop + wipeHeight) - bottomWipeTop;
              if (bottomWipeHeight > 0) {
                bCtx.fillRect(wipeLeft, bottomWipeTop, wipeWidth, bottomWipeHeight);
              }
            }
          }

          // PASS 3: Solid Surgical Erasure (Kills any remaining text in the header)
          textContent.items.forEach((item: any) => {
            const tx = (window as any).pdfjsLib.Util.transform(viewport.transform, item.transform);
            const x = tx[4];
            const y = tx[5] - (item.transform[0] * scale);
            const w = item.width * scale;
            const h = item.transform[0] * scale;
            
            const midY = y + (h / 2);
            const isInProtectionZone = outputY !== -1 && midY > outputY && midY < resultY;

            if (!isInProtectionZone) {
              // Strict bounding box to prevent cutting adjacent vertical borders
              bCtx.fillRect(x, y - 1, w, h + 2);
            }
          });

          // PASS 4: Header Line Restoration (Repairs cuts caused by whiteout)
          const opList = await page.getOperatorList();
          const { OPS } = (window as any).pdfjsLib;
          const textOps = [
            OPS.showText, OPS.showTextWithPositioning, OPS.nextLineShowText, 
            OPS.nextLineShowTextWithSpacing, OPS.showSpacedText, OPS.setLeading,
            OPS.setLeadingMoveText, OPS.setFont, OPS.setTextMatrix, OPS.setCharSpacing,
            OPS.setWordSpacing, OPS.setHScale, OPS.setTextRise, OPS.setTextRenderingMode
          ];
          
          const filteredOpList = { ...opList, fnArray: [], argsArray: [] };
          for (let j = 0; j < opList.fnArray.length; j++) {
            if (!textOps.includes(opList.fnArray[j])) {
              (filteredOpList.fnArray as any).push(opList.fnArray[j]);
              (filteredOpList.argsArray as any).push(opList.argsArray[j]);
            }
          }

          bCtx.save();
          bCtx.beginPath();
          bCtx.rect(0, 0, viewport.width, wipeTop); // Clip to header area
          bCtx.clip();
          await page.render({ canvasContext: bCtx, viewport, operatorList: filteredOpList as any }).promise;
          bCtx.restore();

          // PASS 5: Restore Image Zone (100% Fidelity for Screenshots)
          if (outputY !== -1) {
            pageHasImages = true;
            const protectionHeight = resultY - outputY;
            if (protectionHeight > 0) {
              bCtx.drawImage(
                tempCanvas, 
                0, outputY, viewport.width, protectionHeight, 
                0, outputY, viewport.width, protectionHeight
              );
            }
          }
        }

        const pageImage = canvas.toDataURL('image/png');

        // Prepare editable blocks
        const blocks = textContent.items.map((item: any, idx: number) => {
          const tx = (window as any).pdfjsLib.Util.transform(viewport.transform, item.transform);
          return {
            id: `item-${i}-${idx}`,
            text: item.str,
            x: tx[4],
            y: tx[5] - (item.transform[0] * scale),
            fontSize: item.transform[0] * scale,
            isBold: item.fontName?.includes('Bold')
          };
        });

        newPages.push({
          id: i,
          image: pageImage,
          width: viewport.width,
          height: viewport.height,
          blocks: blocks,
          hasImages: pageHasImages
        });
        
        setPages([...newPages]);
      }
    } catch (err: any) {
      console.error('Import failed', err);
    } finally {
      setIsImporting(false);
    }
  };

  const updateBlock = (pageId: number, blockId: string, text: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, text } : b)
      };
    }));
  };

  const startDrag = (e: React.MouseEvent, pageId: number, block: any) => {
    if (mode !== 'move' || e.button !== 0) return; // Only left click and move mode
    e.preventDefault();
    setDragBlock({
      pageId,
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: block.x,
      initialY: block.y
    });
  };

  const generatePdfBase64 = async (): Promise<string> => {
    if (pages.length === 0) return '';
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [pages[0].width, pages[0].height]
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (i > 0) {
        pdf.addPage([page.width, page.height], 'portrait');
      }

      const canvas = document.createElement('canvas');
      canvas.width = page.width;
      canvas.height = page.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const img = new Image();
      img.src = page.image;
      await new Promise(resolve => { img.onload = resolve; });
      ctx.drawImage(img, 0, 0, page.width, page.height);

      const shouldDrawWatermark = watermarkText && (
        (watermarkSelection === 'all') || 
        (watermarkSelection === 'auto' && !page.hasImages) || 
        (watermarkSelection === page.id.toString())
      );

      if (shouldDrawWatermark) {
        ctx.save();
        ctx.translate(page.width / 2, page.height / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.font = `bold 120px "Times New Roman", serif`;
        ctx.fillStyle = 'rgba(200, 200, 200, 0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }

      for (const block of page.blocks) {
        ctx.fillStyle = 'white';
        ctx.font = `${block.isBold ? 'bold ' : ''}${block.fontSize}px "Times New Roman", serif`;
        const textMetrics = ctx.measureText(block.text);
        const padding = 2;
        ctx.fillRect(block.x - padding, block.y - padding, textMetrics.width + (padding*2), block.fontSize + (padding*2));

        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.fillText(block.text, block.x, block.y);
      }

      const finalImage = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(finalImage, 'JPEG', 0, 0, page.width, page.height);
    }

    return pdf.output('datauristring').split(',')[1];
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const base64 = await generatePdfBase64();
      if (!base64) return;
      
      const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.pdf', '_final.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!onSave) return;
    setIsExporting(true);
    try {
      const base64 = await generatePdfBase64();
      if (!base64) return;
      
      const allBlocks = pages.flatMap(p => p.blocks);
      onSave(fileName, base64, 'pdf', allBlocks);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full app-bg overflow-hidden relative font-sans">
      {/* Dynamic Toolbar */}
      <div className="app-editor-toolbar p-3 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-6">
          <input type="file" ref={fileInputRef} onChange={handleImportPdf} accept=".pdf" className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-primary hover:bg-foreground hover:text-background text-primary-foreground font-bold h-9">
            {isImporting ? <Loader2 className="animate-spin mr-2" size={16} /> : <FileText className="mr-2" size={16} />}
            IMPORT PDF
          </Button>

          {/* Mode Switcher */}
          <div className="flex items-center app-surface rounded-lg p-1 border border-border h-9">
            <button 
              onClick={() => setMode('edit')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'edit' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              EDIT TEXT
            </button>
            <button 
              onClick={() => setMode('move')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'move' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              MOVE BLOCKS
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 app-surface rounded-lg px-2 h-9 border border-border">
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="hover:app-surface-raised h-7 w-7 text-foreground">
              <Minus size={14} />
            </Button>
            <span className="text-xs font-mono min-w-[45px] text-center text-primary">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} className="hover:app-surface-raised h-7 w-7 text-foreground">
              <Plus size={14} />
            </Button>
          </div>

          {/* Watermark Control */}
          <div className="flex items-center gap-2 app-surface rounded-lg px-2 h-9 border border-border">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Watermark:</span>
            <input 
              type="text" 
              value={watermarkText} 
              onChange={(e) => setWatermarkText(e.target.value)}
              className="bg-muted text-foreground text-xs px-2 py-1 rounded border border-border focus:outline-none focus:border-primary w-24 font-serif"
              placeholder="Text"
            />
            <select
              value={watermarkSelection}
              onChange={(e) => setWatermarkSelection(e.target.value)}
              className="bg-muted text-foreground text-xs px-2 py-1 rounded border border-border focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="auto">Auto (Skip Images)</option>
              <option value="all">All Pages</option>
              {pages.map(p => <option key={p.id} value={p.id.toString()}>Page {p.id}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting} className="border-border text-foreground hover:app-surface-raised h-9">
            {isExporting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download className="mr-2" size={16} />} 
            Export
          </Button>
          <Button onClick={handleSaveChanges} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold h-9">
            {isExporting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />} 
            Save Changes
          </Button>
        </div>
      </div>

      {/* High-Resolution Page Viewer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 md:p-16 space-y-20 flex flex-col items-center app-bg scroll-smooth">
        {pages.map(page => (
          <div 
            key={page.id}
            className="app-doc-page relative overflow-hidden transition-all duration-300 origin-top mb-4"
            style={{ 
              width: `${(page.width / 2) * zoom}px`, 
              height: `${(page.height / 2) * zoom}px`,
              backgroundImage: `url(${page.image})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              flexShrink: 0
            }}
          >
            {/* Dynamic Watermark Overlay */}
            {watermarkText && (
              (watermarkSelection === 'all') || 
              (watermarkSelection === 'auto' && !page.hasImages) || 
              (watermarkSelection === page.id.toString())
            ) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <span style={{
                  transform: 'rotate(-45deg)',
                  fontSize: `${120 * zoom}px`,
                  fontFamily: "'Times New Roman', serif",
                  fontWeight: 'bold',
                  color: 'rgba(200, 200, 200, 0.25)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none'
                }}>
                  {watermarkText}
                </span>
              </div>
            )}

            {/* Precision Metadata Overlays */}
            {page.blocks.map(block => (
              <div
                key={block.id}
                contentEditable={mode === 'edit'}
                suppressContentEditableWarning
                onMouseDown={(e) => startDrag(e, page.id, block)}
                onBlur={(e) => updateBlock(page.id, block.id, e.currentTarget.innerText)}
                className={`absolute transition-all rounded-sm leading-none group z-10 ${mode === 'move' ? 'cursor-move ring-1 ring-primary/30 hover:ring-primary' : 'cursor-text hover:bg-primary/10 focus:bg-background focus:outline-primary'} ${dragBlock?.blockId === block.id ? 'opacity-50 ring-2 ring-primary' : ''}`}
                style={{
                  left: `${(block.x / 2) * zoom}px`,
                  top: `${(block.y / 2) * zoom}px`,
                  fontSize: `${(block.fontSize / 2) * zoom}px`,
                  fontWeight: block.isBold ? 'bold' : 'normal',
                  fontFamily: "'Times New Roman', serif",
                  color: '#000',
                  whiteSpace: 'nowrap',
                  backgroundColor: 'white', // Masks the original text underneath
                  padding: '0 2px'
                }}
              >
                {block.text}
              </div>
            ))}
            
            {/* Page Floating Badge */}
            <div className="absolute top-4 right-4 app-surface backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-full text-muted-foreground uppercase tracking-tighter">
              PAGE {page.id}
            </div>
          </div>
        ))}

        {pages.length === 0 && !isImporting && (
          <div className="flex flex-col items-center justify-center h-[600px] w-full max-w-4xl border-2 border-dashed border-slate-400 app-bg rounded-[40px] text-muted-foreground gap-4">
             <div className="w-20 h-20 app-surface rounded-full flex items-center justify-center shadow-inner">
                <FileText size={40} className="text-muted-foreground" />
             </div>
             <div className="text-center">
               <h3 className="text-xl font-bold text-slate-700">Document Engine Offline</h3>
               <p className="text-sm">Import the original PDF to calibrate the page-based layout.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
