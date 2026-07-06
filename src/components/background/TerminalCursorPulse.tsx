import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
} from './shared';

/**
 * TerminalCursorPulse — a handful of large blinking terminal cursors scattered
 * across the canvas. Each cursor periodically emits a "type wave" — a thin
 * horizontal trail of small bars/dots that fade quickly. Reads as terminals
 * being actively typed on.
 */
export default function TerminalCursorPulse() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();
        const detachMouse = attachMouseHandlers(canvas, mouse);

        interface Wave {
            x: number;
            y: number;
            startTime: number;
            length: number;
        }

        interface Cursor {
            x: number;
            y: number;
            blinkPhase: number;       // current offset in the blink cycle
            blinkPeriod: number;       // ms for one full cycle
            visible: boolean;
            waveAt: number;            // last wave emission time
            waveInterval: number;      // ms between waves
            alpha: number;
        }

        const W0 = window.innerWidth;
        const H0 = window.innerHeight;
        const TARGET = 5;

        const cursors: Cursor[] = [];
        const waves: Wave[] = [];

        // Distribute cursors using a sparse grid so they don't clump
        const cols = 3;
        const rows = 2;
        const positions: { x: number, y: number }[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                positions.push({
                    x: W0 * (0.18 + c * 0.32) + (Math.random() - 0.5) * W0 * 0.06,
                    y: H0 * (0.25 + r * 0.5) + (Math.random() - 0.5) * H0 * 0.05,
                });
            }
        }
        // Shuffle and take TARGET
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        for (let i = 0; i < TARGET; i++) {
            const pos = positions[i];
            cursors.push({
                x: pos.x,
                y: pos.y,
                blinkPhase: Math.random() * 1000,
                blinkPeriod: 900 + Math.random() * 600,
                visible: true,
                waveAt: performance.now() + Math.random() * 5000,
                waveInterval: 4000 + Math.random() * 4000,
                alpha: 0.45 + Math.random() * 0.25,
            });
        }

        const handleResize = () => {
            const nw = window.innerWidth;
            const nh = window.innerHeight;
            canvas.width = nw * Math.min(window.devicePixelRatio, 2);
            canvas.height = nh * Math.min(window.devicePixelRatio, 2);
            canvas.style.width = nw + 'px';
            canvas.style.height = nh + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(Math.min(window.devicePixelRatio, 2), Math.min(window.devicePixelRatio, 2));
        };
        window.addEventListener('resize', handleResize);

        let frameId = 0;
        let lastTime = performance.now();

        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const now = performance.now();
            lastTime = now;

            const W = window.innerWidth;
            const H = window.innerHeight;

            ctx.clearRect(0, 0, W, H);

            // Update cursors
            for (const c of cursors) {
                // Cursor near mouse blinks faster
                let blinkRate = 1;
                if (mouse.active) {
                    const dx = c.x - mouse.x;
                    const dy = c.y - mouse.y;
                    if (dx * dx + dy * dy < 250 * 250) {
                        blinkRate = 2.5;
                    }
                }
                c.blinkPhase += 16 * blinkRate; // ~60fps frame
                // Visible for first 60% of cycle, hidden for last 40% — like a terminal cursor
                const cyclePos = c.blinkPhase % c.blinkPeriod;
                c.visible = cyclePos < c.blinkPeriod * 0.6;

                // Emit type wave periodically
                if (now - c.waveAt > c.waveInterval) {
                    waves.push({
                        x: c.x + 4,
                        y: c.y - 5,
                        startTime: now,
                        length: 60 + Math.random() * 80,
                    });
                    c.waveAt = now;
                }
            }

            // Draw type waves first (under cursors)
            ctx.fillStyle = palette.primary;
            for (let i = waves.length - 1; i >= 0; i--) {
                const w = waves[i];
                const age = now - w.startTime;
                const ttl = 900;
                if (age > ttl) {
                    waves.splice(i, 1);
                    continue;
                }
                const fade = 1 - age / ttl;
                // Render as a sequence of short bars and dots fading out
                const segs = 8;
                for (let s = 0; s < segs; s++) {
                    const t = s / segs;
                    const sx = w.x + t * w.length;
                    // Sparse — not every segment is filled
                    if ((s + Math.floor(w.startTime / 200)) % 3 === 0) continue;
                    const segAlpha = fade * (1 - t) * 0.6;
                    const segW = 2 + Math.random() * 1;
                    const segH = 1 + Math.random() * 1.5;
                    ctx.globalAlpha = segAlpha;
                    ctx.fillRect(sx, w.y - segH / 2, segW, segH);
                }
            }

            // Draw cursors
            const cursorH = 18;
            const cursorW = 9;
            for (const c of cursors) {
                if (!c.visible) continue;
                ctx.fillStyle = palette.primary;
                ctx.globalAlpha = c.alpha;
                ctx.fillRect(c.x - cursorW / 2, c.y - cursorH / 2, cursorW, cursorH);
            }

            ctx.globalAlpha = 1;
        };
        tick();

        return () => {
            cancelAnimationFrame(frameId);
            detachMouse();
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            aria-hidden="true"
        />
    );
}