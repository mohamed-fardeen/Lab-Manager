import { motion } from 'framer-motion';
import { Zap, Shield, Globe, ArrowRight, Activity, Cpu, Database } from 'lucide-react';
import ThreeCanvas from './ThreeCanvas';

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="relative min-h-screen w-full bg-[#020617] text-slate-100 overflow-x-hidden font-sans">
            <ThreeCanvas />

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-electric-blue flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <Zap size={22} className="text-white fill-white" />
                    </div>
                    <span className="text-2xl font-black italic tracking-tighter font-orbitron">LAB-SYNC</span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    {['Infrastructure', 'Protocol', 'Network', 'Intelligence'].map((link) => (
                        <a key={link} href="#" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-electric-blue transition-colors">
                            {link}
                        </a>
                    ))}
                </div>
                <button
                    onClick={onLoginClick}
                    className="px-6 py-2 rounded-full border border-slate-800 hover:border-electric-blue hover:bg-electric-blue/5 transition-all font-bold text-sm tracking-widest uppercase"
                >
                    Initialize
                </button>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-40">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="max-w-4xl"
                >
                    <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-blue/10 border border-electric-blue/20 text-electric-blue text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        <Activity size={12} /> Global synchronization established
                    </motion.div>

                    <motion.h1 variants={item} className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 font-orbitron">
                        SYNCING <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-cyan-400">DISCOVERY</span>,<br />
                        GLOBALLY.
                    </motion.h1>

                    <motion.p variants={item} className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed mb-12">
                        The ultimate collaborative intelligence hub for decentralized laboratories.
                        Archive, analyze, and broadcast your research with cryptographically secure protocols and real-time synchronization.
                    </motion.p>

                    <motion.div variants={item} className="flex flex-col sm:flex-row gap-6">
                        <button
                            onClick={onLoginClick}
                            className="group relative px-8 py-4 bg-electric-blue text-white rounded-2xl font-black uppercase tracking-widest text-sm overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-transform hover:scale-105 active:scale-95"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <span className="relative flex items-center gap-2">
                                Initiate Connection <ArrowRight size={18} />
                            </span>
                        </button>
                        <button className="px-8 py-4 bg-slate-900 border border-slate-800 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all active:scale-95">
                            Protocol Documentation
                        </button>
                    </motion.div>
                </motion.div>

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40"
                >
                    {[
                        { label: 'Network Latency', value: '4ms', icon: Globe },
                        { label: 'Active Researchers', value: '1.2k+', icon: Shield },
                        { label: 'Intelligence Records', value: '85k+', icon: Database },
                    ].map((stat, i) => (
                        <div key={i} className="glass-panel p-8 border-slate-800 group hover:border-electric-blue/50 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <stat.icon className="text-electric-blue" size={24} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{stat.label}</p>
                            <h3 className="text-4xl font-black font-orbitron">{stat.value}</h3>
                        </div>
                    ))}
                </motion.div>
            </main>

            {/* Features Grid */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 py-40 border-t border-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div>
                        <h2 className="text-4xl font-black font-orbitron mb-6 uppercase">Unified<br />Collaboration</h2>
                        <p className="text-slate-500 max-w-md leading-relaxed">
                            Break down laboratory silos. Our proprietary synchronization engine ensures every discovery is instantly available to authorized peers.
                        </p>
                        <div className="mt-12 space-y-6 text-sm font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-4 text-electric-blue">
                                <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" /> Real-time Global Polling
                            </div>
                            <div className="flex items-center gap-4 text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-slate-700" /> Multi-record Serialization
                            </div>
                            <div className="flex items-center gap-4 text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-slate-700" /> Atomic Delta Sync
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-electric-blue/10 blur-3xl rounded-full" />
                        <div className="relative glass-panel aspect-square p-8 border-slate-800 flex flex-col justify-between group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Cpu size={60} className="text-electric-blue opacity-50 mb-auto" />
                            <div>
                                <h4 className="text-xl font-bold mb-2">Edge Computation</h4>
                                <p className="text-sm text-slate-500">Autonomous metadata tagging and predictive analysis for every research capture.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-8 py-20 border-t border-slate-900 bg-black/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 text-slate-600">
                    <div className="flex items-center gap-3">
                        <Zap size={20} />
                        <span className="text-sm font-black uppercase tracking-widest">Lab-Sync System v4.2.0</span>
                    </div>
                    <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest">
                        <a href="#" className="hover:text-white transition-colors">Terminals</a>
                        <a href="#" className="hover:text-white transition-colors">Sec-Protocol</a>
                        <a href="#" className="hover:text-white transition-colors">API-Node</a>
                    </div>
                    <p className="text-[10px]">© 2026 LAB-SYNC ARCHITECTURE. ALL RIGHTS RESERVED.</p>
                </div>
            </footer>
        </div>
    );
}
