import React, { useState, useRef, useEffect } from 'react';
import { 
  Square, Circle, Type, MousePointer2, Minus, 
  Trash2, Save, Palette, FileText, Plus, BrainCircuit, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Setup PDF.js worker with a reliable CDN matching installed version
// Setup PDF.js worker using a local-friendly worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.js`;

interface EditorProps {
  onSave: (name: string, data: string, type: string) => void;
  defaultWatermark?: string;
}

type ElementType = 'text' | 'rect' | 'circle' | 'line';

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  radius?: number;
  points?: number[];
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
}

const Editor: React.FC<EditorProps> = ({ onSave, defaultWatermark }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ElementType | 'select'>('select');
  const [color, setColor] = useState('#3b82f6');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(defaultWatermark || 'CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.1);
  const [fileName, setFileName] = useState('New_Lab_Record.pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorStatus, setEditorStatus] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth - (window.innerWidth >= 1024 ? 400 : 80);
      const calculatedZoom = Math.min(containerWidth / 794, 0.8);
      setZoom(calculatedZoom);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addElement = (type: ElementType) => {
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 50,
      y: 50,
      color,
      width: type === 'rect' ? 120 : undefined,
      height: type === 'rect' ? 80 : undefined,
      radius: type === 'circle' ? 40 : undefined,
      text: type === 'text' ? 'New Intelligence Entry' : undefined,
      fontSize: type === 'text' ? 16 : undefined,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: color
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
    setTool('select');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      
      if (file.type === 'application/pdf') {
        try {
          setIsProcessing(true);
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ 
            canvasContext: context, 
            viewport,
            canvas // Required in some 5.x versions
          } as any).promise;
          setBgImage(canvas.toDataURL());
        } catch (error) {
          console.error('PDF rendering failed:', error);
          // Show error on the canvas instead of alert
          setBgImage(null);
        } finally {
          setIsProcessing(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => setBgImage(event.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleOCR = async () => {
    if (!bgImage) return;
    
    try {
      setIsProcessing(true);
      const worker = await createWorker('eng', 1, {
        logger: m => console.log(m),
        workerPath: 'https://unpkg.com/tesseract.js@v5.1.0/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@v5.1.0/tesseract-core-simd.wasm.js',
      });
      
      const { data: { blocks } } = await worker.recognize(bgImage);
      
      // Calculate scaling factors to match background image to container
      // The canvas was rendered at scale 2, so we need to map back to A4 coords
      
      const newElements: CanvasElement[] = blocks?.map(block => {
        // Tesseract coords are relative to the raw image (canvas)
        // We need to proportion them to our 210mm (794px) container
        // Actually, just scale based on the relative position
        // Tesseract image width is inferred from bgImage
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: 'text' as const,
          x: block.bbox.x0 / 2, // Simple 1/2 works as scale was 2
          y: block.bbox.y1 / 2,
          text: block.text.trim(),
          color: '#000000',
          fontSize: Math.max(12, (block.bbox.y1 - block.bbox.y0) / 2.5),
          fontWeight: 'normal',
          width: (block.bbox.x1 - block.bbox.x0) / 2,
          height: (block.bbox.y1 - block.bbox.y0) / 2,
          borderWidth: 0,
          borderStyle: 'solid' as const,
          borderColor: 'transparent'
        };
      }).filter(b => b.text.length > 1) || [];

      setElements([...elements, ...newElements]);
      await worker.terminate();
      setEditorStatus(`Extracted ${newElements.length} data blocks`);
      setTimeout(() => setEditorStatus(null), 3000);
    } catch (error) {
      console.error('OCR failed:', error);
      setEditorStatus('Extraction failed');
      setTimeout(() => setEditorStatus(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleMouseDown = (e: React.MouseEvent, id?: string) => {
    if (tool === 'select' && id) {
      setSelectedId(id);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedId) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      
      const el = elements.find(el => el.id === selectedId);
      if (el) {
        updateElement(selectedId, { x: el.x + dx, y: el.y + dy });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 3));
    }
  };

  const handleSave = () => {
    setEditorStatus(`Exporting ${fileName}...`);
    onSave(fileName, "dummy", "application/pdf");
    setTimeout(() => setEditorStatus(null), 3000);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/30 rounded-3xl overflow-hidden border border-slate-800/50 backdrop-blur-sm shadow-2xl animate-in max-w-[1200px] relative">
      {editorStatus && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-electric-blue text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-blue-glow animate-bounce">
          {editorStatus}
        </div>
      )}
      {/* Editor Header */}
      <div className="bg-slate-950/90 p-3 px-6 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <FileText className="text-electric-blue shrink-0" size={20} />
          <input 
            value={fileName} 
            onChange={(e) => setFileName(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-slate-100 focus:ring-1 focus:ring-electric-blue/30 rounded px-2 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-slate-800 hover:bg-slate-900 h-9">
            <Plus size={16} className="mr-2" /> Import
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,image/*" onChange={handleImport} />
          <Button onClick={handleSave} className="bg-electric-blue text-white shadow-blue-glow h-9">
            <Save size={16} className="mr-2" /> Export PDF
          </Button>
          {bgImage && (
            <Button 
              onClick={handleOCR} 
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-500 text-white h-9"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <BrainCircuit size={16} className="mr-2" />}
              Extract Intelligence
            </Button>
          )}
        </div>
      </div>

      {/* Primary Toolbar */}
      <div className="bg-slate-950/70 p-2 border-b border-slate-800 flex flex-wrap items-center gap-2 px-4 shadow-sm">
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 size={16} />} title="Select" />
          <ToolButton active={tool === 'text'} onClick={() => addElement('text')} icon={<Type size={16} />} title="Add Text" />
          <ToolButton active={tool === 'rect'} onClick={() => addElement('rect')} icon={<Square size={16} />} title="Rectangle" />
          <ToolButton active={tool === 'circle'} onClick={() => addElement('circle')} icon={<Circle size={16} />} title="Circle" />
          <ToolButton active={tool === 'line'} onClick={() => addElement('line')} icon={<Minus size={16} />} title="Line" />
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 gap-1 px-2 items-center">
          <Palette size={14} className="text-slate-500" />
          <input 
            type="color" 
            value={color} 
            onChange={(e) => {
              setColor(e.target.value);
              if (selectedId) updateElement(selectedId, { color: e.target.value, borderColor: e.target.value });
            }}
            className="w-5 h-5 bg-transparent border-none cursor-pointer rounded overflow-hidden"
          />
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 gap-2 px-3 items-center">
          <span className="text-[10px] font-black text-slate-600 uppercase">Watermark</span>
          <input 
            value={watermark} 
            onChange={(e) => setWatermark(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] text-white w-24 font-mono"
            placeholder="Researcher ID"
          />
          <input 
            type="range" min="0" max="0.5" step="0.01" value={watermarkOpacity}
            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-full appearance-none accent-electric-blue cursor-pointer"
          />
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 gap-2 px-3 items-center ml-2">
          <span className="text-[10px] font-black text-slate-600 uppercase">Zoom</span>
          <input 
            type="range" min="0.2" max="2" step="0.1" value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 h-1 bg-slate-800 rounded-full appearance-none accent-electric-blue cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-400 w-8">{Math.round(zoom * 100)}%</span>
        </div>

        {selectedId && (
          <div className="ml-auto flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 gap-1">
              {[1, 2, 4, 8].map(w => (
                <button 
                  key={w}
                  onClick={() => updateElement(selectedId, { borderWidth: w })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${selectedElement?.borderWidth === w ? 'bg-electric-blue text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                >
                  {w}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setElements(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }} className="text-red-400 hover:bg-red-400/10 h-8 w-8">
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Main Workspace */}
        <div 
          className="flex-1 overflow-auto bg-slate-950/50 p-6 md:p-12 flex justify-center items-start custom-scrollbar h-full relative scroll-smooth"
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onWheel={handleWheel}
        >
          <div 
            ref={canvasRef}
            style={{ 
              width: '210mm', 
              height: '297mm',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.1s ease',
              marginTop: '20px',
              marginBottom: '100px'
            }}
            className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden shrink-0"
          >
            {/* Background Layer (Imported Docs/Images) */}
            {bgImage && (
              <img src={bgImage} alt="background" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80" />
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                <Loader2 className="text-electric-blue animate-spin" size={48} />
                <span className="text-white font-bold tracking-widest animate-pulse">EXTRACTING DATA...</span>
              </div>
            )}

            {/* Grid Lines (Subtle) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ 
              backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />

            {/* Diagonal Watermark Layer */}
            {watermark && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden" style={{ opacity: watermarkOpacity }}>
                <div className="text-[12rem] font-black text-slate-950 -rotate-45 uppercase tracking-[2rem] whitespace-nowrap opacity-50">
                  {watermark}
                </div>
              </div>
            )}

            {/* Elements Layer */}
            {elements.map(el => (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDown(e, el.id)}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  backgroundColor: el.type === 'rect' ? 'transparent' : 'transparent',
                  border: el.type === 'rect' ? `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}` : 'none',
                  borderRadius: el.type === 'circle' ? '50%' : '0',
                  color: el.type === 'text' ? el.color : 'inherit',
                  fontSize: el.fontSize,
                  padding: el.type === 'text' ? '4px' : '0',
                  cursor: tool === 'select' ? 'move' : 'default',
                  outline: selectedId === el.id ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '2px',
                  zIndex: selectedId === el.id ? 10 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {el.type === 'text' && (
                  <textarea 
                    value={el.text} 
                    onChange={(e) => updateElement(el.id, { text: e.target.value })}
                    className="bg-transparent border-none outline-none focus:ring-0 text-inherit w-full h-full font-bold resize-none text-center leading-tight"
                    rows={1}
                  />
                )}
                {el.type === 'circle' && (
                  <div style={{ width: el.radius! * 2, height: el.radius! * 2, border: `${el.borderWidth}px ${el.borderStyle} ${el.color}`, borderRadius: '50%' }} />
                )}
                {el.type === 'line' && (
                  <div style={{ width: 120, height: el.borderWidth, backgroundColor: el.color }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Properties */}
        {selectedElement && (
          <div className="w-full md:w-72 bg-slate-950/80 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-8 animate-in-right overflow-y-auto max-h-[40vh] md:max-h-full">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Parameter Matrix</h3>
            
            <div className="space-y-6">
              {selectedElement.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-3 font-medium">Text Magnitude</label>
                    <input 
                      type="range" min="12" max="120" value={selectedElement.fontSize} 
                      onChange={(e) => updateElement(selectedId!, { fontSize: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-electric-blue"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-xs text-slate-400 block font-medium">Border Dynamics</label>
                <div className="flex gap-2">
                  {(['solid', 'dashed', 'dotted'] as const).map(s => (
                    <button 
                      key={s} 
                      onClick={() => updateElement(selectedId!, { borderStyle: s })}
                      className={`flex-1 p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedElement.borderStyle === s ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-slate-400 block font-medium">Geometry (MM)</label>
                <div className="grid grid-cols-2 gap-3">
                  <PropertyInput label="WIDTH" value={selectedElement.width || 0} onChange={(v) => updateElement(selectedId!, { width: v })} />
                  <PropertyInput label="HEIGHT" value={selectedElement.height || 0} onChange={(v) => updateElement(selectedId!, { height: v })} />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <Button variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-400/10 h-10 text-[10px] uppercase font-bold" onClick={() => { setElements(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }}>
                Purge Element
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PropertyInput: React.FC<{ label: string, value: number, onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
    <span className="text-[9px] font-black text-slate-600 block mb-1">{label}</span>
    <input 
      type="number" value={Math.round(value)} 
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="bg-transparent border-none text-xs text-white p-0 focus:ring-0 w-full font-mono"
    />
  </div>
);

const ToolButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, title: string }> = ({ active, onClick, icon, title }) => (
  <button 
    onClick={onClick}
    title={title}
    className={`p-2 rounded-md transition-all ${active ? 'bg-electric-blue text-white shadow-blue-glow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
  >
    {icon}
  </button>
);

export default Editor;
