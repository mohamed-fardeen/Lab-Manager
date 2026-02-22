import React, { useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Database, Cpu, Monitor, Server, Terminal, ShieldCheck, Activity, Network } from 'lucide-react';
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
        hidden: { opacity: 0, y: 30, scale: 1 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="relative min-h-screen w-full bg-[#020617] text-slate-100 overflow-x-hidden font-sans selection:bg-electric-blue/30"
        >
            <Suspense fallback={<div className="fixed inset-0 bg-[#020617]" />}>
                <ThreeCanvas />
            </Suspense>

            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Sticky/Fixed Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-12 py-8 max-w-7xl mx-auto backdrop-blur-md bg-[#020617]/20">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-xl bg-electric-blue/20 border border-electric-blue/40 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <Terminal size={20} className="text-electric-blue" />
                    </div>
                    <span className="text-xl font-black tracking-widest font-orbitron bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">TERMINAL_SYNC</span>
                </motion.div>

                <div className="hidden lg:flex items-center gap-16">
                    {['Mainframe', 'Inventory', 'Protocol', 'Analytics'].map((link, i) => (
                        <motion.a
                            key={link}
                            href="#"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-white transition-all relative group"
                        >
                            {link}
                            <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-electric-blue transition-all group-hover:w-full" />
                        </motion.a>
                    ))}
                </div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onLoginClick}
                    className="px-8 py-3 rounded-xl bg-electric-blue text-white font-black text-[9px] tracking-[0.3em] uppercase shadow-lg hover:shadow-blue-glow transition-all"
                >
                    System Entry
                </motion.button>
            </nav>

            <main className="relative z-10 w-full">
                {/* Hero Section: Properly Centered and Visible */}
                <section className="min-h-screen flex flex-col items-center justify-center text-center px-12">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="max-w-4xl"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-electric-blue/5 border border-electric-blue/30 text-electric-blue text-[10px] font-black uppercase tracking-[0.4em] mb-12 backdrop-blur-3xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
                            Command Protocol Active // Node_04
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.85] mb-14 font-orbitron text-white"
                        >
                            <span className="block opacity-40">CONTROL</span>
                            <span className="block italic text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 pb-2">THE LAB.</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-400 max-w-2xl font-light leading-relaxed mb-16 mx-auto">
                            The unified OS for advanced computer laboratories.
                            Synchronize hardware nodes and monitor real-time throughput.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                            <button
                                onClick={onLoginClick}
                                className="group relative px-14 py-6 bg-electric-blue text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                                <span className="relative flex items-center gap-4">
                                    Establish Link <Zap size={18} />
                                </span>
                            </button>
                            <button className="px-14 py-6 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
                                Resource Map
                            </button>
                        </motion.div>
                    </motion.div>
                </section>

                {/* Features Section */}
                <section className="max-w-7xl mx-auto px-12 py-32">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-12"
                    >
                        {[
                            { title: 'Core Ops', desc: 'Centralized CPU and memory orchestration.', icon: Cpu, color: 'text-blue-400' },
                            { title: 'Fleet Sync', desc: 'Synchronized terminal deployment.', icon: Monitor, color: 'text-cyan-400' },
                            { title: 'Data Vault', desc: 'Security protocol archival.', icon: Database, color: 'text-white' },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className="p-12 rounded-3xl bg-slate-900/10 border border-slate-800/50 hover:border-electric-blue/40 transition-all duration-500 text-left backdrop-blur-sm"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center mb-8 border border-white/5 ${feature.color}`}>
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold font-orbitron mb-4 tracking-widest uppercase">{feature.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* Architecture Section */}
                <section className="px-12 py-48 bg-slate-950/20 backdrop-blur-3xl border-y border-white/5">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <span className="text-electric-blue font-black uppercase tracking-[0.6em] text-[10px]">Infrastructure</span>
                                <h2 className="text-6xl font-black font-orbitron uppercase text-white leading-tight">Digital<br />Mainframe</h2>
                            </div>
                            <div className="space-y-10">
                                {[
                                    { title: 'Network Topology', text: 'Visualized signal strength monitoring.', icon: Network },
                                    { title: 'Security Protocol', text: 'Hardware-level authentication.', icon: ShieldCheck },
                                    { title: 'Uptime Metrics', text: 'Real-time telemetry reports.', icon: Activity }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-8 group">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-electric-blue/40 transition-all">
                                            <item.icon size={20} className="text-slate-500 group-hover:text-electric-blue" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white uppercase tracking-widest">{item.title}</h4>
                                            <p className="text-slate-500 text-sm">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative aspect-square glass-panel rounded-[3rem] flex items-center justify-center p-20 border-white/10">
                            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                                <Server size={220} className="text-electric-blue opacity-80" strokeWidth={0.5} />
                            </motion.div>
                        </div>
                    </div>
                </section>

                <footer className="px-12 py-24 text-center border-t border-white/5 bg-black/40">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex items-center gap-4">
                            <Terminal size={20} className="text-slate-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Protocol v1.0.4</span>
                        </div>
                        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">© 2026 Virtual Lab Environments</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
