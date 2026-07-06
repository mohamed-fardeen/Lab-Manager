import React, { useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Share2, Terminal, Bot, History, ChevronRight, Code2, Cpu, Sparkles, GitBranch, Clock, Search, FileCode2 } from 'lucide-react';
import BackgroundAnimation from './background/BackgroundAnimation';

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
                staggerChildren: 0.12,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as any }
        }
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="relative min-h-screen w-full app-bg overflow-x-hidden font-sans selection:bg-primary/25"
        >
            <Suspense fallback={<div className="fixed inset-0 app-bg" />}>
                <BackgroundAnimation />
            </Suspense>

            {/* Faint paper noise overlay for editorial texture */}
            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.025] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }}
                    className="flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-md border border-border bg-surface flex items-center justify-center">
                        <Terminal size={14} className="text-foreground" />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-rule">Lab Workstation</span>
                        <span className="text-sm font-display font-semibold tracking-tight text-foreground">Lab-Sync</span>
                    </div>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }}
                    onClick={onLoginClick}
                    className="group flex items-center gap-2 px-6 py-2.5 bg-foreground text-background font-medium text-xs tracking-wide hover:bg-primary hover:text-primary-foreground transition-all duration-400 border border-foreground hover:border-primary"
                >
                    Sign in
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </motion.button>
            </nav>

            <main className="relative z-10 w-full pt-32">
                {/* ── HERO ── */}
                <section className="min-h-[80vh] flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="max-w-3xl"
                    >
                        <motion.div variants={itemVariants}>
                            <span className="eyebrow">Cloud · For Engineering Labs</span>
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="mt-8 text-6xl md:text-[9rem] font-display font-medium tracking-[-0.035em] leading-[0.88] mb-10 text-foreground"
                        >
                            Every lab<br />
                            <em className="not-italic font-display italic font-normal text-primary">program</em><br />
                            <span className="text-muted-foreground/60">in one place.</span>
                        </motion.h1>

                        <motion.div variants={itemVariants} className="ink-rule mb-10" />

                        <motion.p variants={itemVariants} className="text-lg md:text-xl text-foreground-muted leading-relaxed mb-12 max-w-xl font-light">
                            Save code from every lab session, generate the record PDF automatically, and share with classmates — built for engineering students who don't want to lose their work to a crashed laptop.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-start">
                            <button
                                onClick={onLoginClick}
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-medium tracking-wide hover:bg-foreground hover:text-background transition-all duration-400 border border-primary hover:border-foreground"
                            >
                                <Terminal size={16} />
                                <span className="text-sm">Open the workspace</span>
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                            </button>
                            <a
                                href="#features"
                                className="inline-flex items-center gap-3 px-6 py-4 text-foreground-muted font-medium tracking-wide hover:text-foreground transition-colors text-sm"
                            >
                                <span>See how it works</span>
                                <span className="font-mono text-xs">↓</span>
                            </a>
                        </motion.div>

                        {/* Inline stack strip — honest about what runs underneath */}
                        <motion.div
                            variants={itemVariants}
                            className="mt-16 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground"
                        >
                            <span className="text-rule">Stack</span>
                            <span className="text-foreground/80">React</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-foreground/80">Supabase</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-foreground/80">Groq LLMs</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-foreground/80">.py .c .java .js</span>
                        </motion.div>
                    </motion.div>
                </section>

                {/* ── FEATURES ── */}
                <section id="features" className="relative max-w-7xl mx-auto px-6 md:px-12 py-24">
                    <div className="absolute inset-0 bg-grid-paper-fine opacity-60 pointer-events-none" />
                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, y: 32 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as any }}
                        >
                            <div className="flex items-end justify-between mb-16">
                                <div>
                                    <span className="eyebrow">What it does</span>
                                    <h2 className="mt-4 text-4xl md:text-6xl font-display font-medium tracking-tight text-foreground max-w-2xl">
                                        Four jobs. One workspace.
                                    </h2>
                                </div>
                                <span className="font-mono text-xs text-muted-foreground hidden md:block">№ 01 — 04</span>
                            </div>

                            <div className="ink-rule mb-12" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    {
                                        title: 'Program Vault',
                                        catalogue: '№ 01',
                                        desc: 'Store every lab program in a folder tree by subject and experiment. Python, C, Java, JS — all searchable across every file you have ever written.',
                                        icon: FolderOpen
                                    },
                                    {
                                        title: 'Record Generator',
                                        catalogue: '№ 02',
                                        desc: 'Paste your program, get the lab record PDF — aim, algorithm, code, output, viva questions. Skip the 3 AM formatting session before submission.',
                                        icon: FileCode2
                                    },
                                    {
                                        title: 'Peer Sharing',
                                        catalogue: '№ 03',
                                        desc: 'Share programs with classmates in one click. Built-in messaging so you can ask "why does this segfault" without leaving the workspace.',
                                        icon: Share2
                                    },
                                    {
                                        title: 'Revision Trail',
                                        catalogue: '№ 04',
                                        desc: 'Every upload, edit, and share is timestamped. Find the version you submitted last Friday, not the one you overwrote this morning.',
                                        icon: GitBranch
                                    }
                                ].map((feature) => (
                                    <div key={feature.title} className="specimen-card group">
                                        <div className="flex items-start gap-5">
                                            <div className="shrink-0 w-12 h-12 flex items-center justify-center border border-border bg-surface-raised group-hover:border-primary/40 transition-colors duration-500">
                                                <feature.icon size={20} className="text-foreground-muted group-hover:text-primary transition-colors duration-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-baseline justify-between gap-4 mb-3">
                                                    <h3 className="text-xl font-display font-medium text-foreground">{feature.title}</h3>
                                                    <span className="font-mono text-[10px] uppercase tracking-widest text-rule shrink-0">{feature.catalogue}</span>
                                                </div>
                                                <p className="text-foreground-muted leading-relaxed text-sm">{feature.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ── WORKFLOW STRIP ── */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 py-24">
                    <div className="ink-rule-thick mb-16" />
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as any }}
                    >
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <span className="eyebrow">Workflow</span>
                                <h2 className="mt-3 text-3xl md:text-4xl font-display font-medium tracking-tight text-foreground">
                                    From editor to submission.
                                </h2>
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden md:block">№ W01 — W03</span>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as any }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-12"
                    >
                        {[
                            { icon: Code2, label: 'Write', note: 'Save Python, C, Java, JS programs as you finish each lab. Versioned automatically.' },
                            { icon: Cpu, label: 'Generate', note: 'Turn any program into a record PDF — aim, algorithm, code, output, viva — in one click.' },
                            { icon: Share2, label: 'Share', note: 'Send programs to classmates or staff. Keep the conversation in the same workspace.' }
                        ].map((step, i) => (
                            <div key={step.label} className="relative pl-6 border-l border-border">
                                <span className="absolute -left-[5px] top-0 w-2 h-2 bg-rule rounded-full" />
                                <div className="flex items-center gap-3 mb-3">
                                    <step.icon size={16} className="text-primary" />
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{`0${i + 1}`}</span>
                                </div>
                                <h3 className="font-display text-2xl font-medium mb-2">{step.label}</h3>
                                <p className="text-sm text-foreground-muted leading-relaxed">{step.note}</p>
                            </div>
                        ))}
                    </motion.div>
                </section>

                {/* ── FOOTER ── */}
                <footer className="px-6 md:px-12 py-12 mt-12">
                    <div className="ink-rule mb-10" />
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Terminal size={14} className="text-muted-foreground/60" />
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Lab-Sync · v2.4</span>
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">© 2026 — Built for students who lose their USB drives.</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}