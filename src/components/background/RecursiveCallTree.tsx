import { useEffect, useRef } from 'react';
import {
    usePalette,
    createMouseState,
    attachMouseHandlers,
    configureCanvas,
} from './shared';

/**
 * RecursiveCallTree — a single tree grows slowly across the canvas. Root on
 * the left edge; branches reach rightward. Each node pulses briefly when
 * "called". Old branches fade as new ones grow.
 *
 * Cursor near a branch triggers a cascade pulse down that branch.
 */
export default function RecursiveCallTree() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const palette = usePalette();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = configureCanvas(canvas);
        if (!ctx) return;

        const mouse = createMouseState();
        const detachMouse = attachMouseHandlers(canvas, mouse);

        interface Node {
            x: number;
            y: number;
            parent: Node | null;
            children: Node[];
            depth: number;
            bornAt: number;
            pulseAt: number; // last time this node was pulsed
            alive: boolean;
        }

        let root: Node;
        const allNodes: Node[] = [];

        function makeNode(parent: Node | null, x: number, y: number, depth: number): Node {
            const n: Node = {
                x,
                y,
                parent,
                children: [],
                depth,
                bornAt: performance.now(),
                pulseAt: 0,
                alive: true,
            };
            allNodes.push(n);
            return n;
        }

        function rebuildTree(W: number, H: number) {
            allNodes.length = 0;
            root = makeNode(null, W * 0.08, H * 0.5, 0);
            growSubtree(root, 6, W, H);
        }

        function growSubtree(parent: Node, maxDepth: number, W: number, H: number) {
            if (parent.depth >= maxDepth) return;
            // 2-3 children
            const childCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < childCount; i++) {
                const dx = (W * 0.7) / maxDepth;
                const childX = parent.x + dx * (0.7 + Math.random() * 0.6);
                const spread = (H * 0.7) / Math.pow(2, parent.depth + 1);
                const childY = parent.y + (Math.random() - 0.5) * spread * 2;
                const child = makeNode(parent, childX, childY, parent.depth + 1);
                parent.children.push(child);
                growSubtree(child, maxDepth, W, H);
            }
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
            rebuildTree(nw, nh);
        };
        window.addEventListener('resize', handleResize);

        rebuildTree(window.innerWidth, window.innerHeight);

        let frameId = 0;
        let lastTime = performance.now();
        let lastRegrow = 0;

        // Cascade pulse — pulse node + all its descendants
        function pulseSubtree(n: Node, time: number) {
            n.pulseAt = time;
            for (const c of n.children) pulseSubtree(c, time);
        }

        const tick = () => {
            frameId = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = Math.min(50, now - lastTime) / 16.667;
            lastTime = now;

            const W = window.innerWidth;
            const H = window.innerHeight;

            ctx.clearRect(0, 0, W, H);

            // Periodic regrow — about every 12s, drop the tree and grow a new one
            if (now - lastRegrow > 12000) {
                lastRegrow = now;
                rebuildTree(W, H);
            }

            // Detect mouse hover on a node and pulse its subtree
            if (mouse.active) {
                let nearest: Node | null = null;
                let nearestDist2 = 50 * 50;
                for (const n of allNodes) {
                    const dx = n.x - mouse.x;
                    const dy = n.y - mouse.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < nearestDist2) {
                        nearestDist2 = d2;
                        nearest = n;
                    }
                }
                if (nearest && now - (nearest as Node).pulseAt > 800) {
                    pulseSubtree(nearest as Node, now);
                }
            }

            // Draw edges first (parent → child)
            ctx.lineWidth = 1;
            for (const n of allNodes) {
                if (!n.parent) continue;
                const age = now - n.bornAt;
                const fadeIn = Math.min(1, age / 1500);
                const ageOut = 1 - Math.max(0, (age - 8000) / 4000); // fade out as tree ages
                const a = fadeIn * Math.max(0, ageOut) * 0.35;
                if (a <= 0) continue;

                // Pulse boost — does the line connect a recently-pulsed node?
                let boost = 1;
                const since = now - n.pulseAt;
                if (since < 800) {
                    boost = 1 + Math.max(0, 1 - since / 800) * 1.5;
                }

                ctx.strokeStyle = palette.primary;
                ctx.globalAlpha = a;
                ctx.beginPath();
                ctx.moveTo(n.parent.x, n.parent.y);
                // Slight curve for organic feel
                const midX = (n.parent.x + n.x) / 2;
                ctx.quadraticCurveTo(midX, n.parent.y, n.x, n.y);
                ctx.stroke();
            }

            // Draw nodes
            for (const n of allNodes) {
                const age = now - n.bornAt;
                const fadeIn = Math.min(1, age / 1500);
                const ageOut = 1 - Math.max(0, (age - 8000) / 4000);
                const a = fadeIn * Math.max(0, ageOut);
                if (a <= 0) continue;

                // Pulse boost
                const since = now - n.pulseAt;
                let pulseBoost = 0;
                if (since < 800) {
                    pulseBoost = Math.max(0, 1 - since / 800);
                }

                const baseRadius = 2 + n.depth * 0.4;
                const radius = baseRadius + pulseBoost * 4;
                const intensity = 0.5 + pulseBoost * 0.5;

                // Pulse ring expands from node
                if (pulseBoost > 0) {
                    const ringRadius = 6 + (1 - pulseBoost) * 40;
                    ctx.strokeStyle = palette.accent;
                    ctx.globalAlpha = pulseBoost * 0.6;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = palette.primary;
                ctx.globalAlpha = a * intensity;
                ctx.beginPath();
                ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
                ctx.fill();
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