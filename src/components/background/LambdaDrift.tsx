import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
} from './shared';

/**
 * LambdaDrift — programming/CS symbols drift slowly. Periodically two symbols
 * draw a soft arc between them as if "reducing" — a tiny visual of lambda
 * calculus or type inference. After the arc, one fades out and a new one
 * drifts in to take its place.
 */
export default function LambdaDrift() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();
        const detachMouse = attachMouseHandlers(canvas, mouse);

        // Small, restrained symbol set — too many would feel busy
        const SYMBOLS = ['λ', '→', '∀', '∃', 'Σ', 'π', '∘', '⊃', '∈', '::', '≡', '⟨', '⟩'];

        interface Symbol {
            x: number;
            y: number;
            vx: number;
            vy: number;
            glyph: string;
            size: number;
            alpha: number;
            reduction: number; // 0..1 progress of an active reduction arc
            reducingWith: number | null;
            spawnAt: number; // when this symbol was born (for fade-in)
        }

        const W0 = window.innerWidth;
        const H0 = window.innerHeight;
        const TARGET = 10;

        const symbols: Symbol[] = [];
        for (let i = 0; i < TARGET; i++) {
            symbols.push({
                x: Math.random() * W0,
                y: Math.random() * H0,
                vx: (Math.random() - 0.5) * 0.18,
                vy: (Math.random() - 0.5) * 0.18,
                glyph: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                size: 22 + Math.floor(Math.random() * 8),
                alpha: 0.3 + Math.random() * 0.3,
                reduction: 0,
                reducingWith: null,
                spawnAt: performance.now(),
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
        let lastReductionCheck = 0;

        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = Math.min(50, now - lastTime) / 16.667;
            lastTime = now;

            const W = window.innerWidth;
            const H = window.innerHeight;

            ctx.clearRect(0, 0, W, H);

            // Pick a random pair to reduce every ~2s
            if (now - lastReductionCheck > 2200 && symbols.length >= 2) {
                lastReductionCheck = now;
                const a = Math.floor(Math.random() * symbols.length);
                let b = Math.floor(Math.random() * symbols.length);
                if (b === a) b = (b + 1) % symbols.length;
                // Only start a reduction if neither is already reducing
                if (symbols[a].reducingWith === null && symbols[b].reducingWith === null) {
                    symbols[a].reducingWith = b;
                    symbols[b].reducingWith = a;
                    symbols[a].reduction = 0.001;
                    symbols[b].reduction = 0.001;
                }
            }

            // Update positions + reductions
            for (const s of symbols) {
                if (s.reducingWith === null) {
                    // Slow drift
                    s.x += s.vx * dt;
                    s.y += s.vy * dt;
                    // Mouse repulsion (gentle)
                    if (mouse.active) {
                        const dx = s.x - mouse.x;
                        const dy = s.y - mouse.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < 200 * 200 && d2 > 1) {
                            const d = Math.sqrt(d2);
                            const f = (1 - d / 200) * 0.05;
                            s.vx += (dx / d) * f;
                            s.vy += (dy / d) * f;
                        }
                    }
                    s.vx *= 0.99;
                    s.vy *= 0.99;
                    // Wrap
                    if (s.x < -40) s.x = W + 40;
                    if (s.x > W + 40) s.x = -40;
                    if (s.y < -40) s.y = H + 40;
                    if (s.y > H + 40) s.y = -40;
                } else {
                    // Move toward the paired symbol
                    const other = symbols[s.reducingWith];
                    if (other) {
                        const dx = other.x - s.x;
                        const dy = other.y - s.y;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        s.x += (dx / d) * 1.5 * dt;
                        s.y += (dy / d) * 1.5 * dt;
                    }
                    s.reduction += 0.005 * dt;
                    // Once reduction completes, one symbol fades and a new one spawns
                    if (s.reduction >= 1) {
                        // Only one of the pair should respawn — use the partner's reduction
                        // to gate this. We use the lower-indexed symbol as the "winner".
                        // Both check: if partner index is lower, this one is removed.
                        const partner = symbols[s.reducingWith];
                        if (partner && partner.reducingWith !== null) {
                            // Mark partner's reduction with a sentinel to indicate resolution
                            partner.reducingWith = null;
                            s.reducingWith = null;
                            // Respawn this symbol far from the partner
                            const newX = (partner.x + W / 2 + (Math.random() - 0.5) * W * 0.6) % W;
                            const newY = (partner.y + H / 2 + (Math.random() - 0.5) * H * 0.6) % H;
                            s.x = newX;
                            s.y = newY;
                            s.glyph = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                            s.alpha = 0.05; // fade in
                            s.reduction = 0;
                            s.spawnAt = now;
                            s.vx = (Math.random() - 0.5) * 0.18;
                            s.vy = (Math.random() - 0.5) * 0.18;
                        }
                    }
                }

                // Fade-in on spawn
                const age = now - s.spawnAt;
                if (age < 1200) {
                    s.alpha = Math.min(0.55, 0.05 + (age / 1200) * 0.55);
                }
            }

            // Draw reduction arcs first (under symbols)
            ctx.lineWidth = 1.5;
            for (let i = 0; i < symbols.length; i++) {
                const s = symbols[i];
                if (s.reducingWith !== null && s.reducingWith > i) {
                    const other = symbols[s.reducingWith];
                    const t = s.reduction;
                    // Arc midpoint offset by perpendicular distance
                    const mx = (s.x + other.x) / 2;
                    const my = (s.y + other.y) / 2;
                    const dx = other.x - s.x;
                    const dy = other.y - s.y;
                    const perpX = -dy * 0.3;
                    const perpY = dx * 0.3;
                    const cx = mx + perpX;
                    const cy = my + perpY;

                    ctx.strokeStyle = palette.accent;
                    ctx.globalAlpha = (1 - Math.abs(t - 0.5) * 2) * 0.5; // peaks at t=0.5
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.quadraticCurveTo(cx, cy, other.x, other.y);
                    ctx.stroke();

                    // Small arrowhead at midpoint suggesting "→"
                    const arrowSize = 5;
                    const angle = Math.atan2(other.y - cy, other.x - cx);
                    ctx.fillStyle = palette.accent;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * arrowSize, cy + Math.sin(angle) * arrowSize);
                    ctx.lineTo(cx + Math.cos(angle + 2.7) * arrowSize, cy + Math.sin(angle + 2.7) * arrowSize);
                    ctx.lineTo(cx + Math.cos(angle - 2.7) * arrowSize, cy + Math.sin(angle - 2.7) * arrowSize);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Draw symbols
            ctx.font = '400 ' + 28 + 'px "Fraunces", "Times New Roman", serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            for (const s of symbols) {
                ctx.fillStyle = palette.primary;
                ctx.globalAlpha = s.alpha;
                ctx.fillText(s.glyph, s.x, s.y);
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