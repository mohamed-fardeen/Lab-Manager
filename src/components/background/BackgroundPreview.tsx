import React from 'react';
import type { BackgroundMode } from '../../context/BackgroundContext';

/**
 * BackgroundPreview — small animated miniature for the admin picker grid.
 *
 * Each preview is a pure CSS miniature that suggests the motion of its
 * corresponding animation. They're cheap (no canvas), animated via CSS
 * keyframes, and respect the current theme palette.
 */
export default function BackgroundPreview({ mode, active }: { mode: BackgroundMode; active: boolean }) {
    const baseBg = 'bg-[#0F0F0F] dark:bg-[#0F0F0F]';
    // We force dark background for the previews so the colored elements
    // (which use opacity) are visible regardless of theme.

    switch (mode) {
        case 'token-drift':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    {[
                        { c: 'bg-[#1E40AF]', w: 'w-3', top: 'top-[15%]', dur: '6s', delay: '0s' },
                        { c: 'bg-[#C99A3B]', w: 'w-5', top: 'top-[35%]', dur: '7s', delay: '-1.5s' },
                        { c: 'bg-[#00E5B0]', w: 'w-2', top: 'top-[55%]', dur: '5s', delay: '-3s' },
                        { c: 'bg-[#1E40AF]', w: 'w-4', top: 'top-[75%]', dur: '8s', delay: '-2s' },
                        { c: 'bg-[#C99A3B]', w: 'w-2', top: 'top-[25%]', dur: '6.5s', delay: '-4s' },
                        { c: 'bg-[#9CA3AF]', w: 'w-3', top: 'top-[65%]', dur: '7.5s', delay: '-1s' },
                    ].map((t, i) => (
                        <div
                            key={i}
                            className={`absolute h-[2px] ${t.c} ${t.w} ${t.top} ${active ? 'opacity-70' : 'opacity-40'}`}
                            style={{
                                animation: `tokenDrift ${t.dur} linear infinite`,
                                animationDelay: t.delay,
                            }}
                        />
                    ))}
                </div>
            );

        case 'ascii-field':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    {['{', ';', '=>', 'λ', '(', '}', '#', '/', '&&', '::', '<', '|'].map((g, i) => (
                        <span
                            key={i}
                            className="absolute text-[9px] font-mono text-[#9CA3AF]"
                            style={{
                                left: `${10 + (i * 37) % 85}%`,
                                top: `${12 + (i * 23) % 75}%`,
                                opacity: active ? 0.7 : 0.35,
                                animation: `asciiFloat ${5 + (i % 4)}s ease-in-out infinite alternate`,
                                animationDelay: `${-i * 0.4}s`,
                            }}
                        >
                            {g}
                        </span>
                    ))}
                </div>
            );

        case 'pixel-grid':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden grid grid-cols-12 gap-[2px] p-[6px]`}>
                    {Array.from({ length: 48 }).map((_, i) => {
                        // Pseudo-random "lit" cells — visually similar to value noise
                        const lit = ((i * 73 + 11) % 97) < 38;
                        const intensity = lit ? (((i * 31 + 7) % 100) / 100) : 0;
                        return (
                            <div
                                key={i}
                                className="rounded-[1px]"
                                style={{
                                    backgroundColor: intensity > 0.5 ? '#C99A3B' : '#00E5B0',
                                    opacity: active ? intensity * 0.85 : intensity * 0.5,
                                    animation: lit ? `pulse ${2 + (i % 5) * 0.6}s ease-in-out infinite` : undefined,
                                    animationDelay: `${-i * 0.15}s`,
                                }}
                            />
                        );
                    })}
                </div>
            );

        case 'indentation-wave':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="absolute left-0 right-0 h-[1px] bg-[#00E5B0]/50"
                            style={{
                                top: `${14 + i * 12}%`,
                                left: `${6 + (i % 3) * 4}%`,
                                right: `${30 - (i % 4) * 8}%`,
                                opacity: active ? 0.5 : 0.25,
                            }}
                        >
                            <div
                                className="absolute -top-[3px] h-[7px] w-[2px] bg-[#00E5B0]"
                                style={{
                                    animation: `indentCursor ${3 + (i % 3)}s linear infinite`,
                                    animationDelay: `${-i * 0.5}s`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            );

        case 'lambda-drift':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    {['λ', '→', '∀', 'Σ', '∘', '⊃'].map((g, i) => (
                        <span
                            key={i}
                            className="absolute text-base font-serif text-[#00E5B0]"
                            style={{
                                left: `${15 + (i * 47) % 75}%`,
                                top: `${20 + (i * 31) % 65}%`,
                                opacity: active ? 0.75 : 0.4,
                                animation: `lambdaFloat ${6 + i * 0.5}s ease-in-out infinite alternate`,
                                animationDelay: `${-i * 0.7}s`,
                            }}
                        >
                            {g}
                        </span>
                    ))}
                    {/* An arc suggesting reduction */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 56" preserveAspectRatio="none">
                        <path
                            d="M 20 30 Q 50 10 80 30"
                            fill="none"
                            stroke="#C99A3B"
                            strokeWidth="1"
                            strokeDasharray="60 200"
                            style={{
                                animation: 'arcDraw 4s linear infinite',
                            }}
                        />
                    </svg>
                </div>
            );

        case 'recursive-tree':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 56" preserveAspectRatio="none">
                        {/* Root on left, branches going right */}
                        <g stroke="#00E5B0" strokeWidth="0.6" fill="none" opacity={active ? 0.6 : 0.35}>
                            <path d="M 12 28 L 30 14" />
                            <path d="M 12 28 L 30 42" />
                            <path d="M 30 14 L 50 8" />
                            <path d="M 30 14 L 50 22" />
                            <path d="M 30 42 L 50 36" />
                            <path d="M 30 42 L 50 50" />
                            <path d="M 50 8 L 70 4" />
                            <path d="M 50 22 L 70 18" />
                            <path d="M 50 22 L 70 28" />
                            <path d="M 50 36 L 70 34" />
                            <path d="M 50 36 L 70 44" />
                            <path d="M 50 50 L 70 52" />
                        </g>
                        <g fill="#00E5B0" opacity={active ? 0.9 : 0.5}>
                            {[
                                [12, 28], [30, 14], [30, 42], [50, 8], [50, 22],
                                [50, 36], [50, 50], [70, 4], [70, 18], [70, 28],
                                [70, 34], [70, 44], [70, 52],
                            ].map(([cx, cy], i) => (
                                <circle
                                    key={i}
                                    cx={cx}
                                    cy={cy}
                                    r="1.3"
                                    style={{
                                        animation: i === 8 ? 'pulse 1.4s ease-out infinite' : undefined,
                                    }}
                                />
                            ))}
                        </g>
                    </svg>
                </div>
            );

        case 'terminal-pulse':
            return (
                <div className={`relative w-full aspect-video rounded border border-[#2E2E2E] ${baseBg} overflow-hidden`}>
                    {[
                        { left: '15%', top: '25%', dur: '1.2s' },
                        { left: '52%', top: '18%', dur: '1.4s', delay: '0.3s' },
                        { left: '28%', top: '65%', dur: '1.1s', delay: '0.6s' },
                        { left: '72%', top: '58%', dur: '1.3s', delay: '0.2s' },
                    ].map((c, i) => (
                        <React.Fragment key={i}>
                            <div
                                className="absolute w-[5px] h-[10px] bg-[#00E5B0]"
                                style={{
                                    left: c.left,
                                    top: c.top,
                                    animation: `blink ${c.dur} steps(2) infinite`,
                                    animationDelay: c.delay,
                                }}
                            />
                            {/* Type wave trail */}
                            <div
                                className="absolute h-[1px]"
                                style={{
                                    left: c.left,
                                    top: `calc(${c.top} + 4px)`,
                                    width: '24px',
                                    background: 'linear-gradient(to right, transparent, #00E5B0)',
                                    opacity: 0.6,
                                    animation: `waveTrail 2.5s ease-out infinite`,
                                    animationDelay: c.delay,
                                }}
                            />
                        </React.Fragment>
                    ))}
                </div>
            );
    }
}