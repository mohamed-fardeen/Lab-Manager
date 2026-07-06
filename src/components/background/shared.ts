/**
 * Shared helpers for background animations.
 *
 * Each animation is a Canvas 2D full-screen renderer. They all need the same
 * three things: an animated clock, a mouse position in screen coords, and a
 * theme-aware palette. Keeping these here so each animation component only
 * declares its unique visual logic.
 */

import { useTheme } from '../../context/ThemeContext';

export interface Palette {
    primary: string;       // main stroke / fill color (cobalt in light, mint in dark)
    accent: string;        // amber rule
    secondary: string;     // neutral / dotted detail
    backgroundFade: string; // rgba used for trail-effect fading
}

export function usePalette(): Palette {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return {
        primary: isDark ? '#00E5B0' : '#1E40AF',
        accent: '#C99A3B',
        secondary: isDark ? 'rgba(156,163,175,0.85)' : 'rgba(30,23,20,0.65)',
        backgroundFade: isDark ? 'rgba(10,10,10,0.08)' : 'rgba(245,240,225,0.08)',
    };
}

/**
 * Tracks mouse position in CSS pixels relative to the viewport.
 * Returns a stable ref-like object updated by the animation loop.
 */
export interface MouseState {
    x: number;
    y: number;
    active: boolean;
    lastMoveTime: number;
}

export function createMouseState(): MouseState {
    return {
        x: -9999,
        y: -9999,
        active: false,
        lastMoveTime: 0,
    };
}

export function attachMouseHandlers(canvas: HTMLCanvasElement, state: MouseState): () => void {
    const onMove = (e: MouseEvent) => {
        state.x = e.clientX;
        state.y = e.clientY;
        state.active = true;
        state.lastMoveTime = performance.now();
    };
    const onLeave = () => {
        state.active = false;
        state.x = -9999;
        state.y = -9999;
    };
    const onTouch = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        state.x = t.clientX;
        state.y = t.clientY;
        state.active = true;
        state.lastMoveTime = performance.now();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    document.body.addEventListener('mouseleave', onLeave);

    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onTouch);
        document.body.removeEventListener('mouseleave', onLeave);
    };
}

/**
 * Configures a canvas for HiDPI rendering and returns a 2D context scaled to
 * CSS pixels. The caller is responsible for sizing the backing store via
 * window.innerWidth/innerHeight * dpr on each resize.
 */
export function configureCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
    return ctx;
}

/**
 * Eased lerp — critically damped follow.
 */
export function ease(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

/**
 * Pseudo-random based on two integers. Cheap, deterministic.
 */
export function hash2(x: number, y: number): number {
    let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return h - Math.floor(h);
}

/**
 * Simple 2-D value-noise approximation. Good enough for ambient pulsing without
 * pulling in a Perlin/Simplex dependency.
 */
export function valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const tl = hash2(xi, yi);
    const tr = hash2(xi + 1, yi);
    const bl = hash2(xi, yi + 1);
    const br = hash2(xi + 1, yi + 1);
    // smoothstep
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    const top = tl + (tr - tl) * sx;
    const bot = bl + (br - bl) * sx;
    return top + (bot - top) * sy;
}