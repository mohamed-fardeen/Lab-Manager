import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
    valueNoise,
} from './shared';

/**
 * PixelGridPulse — a low-resolution grid of small cells. Most cells are dim;
 * clusters occasionally light up via a value-noise field, creating slow
 * organic waves across the grid. Like watching memory bus activity.
 *
 * Cursor injects energy into nearby cells, making them glow.
 */
export default function PixelGridPulse() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();
        const detachMouse = attachMouseHandlers(canvas, mouse);

        const COLS = 64;
        const ROWS = 40;

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
        const startTime = performance.now();

        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const t = (performance.now() - startTime) / 1000;

            const W = window.innerWidth;
            const H = window.innerHeight;
            const cellW = W / COLS;
            const cellH = H / ROWS;

            // Slow, drifting noise field — its evolution feels organic, not strobing
            const tx = t * 0.06;
            const ty = t * 0.04;

            ctx.clearRect(0, 0, W, H);

            // Pre-compute mouse-to-cell coords for the energy injection
            let mxCell = -1, myCell = -1, mouseR2 = 0;
            if (mouse.active) {
                mxCell = mouse.x / cellW;
                myCell = mouse.y / cellH;
                mouseR2 = 4 * 4; // cells
            }

            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    // Value noise at this cell — gives a smooth activity field
                    const n = valueNoise(x * 0.18 + tx, y * 0.18 + ty);

                    // Threshold the noise into activity bands
                    let intensity = 0;
                    if (n > 0.55) intensity = (n - 0.55) / 0.45; // 0..1

                    // Mouse injection — add energy in a small area
                    if (mouse.active) {
                        const dx = x - mxCell;
                        const dy = y - myCell;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < mouseR2) {
                            const d = Math.sqrt(d2);
                            intensity = Math.max(intensity, (1 - d / Math.sqrt(mouseR2)) * 0.9);
                        }
                    }

                    if (intensity < 0.05) continue; // skip empty cells

                    // Color: base cobalt/mint, with amber for high activity
                    const useAccent = n > 0.72;
                    ctx.fillStyle = useAccent ? palette.accent : palette.primary;
                    ctx.globalAlpha = Math.min(0.7, intensity * 0.85);
                    ctx.fillRect(x * cellW, y * cellH, cellW * 0.92, cellH * 0.92);
                }
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