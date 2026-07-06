import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
    ease,
} from './shared';

/**
 * CodeTokenDrift — colored syntax-highlight tokens drift across the canvas.
 *
 * Reads like the output of a compiler's lexer: short colored fragments — the
 * same colors an editor would assign to keywords, strings, numbers, comments.
 * Each token has its own slow drift, and the cursor gently attracts nearby ones
 * (as if the lexer is "looking at" them).
 */
export default function CodeTokenDrift() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();

        // Syntax-highlight-inspired palette. The cobalt / amber / mint are the
        // brand tokens; the neutrals mimic comments and plain identifiers.
        const isDark = document.documentElement.classList.contains('dark');
        const tokenColors = isDark
            ? ['#00E5B0', '#C99A3B', '#9CA3AF', '#E5E7EB', '#FBBF24']
            : ['#1E40AF', '#C99A3B', '#6B7280', '#1E1714', '#1E40AF'];

        interface Token {
            x: number;
            y: number;
            vx: number;
            vy: number;
            w: number;
            h: number;
            color: string;
            brightness: number;
        }

        const tokens: Token[] = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        const targetCount = Math.floor((w * h) / 28000); // density scales with viewport

        for (let i = 0; i < targetCount; i++) {
            const tw = 8 + Math.random() * 28; // short horizontal fragments
            tokens.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.1,
                w: tw,
                h: 2 + Math.random() * 2.5,
                color: tokenColors[Math.floor(Math.random() * tokenColors.length)],
                brightness: 0.25 + Math.random() * 0.45,
            });
        }

        // Mouse position smoothed for soft attraction
        const smoothMouse = { x: w / 2, y: h / 2 };
        const detachMouse = attachMouseHandlers(canvas, mouse);

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
            const dt = Math.min(50, now - lastTime) / 16.667; // normalize to 60fps frames
            lastTime = now;

            // Trail fade — keeps a faint ghost of where tokens have been
            ctx.fillStyle = palette.backgroundFade;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            // Smooth mouse position
            smoothMouse.x = ease(smoothMouse.x, mouse.x === -9999 ? smoothMouse.x : mouse.x, 0.06);
            smoothMouse.y = ease(smoothMouse.y, mouse.y === -9999 ? smoothMouse.y : mouse.y, 0.06);

            for (const t of tokens) {
                // Mouse attraction (only when cursor is on screen)
                if (mouse.active) {
                    const dx = smoothMouse.x - t.x;
                    const dy = smoothMouse.y - t.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < 40000 && dist2 > 100) {
                        const dist = Math.sqrt(dist2);
                        const force = 0.012;
                        t.vx += (dx / dist) * force;
                        t.vy += (dy / dist) * force;
                    }
                }

                // Damping + drift
                t.vx *= 0.985;
                t.vy *= 0.985;
                t.x += t.vx * dt;
                t.y += t.vy * dt;

                // Wrap around viewport
                if (t.x < -50) t.x = window.innerWidth + 50;
                if (t.x > window.innerWidth + 50) t.x = -50;
                if (t.y < -20) t.y = window.innerHeight + 20;
                if (t.y > window.innerHeight + 20) t.y = -20;

                // Draw
                ctx.fillStyle = t.color;
                ctx.globalAlpha = t.brightness;
                ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
            }

            ctx.globalAlpha = 1;
        };
        tick();

        return () => {
            cancelAnimationFrame(frameId);
            detachMouse();
            window.removeEventListener('resize', handleResize);
        };
        // palette is read once at mount — colors are stable for the lifetime of this mount
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