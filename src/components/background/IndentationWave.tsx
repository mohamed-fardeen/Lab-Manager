import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
} from './shared';

/**
 * IndentationWave — horizontal lines at varying indentation levels, each
 * carrying a small cursor dot that travels along it. Lines occasionally
 * split (one becomes two at a deeper indent) or merge (a child folds up
 * into its parent). Reads as a file being edited in slow motion.
 */
export default function IndentationWave() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();
        const detachMouse = attachMouseHandlers(canvas, mouse);

        interface Line {
            y: number;
            startX: number;      // indentation
            endX: number;        // line length
            cursorX: number;     // current cursor position along this line
            speed: number;       // cursor pixels per frame
            alpha: number;       // brightness
            depth: number;       // for visualization tint
        }

        const lines: Line[] = [];
        const W0 = window.innerWidth;
        const H0 = window.innerHeight;

        function spawnLine(y: number, depth: number) {
            const indentPx = 60 + depth * 32;
            const startX = indentPx;
            const maxEnd = W0 * 0.55;
            const minEnd = W0 * 0.2;
            const endX = startX + minEnd + Math.random() * (maxEnd - minEnd);
            lines.push({
                y,
                startX,
                endX,
                cursorX: startX,
                speed: 0.3 + Math.random() * 0.8,
                alpha: 0.18 + Math.random() * 0.25,
                depth,
            });
        }

        // Seed initial lines spanning the viewport
        const targetLines = 22;
        for (let i = 0; i < targetLines; i++) {
            const depth = Math.floor(Math.random() * 4);
            const y = 40 + (H0 - 80) * (i / (targetLines - 1));
            spawnLine(y, depth);
        }

        // Cursor boost when mouse is near any line
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
        let lastSplitCheck = 0;

        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = Math.min(50, now - lastTime) / 16.667;
            lastTime = now;

            const W = window.innerWidth;
            const H = window.innerHeight;

            ctx.clearRect(0, 0, W, H);

            // Update each line
            for (const line of lines) {
                // Cursor travel
                line.cursorX += line.speed * dt;

                // Wrap cursor at end of line — gives the impression of a long line
                if (line.cursorX > line.endX) {
                    line.cursorX = line.startX - 40;
                }

                // Indentation guides (vertical line from startX up to next-line indent)
                // Drawn faintly to suggest "this block is indented"
            }

            // Occasionally split a line — finds a random line and spawns a child below
            if (now - lastSplitCheck > 1400) {
                lastSplitCheck = now;
                if (lines.length < 32) {
                    const parent = lines[Math.floor(Math.random() * lines.length)];
                    const newY = parent.y + 22 + Math.random() * 12;
                    if (newY < H - 30) {
                        spawnLine(newY, parent.depth + 1);
                    }
                }
                // Occasionally fade a line out (simulating a block being folded/removed)
                if (lines.length > 14 && Math.random() < 0.35) {
                    const idx = Math.floor(Math.random() * lines.length);
                    lines[idx].alpha *= 0.4;
                    if (lines[idx].alpha < 0.05) lines.splice(idx, 1);
                }
            }

            // Draw indentation guides first (behind lines)
            ctx.strokeStyle = palette.primary;
            ctx.lineWidth = 1;

            // Sort lines by y for stable rendering
            const sorted = [...lines].sort((a, b) => a.y - b.y);

            // Group by approximate y for guide lines
            for (let i = 0; i < sorted.length; i++) {
                const ln = sorted[i];

                // Indentation guide: thin vertical line at startX
                ctx.globalAlpha = 0.07;
                ctx.beginPath();
                ctx.moveTo(ln.startX - 12, ln.y - 14);
                ctx.lineTo(ln.startX - 12, ln.y + 14);
                ctx.stroke();

                // The line itself
                ctx.globalAlpha = ln.alpha;
                ctx.beginPath();
                ctx.moveTo(ln.startX, ln.y);
                ctx.lineTo(ln.endX, ln.y);
                ctx.stroke();

                // Cursor block — small rectangle at cursorX
                const cursorHeight = 10;
                const cursorWidth = 2;
                // Boost when mouse is near
                let boost = 1;
                if (mouse.active) {
                    const dy = Math.abs(mouse.y - ln.y);
                    if (dy < 40) {
                        boost = 1.4;
                    }
                }
                ctx.globalAlpha = Math.min(1, ln.alpha * 1.8 * boost);
                ctx.fillRect(ln.cursorX - cursorWidth / 2, ln.y - cursorHeight / 2, cursorWidth, cursorHeight);

                // Glow trail behind cursor — short, fades
                const trailLen = 24;
                const trailGrad = ctx.createLinearGradient(
                    ln.cursorX - trailLen, ln.y,
                    ln.cursorX, ln.y
                );
                trailGrad.addColorStop(0, palette.primary + '00');
                trailGrad.addColorStop(1, palette.primary);
                ctx.fillStyle = trailGrad;
                ctx.globalAlpha = ln.alpha * 0.4;
                ctx.fillRect(ln.cursorX - trailLen, ln.y - 1, trailLen, 2);
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