import React, { useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Share2, Terminal, Bot, History, ChevronRight } from 'lucide-react';
import ThreeCanvas from './ThreeCanvas';

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    const mouseX = useRef(0);
    const mouseY = useRef(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        mouseX.current = (e.clientX / window.innerWidth - 0.5) * 50;
        mouseY.current = (e.clientY / window.innerHeight - 0.5) * 50;
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="relative min-h-screen w-full bg-[#050505] text-slate-200 overflow-x-hidden font-sans selection:bg-slate-800"
        >
            <Suspense fallback={<div className="fixed inset-0 bg-[#050505]" />}>
                <ThreeCanvas />
            </Suspense>

            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Sharp, minimalist navigation */}
            <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto mix-blend-difference">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <Terminal size={18} className="text-white" />
                    <span className="text-sm font-bold tracking-widest uppercase text-white">Lab_Manager</span>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onLoginClick}
                    className="group flex items-center gap-2 px-6 py-2 border border-white/20 text-white font-bold text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
                >
                    System Access
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </nav>

            <main className="relative z-10 w-full pt-32">
                {/* Hero Section: Honest and Professional */}
                <section className="min-h-[80vh] flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="max-w-3xl"
                    >
                        <motion.div variants={itemVariants} className="inline-block mb-8">
                            <span className="px-3 py-1 border border-slate-700 text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                                Research & Documentation
                            </span>
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-5xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8 text-white"
                        >
                            Organize your <br className="hidden md:block" />
                            <span className="text-slate-500">lab workspace.</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 font-light leading-relaxed mb-12 max-w-xl">
                            A clean, efficient environment for managing lab records, synchronizing files, and generating documentation with AI assistance. Built for researchers and students.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onLoginClick}
                                className="px-8 py-4 bg-white text-black font-bold uppercase tracking-[0.1em] text-xs hover:bg-slate-200 transition-colors"
                            >
                                Open Workspace
                            </button>
                            <a href="#features" className="px-8 py-4 border border-slate-800 text-slate-300 font-bold uppercase tracking-[0.1em] text-xs hover:border-slate-500 transition-colors text-center">
                                View Capabilities
                            </a>
                        </motion.div>
                    </motion.div>
                </section>

                {/* Features Section: Factual capabilities */}
                <section id="features" className="max-w-7xl mx-auto px-6 md:px-12 py-24 border-t border-slate-900">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500 mb-16">Core Modules</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                            {[
                                { 
                                    title: 'Record Management', 
                                    desc: 'Create, organize, and securely store your lab records in a hierarchical folder system with instant search capabilities.', 
                                    icon: FolderOpen 
                                },
                                { 
                                    title: 'AI Documentation', 
                                    desc: 'Automate repetitive write-ups. Generate aims, algorithms, and viva questions instantly using the integrated Lab-Bot assistant.', 
                                    icon: Bot 
                                },
                                { 
                                    title: 'Collaboration', 
                                    desc: 'Share records seamlessly with peers and communicate directly through the built-in messaging interface.', 
                                    icon: Share2 
                                },
                                { 
                                    title: 'Activity Timeline', 
                                    desc: 'Keep track of all your document revisions, uploads, and interactions in a chronological activity feed.', 
                                    icon: History 
                                }
                            ].map((feature, i) => (
                                <div key={i} className="flex flex-col md:flex-row gap-6 group">
                                    <div className="shrink-0 w-12 h-12 flex items-center justify-center border border-slate-800 bg-slate-900/50 group-hover:border-slate-500 transition-colors">
                                        <feature.icon size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-medium text-white mb-3">{feature.title}</h3>
                                        <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                <footer className="px-6 md:px-12 py-12 border-t border-slate-900">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Terminal size={16} className="text-slate-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Lab_Manager v2.0</span>
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">© 2026 Academic Workspace</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
