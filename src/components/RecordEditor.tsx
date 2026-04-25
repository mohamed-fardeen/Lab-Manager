import React, { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Download, RefreshCw, Loader2, FileText } from 'lucide-react';
import { Button } from './ui/button';

export interface RecordData {
    programNumber: string;
    date: string;
    programName: string;
    aim: string;
    algorithm: string;
    programCode: string;
    output: string;
    result: string;
    vivaQuestions?: { question: string; answer: string }[];
}

interface RecordEditorProps {
    data: RecordData;
    onChange: (field: keyof RecordData, value: string) => void;
    userRrn: string;
    onRegenerate: () => void;
    isGenerating: boolean;
}

// Pixels per mm at 96 DPI
const MM_PX = 96 / 25.4;
// Inner content area of a page: 297mm - 15mm top - 15mm bottom = 267mm
const PAGE_CONTENT_H = Math.round(267 * MM_PX);
// Padding inside the page content wrapper (top + bottom)
const CONTENT_PADDING = 44;
// Max usable height for sections inside a page
const MAX_SECTION_H = PAGE_CONTENT_H - CONTENT_PADDING;

// Shared inline styles
const BASE_TA: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    resize: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: '13px',
    lineHeight: '1.65',
    color: 'black',
    display: 'block',
};

const SECTION_LABEL: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '14px',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    marginBottom: '4px',
    fontFamily: "'Times New Roman', Times, serif",
    color: 'black',
};

const WATERMARK_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
};

const BORDER_OVERLAY: React.CSSProperties = {
    position: 'absolute',
    top: '15mm', left: '15mm', right: '15mm', bottom: '15mm',
    border: '2px solid black',
    zIndex: 1,
    pointerEvents: 'none',
};

function Watermark({ rrn }: { rrn: string }) {
    return (
        <div style={WATERMARK_STYLE}>
            <div style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontWeight: 'bold',
                fontSize: '96px',
                color: 'rgba(0,0,0,0.10)',
                transform: 'rotate(-45deg)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                letterSpacing: '-1px',
                textAlign: 'center',
            }}>
                {rrn || 'GUEST-ID'}
            </div>
        </div>
    );
}

function A4Page({ children, rrn }: { children: React.ReactNode; rrn: string }) {
    return (
        <div className="page-block" style={{
            width: '210mm',
            height: '297mm',
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            overflow: 'hidden',
            fontFamily: "'Times New Roman', Times, serif",
        }}>
            <Watermark rrn={rrn} />

            {/* Border drawn at 15mm inset on all sides */}
            <div style={{
                position: 'absolute',
                top: '15mm', left: '15mm', right: '15mm', bottom: '15mm',
                border: '2px solid black',
                zIndex: 1,
                pointerEvents: 'none',
            }} />

            {/* Content sits INSIDE the border — positioned to exactly match the border inset */}
            <div style={{
                position: 'absolute',
                top: '15mm', left: '15mm', right: '15mm', bottom: '15mm',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {children}
            </div>
        </div>
    );
}

function AutoTA({ value, onChange, style, dataAttr }: {
    value: string;
    onChange: (v: string) => void;
    style?: React.CSSProperties;
    dataAttr?: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    // Auto resize on mount and value change
    useEffect(() => {
        if (!ref.current) return;
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${t.scrollHeight}px`;
            }}
            {...(dataAttr ? { [dataAttr]: 'true' } : {})}
            style={{ ...BASE_TA, ...style }}
        />
    );
}

export default function RecordEditor({ data, onChange, userRrn, onRegenerate, isGenerating }: RecordEditorProps) {
    if (!data || !data.aim) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in">
                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center border border-slate-700 shadow-blue-glow">
                    <FileText size={40} className="text-slate-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase italic font-orbitron">Intelligence Void Detected</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto uppercase tracking-widest font-black">No valid record data sequencing available in the current buffer.</p>
                </div>
                <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="border-slate-800 text-slate-400 hover:text-electric-blue hover:border-electric-blue/50 transition-all uppercase tracking-widest text-[10px] font-black"
                >
                    Reset System Buffer
                </Button>
            </div>
        );
    }

    const pagesRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- Program split state ---
    const [progPart1, setProgPart1] = useState(data.programCode || '');
    const [progPart2, setProgPart2] = useState('');
    // Ref to the content div inside Page 1 (below header)
    const page1ContentRef = useRef<HTMLDivElement>(null);
    // Prevent repeated measurements for same data
    const splitKeyRef = useRef('');

    // Reset split whenever the source data changes
    useEffect(() => {
        setProgPart1(data.programCode || '');
        setProgPart2('');
        splitKeyRef.current = '';
    }, [data.programCode, data.aim, data.algorithm]);

    // After render, measure Page 1 content and split program if it overflows
    useEffect(() => {
        const key = `${data.aim}|${data.algorithm}|${data.programCode}`;
        if (splitKeyRef.current === key) return; // already measured for this data

        // Use double rAF so browser has fully painted and textarea heights are final
        const id = requestAnimationFrame(() => requestAnimationFrame(() => {
            if (!page1ContentRef.current) return;
            splitKeyRef.current = key;

            const contentEl = page1ContentRef.current;
            const totalHeight = contentEl.scrollHeight;

            if (totalHeight <= MAX_SECTION_H) return; // everything fits — done

            const overflow = totalHeight - MAX_SECTION_H;

            // Find the program textarea we tagged
            const ta = contentEl.querySelector<HTMLTextAreaElement>('[data-prog-p1]');
            if (!ta || ta.scrollHeight === 0) return;

            const safeCode = data.programCode || '';
            const lines = safeCode.split('\n');
            // Average px per program line
            const pxPerLine = ta.scrollHeight / Math.max(lines.length, 1);
            // How many lines need to move to page 2
            const linesToMove = Math.ceil(overflow / pxPerLine) + 2; // +2 safety buffer
            const splitAt = Math.max(1, lines.length - linesToMove);

            setProgPart1(lines.slice(0, splitAt).join('\n'));
            setProgPart2(lines.slice(splitAt).join('\n'));
        }));

        return () => cancelAnimationFrame(id);
    }); // runs every render so it catches textarea reflow

    // PDF export — captures each .page-block individually
    const handleDownloadPDF = async () => {
        const container = pagesRef.current;
        if (!container) return;
        setIsExporting(true);

        try {
            const html2canvas = (await import('html2canvas-pro')).default;
            const pages = container.querySelectorAll<HTMLElement>('.page-block');
            if (!pages.length) return;

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) pdf.addPage();

                const canvas = await html2canvas(pages[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    onclone: (clonedDoc) => {
                        // html2canvas severely mangles textarea text rendering (shrinking sizes, 
                        // clipping bounds, ignoring margins/flex).
                        // Fix: Before html2canvas renders, map over every textarea in the cloned
                        // document and swap it for a static div matching its computed styles.
                        const textareas = clonedDoc.querySelectorAll('textarea');
                        textareas.forEach(ta => {
                            const div = clonedDoc.createElement('div');
                            // Copy standard computed styles
                            const style = clonedDoc.defaultView?.getComputedStyle(ta);
                            if (style) {
                                for (let prop of style) {
                                    div.style.setProperty(prop, style.getPropertyValue(prop));
                                }
                            }
                            // Hard-enforce inline overrides from AutoTA to ensure text wraps identically
                            div.style.cssText += ta.style.cssText;
                            div.style.whiteSpace = 'pre-wrap';
                            div.style.wordBreak = 'break-word';
                            div.style.boxSizing = 'border-box';
                            div.innerHTML = ta.value.replace(/\n/g, '<br/>') || '&nbsp;';
                            
                            // Swap them
                            ta.parentNode?.replaceChild(div, ta);
                        });

                        // Do the exact same for <input> fields to fix cut-off text in header
                        const inputs = clonedDoc.querySelectorAll('input');
                        inputs.forEach(input => {
                            const span = clonedDoc.createElement('span');
                            const style = clonedDoc.defaultView?.getComputedStyle(input);
                            if (style) {
                                for (let prop of style) {
                                    span.style.setProperty(prop, style.getPropertyValue(prop));
                                }
                            }
                            span.style.cssText += input.style.cssText;
                            span.style.display = 'inline-block';
                            span.innerText = input.value || '';
                            input.parentNode?.replaceChild(span, input);
                        });
                    }
                });
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

                // Re-draw crisp vector border on top of image
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.6);
                pdf.rect(15, 15, 180, 267);
            }

            pdf.save(`LabRecord_${data.programNumber || 'Output'}.pdf`);
        } catch (err) {
            console.error('PDF Error:', err);
            alert('PDF generation failed. See console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    const vivaArray = Array.isArray(data.vivaQuestions) ? data.vivaQuestions : [];
    const hasViva = vivaArray.length > 0;
    const hasProgPage2 = progPart2.length > 0;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0f18' }}>
            {/* ── Toolbar ── */}
            <div style={{
                height: 56, padding: '0 32px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'rgba(0,0,0,0.85)',
                borderBottom: '1px solid #1e293b', backdropFilter: 'blur(12px)', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 2 }}>
                            Automated Lab Intelligence
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {data.programName || 'New Laboratory Entry'}
                        </div>
                    </div>
                    <div style={{ width: 1, height: 24, background: '#1e293b' }} />
                    <Button onClick={onRegenerate} disabled={isGenerating} variant="ghost"
                        style={{ height: 32, padding: '0 12px', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                        {isGenerating ? <Loader2 size={12} style={{ marginRight: 6 }} /> : <RefreshCw size={12} style={{ marginRight: 6 }} />}
                        Re-Generate
                    </Button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ISO-216 A4</span>
                    <Button onClick={handleDownloadPDF} disabled={isExporting || isGenerating}
                        style={{ background: '#38bdf8', color: 'white', height: 36, padding: '0 24px', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 6 }}>
                        {isExporting ? <Loader2 size={14} style={{ marginRight: 6 }} /> : <Download size={14} style={{ marginRight: 6 }} />}
                        Print / Save PDF
                    </Button>
                </div>
            </div>

            {/* ── Pages scroll area ── */}
            <div ref={pagesRef} style={{
                flex: 1, overflowY: 'auto', background: '#121212',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '48px 0', gap: 32,
            }}>

                {/* ══════════════════════════════════════════════
                        PAGE 1 — Header + Aim + Algorithm + Program (part 1)
                    ══════════════════════════════════════════════ */}
                <A4Page rrn={userRrn}>
                    {/* Header row — alignItems:stretch so both columns are always equal height */}
                    <div style={{ display: 'flex', borderBottom: '2px solid black', flexShrink: 0, alignItems: 'stretch' }}>
                        {/* Left column — EXP NO and DATE inline, vertically centered */}
                        <div style={{ width: '45mm', flexShrink: 0, borderRight: '2px solid black', padding: '12px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ fontWeight: 'bold', fontSize: 13, fontFamily: "'Times New Roman', Times, serif", whiteSpace: 'nowrap', color: 'black' }}>EXP NO:</span>
                                <input value={data.programNumber} onChange={e => onChange('programNumber', e.target.value)}
                                    style={{ fontWeight: 'bold', fontSize: 13, border: 'none', outline: 'none', background: 'transparent', minWidth: 0, flex: 1, fontFamily: "'Times New Roman', Times, serif", color: 'black', padding: 0 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ fontWeight: 'bold', fontSize: 13, fontFamily: "'Times New Roman', Times, serif", whiteSpace: 'nowrap', color: 'black' }}>DATE:</span>
                                <input value={data.date} onChange={e => onChange('date', e.target.value)}
                                    style={{ fontWeight: 'bold', fontSize: 13, border: 'none', outline: 'none', background: 'transparent', minWidth: 0, flex: 1, fontFamily: "'Times New Roman', Times, serif", color: 'black', padding: 0 }} />
                            </div>
                        </div>
                        {/* Right column — Flex ensures html2canvas calculates height matching the left column properly */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px 16px 8px 16px' }}>
                            <AutoTA
                                value={data.programName}
                                onChange={v => onChange('programName', v)}
                                style={{ fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3, width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Page 1 content — this div is measured to decide split */}
                    <div ref={page1ContentRef} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14, textAlign: 'justify' }}>
                        <div>
                            <div style={SECTION_LABEL}>Aim:</div>
                            <AutoTA value={data.aim} onChange={v => onChange('aim', v)} />
                        </div>
                        <div>
                            <div style={SECTION_LABEL}>Algorithm:</div>
                            <AutoTA value={data.algorithm} onChange={v => onChange('algorithm', v)} />
                        </div>
                        <div>
                            <div style={SECTION_LABEL}>Program:</div>
                            {/* data-prog-p1 is used to measure this textarea's height for split calculation */}
                            <AutoTA
                                value={progPart1}
                                onChange={v => {
                                    // When user edits part 1 manually, merge both parts and reset split
                                    onChange('programCode', v + (progPart2 ? '\n' + progPart2 : ''));
                                }}
                                style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 12 }}
                                dataAttr="data-prog-p1"
                            />
                        </div>
                    </div>
                </A4Page>

                {/* ══════════════════════════════════════════════
                        PAGE 2 — Program (cont.) if any + Output + Result pinned at bottom
                    ══════════════════════════════════════════════ */}
                <A4Page rrn={userRrn}>
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxSizing: 'border-box', fontSize: 14, textAlign: 'justify' }}>

                        {/* Program Continuation — code continues without any heading */}
                        {hasProgPage2 && (
                            <div style={{ marginBottom: 18 }}>
                                <AutoTA
                                    value={progPart2}
                                    onChange={v => {
                                        onChange('programCode', progPart1 + '\n' + v);
                                    }}
                                    style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 12 }}
                                />
                            </div>
                        )}

                        {/* Output — wrapped in a div with paddingRight instead of margin, as html2canvas miscalculates textarea margins */}
                        <div style={{ paddingRight: '160px' }}>
                            <div style={SECTION_LABEL}>Output:</div>
                            <AutoTA
                                value={data.output}
                                onChange={v => onChange('output', v)}
                                style={{
                                    fontFamily: "'Courier New', Courier, monospace",
                                    fontSize: 12,
                                    backgroundColor: '#000000',
                                    color: '#ffffff',
                                    padding: '8px 12px',
                                    borderRadius: 0,
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Spacer — pushes Result to bottom */}
                        <div style={{ flex: 1 }} />

                        {/* Result — always just above the bottom border */}
                        <div style={{ paddingBottom: 6 }}>
                            <div style={SECTION_LABEL}>Result:</div>
                            <AutoTA value={data.result} onChange={v => onChange('result', v)} />
                        </div>
                    </div>
                </A4Page>

                {/* ══════════════════════════════════════════════
                        PAGE 3 — Viva Voce (only if questions exist)
                    ══════════════════════════════════════════════ */}
                {hasViva && (
                    <A4Page rrn={userRrn}>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, width: '100%', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ ...SECTION_LABEL, textAlign: 'center', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                                Viva Questions
                            </div>
                            {vivaArray.map((vq, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                    {/* Question row */}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <span style={{ fontWeight: 'bold', fontSize: 13, color: 'black', fontFamily: "'Times New Roman', Times, serif", whiteSpace: 'nowrap', flexShrink: 0 }}>Q{i + 1}.</span>
                                        <AutoTA
                                            value={vq.question || ''}
                                            onChange={v => {
                                                const nq = [...vivaArray];
                                                nq[i] = { ...nq[i], question: v };
                                                onChange('vivaQuestions' as any, nq as any);
                                            }}
                                            style={{ fontWeight: 'bold', flex: 1, color: 'black' }}
                                        />
                                    </div>
                                    {/* Answer row — no prefix, just indented text */}
                                    <div style={{ paddingLeft: '22px' }}>
                                        <AutoTA
                                            value={vq.answer || ''}
                                            onChange={v => {
                                                const nq = [...vivaArray];
                                                nq[i] = { ...nq[i], answer: v };
                                                onChange('vivaQuestions' as any, nq as any);
                                            }}
                                            style={{ flex: 1, color: 'black' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </A4Page>
                )}
            </div>
        </div>
    );
}
