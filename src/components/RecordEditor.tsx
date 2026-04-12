import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Button } from './ui/button';

export interface RecordData {
    programNumber: string;
    programName: string;
    aim: string;
    algorithm: string;
    programCode: string;
    output: string;
    result: string;
}

interface RecordEditorProps {
    data: RecordData;
    onChange: (field: keyof RecordData, value: string) => void;
    userRrn: string;
}

export default function RecordEditor({ data, onChange, userRrn }: RecordEditorProps) {
    const recordRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!recordRef.current) return;

        try {
            const canvas = await html2canvas(recordRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Lab_Record_${data.programNumber || 'Output'}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Check console for details.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative">
            <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <h2 className="text-lg font-bold text-white tracking-widest font-orbitron uppercase">Live Record Preview</h2>
                <Button
                    onClick={handleDownloadPDF}
                    className="bg-electric-blue hover:bg-blue-600 text-white shadow-blue-glow h-10 px-6 font-black uppercase tracking-widest text-[10px]"
                >
                    <Download size={14} className="mr-2" />
                    Download PDF
                </Button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-950 flex justify-center">
                {/* A4 Paper Simulation */}
                <div
                    ref={recordRef}
                    className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 relative p-12 md:p-16 shadow-2xl overflow-hidden shrink-0"
                    style={{ aspectRatio: '210/297' }}
                >
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none overflow-hidden">
                        <div className="origin-center -rotate-45 text-[140px] font-black uppercase tracking-tighter whitespace-nowrap text-slate-950 font-orbitron">
                            {userRrn || 'NO-PROTOCOL-FOUND'}
                        </div>
                    </div>

                    <div className="relative z-10 space-y-8 font-sans">
                        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-8">
                            <input
                                value={data.programNumber}
                                onChange={(e) => onChange('programNumber', e.target.value)}
                                placeholder="Program No: X"
                                className="text-xl font-bold bg-transparent border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded w-48 text-slate-800"
                            />
                            <div className="text-right">
                                <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Protocol ID</div>
                                <div className="font-mono text-xs">{userRrn}</div>
                            </div>
                        </div>

                        <div>
                            <input
                                value={data.programName}
                                onChange={(e) => onChange('programName', e.target.value)}
                                placeholder="Enter Program Name..."
                                className="text-2xl font-black text-slate-900 w-full bg-transparent border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Aim:</h3>
                            <textarea
                                value={data.aim}
                                onChange={(e) => onChange('aim', e.target.value)}
                                placeholder="To write a program that..."
                                className="w-full min-h-[60px] resize-none bg-transparent border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded text-slate-700 leading-relaxed"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Algorithm:</h3>
                            <textarea
                                value={data.algorithm}
                                onChange={(e) => onChange('algorithm', e.target.value)}
                                placeholder="Step 1: Start..."
                                className="w-full min-h-[120px] resize-y bg-transparent border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded text-slate-700 leading-relaxed font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Program Code:</h3>
                            <textarea
                                value={data.programCode}
                                onChange={(e) => onChange('programCode', e.target.value)}
                                placeholder="def main():..."
                                className="w-full min-h-[300px] bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 resize-y whitespace-pre"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Output:</h3>
                            <textarea
                                value={data.output}
                                onChange={(e) => onChange('output', e.target.value)}
                                placeholder="Program Output..."
                                className="w-full min-h-[150px] bg-slate-900 text-green-400 border border-slate-800 rounded-lg p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-electric-blue resize-y whitespace-pre"
                            />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Result:</h3>
                            <textarea
                                value={data.result}
                                onChange={(e) => onChange('result', e.target.value)}
                                placeholder="Thus the program was executed successfully..."
                                className="w-full min-h-[60px] resize-none bg-transparent border-none outline-none focus:bg-slate-50 p-2 -ml-2 rounded text-slate-700 leading-relaxed"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
