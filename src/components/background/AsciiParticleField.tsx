import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
} from './shared';

/**
 * AsciiParticleField — monospace code punctuation as soft particles with
 * physics. Cursor pushes them away; they re-settle after it leaves.
 *
 * The glyphs are drawn from a curated set of real programming punctuation:
 * brackets, semicolons, arrows. They never form readable code — just texture.
 */
export default function AsciiParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();

        // Curated glyph set — real programming punctuation, not random letters.
        const GLYPHS = ['{', '}', '(', ')', '[', ']', ';', ':', '=', '+', '-', '*', '/', '<', '>', '&', '|', '!', '?', '#', '$', '%', '@', 'λ', '→'];

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            glyph: string;
            size: number;
            alpha: number;
        }

        const w = window.innerWidth;
        const h = window.innerHeight;
        const targetCount = Math.floor((w * h) / 14000); // denser than tokens

        const particles: Particle[] = [];
        for (let i = 0; i < targetCount; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
                size: 11 + Math.floor(Math.random() * 6),
                alpha: 0.18 + Math.random() * 0.4,
            });
        }

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
            const dt = Math.min(50, now - lastTime) / 16.667;
            lastTime = now;

            // Light trail fade for soft persistence
            ctx.fillStyle = palette.backgroundFade;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            ctx.font = '500 ' + 12 + 'px "JetBrains Mono", "Menlo", monospace';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            const W = window.innerWidth;
            const H = window.innerHeight;
            const mouseR = 130; // repulsion radius

            for (const p of particles) {
                // Mouse repulsion
                if (mouse.active) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < mouseR * mouseR && d2 > 1) {
                        const d = Math.sqrt(d2);
                        const f = (1 - d / mouseR) * 0.9;
                        p.vx += (dx / d) * f;
                        p.vy += (dy / d) * f;
                    }
                }

                // Gentle mutual repulsion — cheap O(n²) but n is bounded by viewport density
                // Skip every other particle to halve cost; visually identical.
                // (Intentionally not implemented to keep the code readable — modern devices
                // handle 200-300 particles fine at 60fps.)

                // Damping
                p.vx *= 0.94;
                p.vy *= 0.94;

                // Add a tiny random impulse so the field never settles completely
                p.vx += (Math.random() - 0.5) * 0.02;
                p.vy += (Math.random() - 0.5) * 0.02;

                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Wrap
                if (p.x < -20) p.x = W + 20;
                if (p.x > W + 20) p.x = -20;
                if (p.y < -20) p.y = H + 20;
                if (p.y > H + 20) p.y = -20;

                // Draw
                ctx.fillStyle = palette.secondary;
                ctx.globalAlpha = p.alpha;
                ctx.fillText(p.glyph, p.x, p.y);
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