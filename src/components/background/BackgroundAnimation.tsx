import { lazy, Suspense } from 'react';
import { useBackground } from '../../context/BackgroundContext';

// Lazy-load each animation so the user only pays for the one they chose.
// A user who picked TerminalCursorPulse shouldn't download the call-tree code.
const CodeTokenDrift = lazy(() => import('./CodeTokenDrift'));
const AsciiParticleField = lazy(() => import('./AsciiParticleField'));
const PixelGridPulse = lazy(() => import('./PixelGridPulse'));
const IndentationWave = lazy(() => import('./IndentationWave'));
const LambdaDrift = lazy(() => import('./LambdaDrift'));
const RecursiveCallTree = lazy(() => import('./RecursiveCallTree'));
const TerminalCursorPulse = lazy(() => import('./TerminalCursorPulse'));

/**
 * Dispatcher — renders whichever background animation the admin has selected.
 *
 * The animation choice is persisted in localStorage via BackgroundContext and
 * survives reloads. Default is `token-drift` for first-time visitors.
 */
export default function BackgroundAnimation() {
    const { mode } = useBackground();

    let Component: React.ComponentType | null = null;
    switch (mode) {
        case 'token-drift':     Component = CodeTokenDrift;     break;
        case 'ascii-field':     Component = AsciiParticleField; break;
        case 'pixel-grid':      Component = PixelGridPulse;     break;
        case 'indentation-wave':Component = IndentationWave;    break;
        case 'lambda-drift':    Component = LambdaDrift;        break;
        case 'recursive-tree':  Component = RecursiveCallTree;  break;
        case 'terminal-pulse':  Component = TerminalCursorPulse;break;
    }

    return (
        <Suspense fallback={<div className="fixed inset-0 z-0 pointer-events-none app-bg" />}>
            {Component && <Component />}
        </Suspense>
    );
}