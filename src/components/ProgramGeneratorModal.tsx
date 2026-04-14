import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Zap, Loader2 } from 'lucide-react';

interface ProgramGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: any) => void;
    isGenerating: boolean;
}

export default function ProgramGeneratorModal({ isOpen, onClose, onGenerate, isGenerating }: ProgramGeneratorModalProps) {
    const [formData, setFormData] = useState({
        programName: '',
        programNumber: '',
        date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
        language: 'Python',
        inputType: 'User Input',
        algorithmType: 'Simple Steps',
        constraints: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#020617] border-slate-800 p-0 overflow-hidden rounded-3xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-8 space-y-6">
                        <DialogHeader className="space-y-2 text-center">
                            <div className="mx-auto w-12 h-12 rounded-xl bg-electric-blue flex items-center justify-center shadow-blue-glow mb-2">
                                <Zap size={24} className="text-white fill-white" />
                            </div>
                            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase font-orbitron text-white">
                                AI Record Generator
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                                Configure Lab Intelligence Parameters
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Program Name / Title</label>
                                <input
                                    required
                                    name="programName"
                                    value={formData.programName}
                                    onChange={handleChange}
                                    placeholder="e.g. Binary Search Implementation"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Program No.</label>
                                <input
                                    name="programNumber"
                                    value={formData.programNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. 01"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Date</label>
                                <input
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    placeholder="DD/MM/YYYY"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Language</label>
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all font-medium appearance-none"
                                >
                                    <option>Python</option>
                                    <option>C</option>
                                    <option>C++</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Algorithm Type</label>
                                <select
                                    name="algorithmType"
                                    value={formData.algorithmType}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all font-medium appearance-none"
                                >
                                    <option>Simple Steps</option>
                                    <option>Pseudocode</option>
                                </select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Input Type</label>
                                <select
                                    name="inputType"
                                    value={formData.inputType}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all font-medium appearance-none"
                                >
                                    <option>User Input (Dynamic)</option>
                                    <option>Fixed Input (Pre-defined)</option>
                                </select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Additional Constraints (Optional)</label>
                                <textarea
                                    name="constraints"
                                    value={formData.constraints}
                                    onChange={handleChange}
                                    placeholder="e.g. Use recursion, Time complexity O(log n)..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 focus:ring-1 focus:ring-electric-blue outline-none transition-all placeholder:text-slate-700 font-medium min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isGenerating} 
                            className="w-full h-14 bg-electric-blue text-white font-black uppercase tracking-widest hover:bg-white hover:text-electric-blue transition-all rounded-2xl mt-4 border-none shadow-blue-glow disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sequencing Intelligence...</>
                            ) : (
                                'Generate Academic Record'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
