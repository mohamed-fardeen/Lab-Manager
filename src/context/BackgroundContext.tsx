import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Background animation mode for the landing page.
 *
 * Modes are deliberately grounded in real programmer vocabulary — each one is a
 * concrete metaphor for what happens when code is written, parsed, or executed.
 * No mode is just "cool 3D" — every visual exists because it depicts something
 * from programming that working developers recognize.
 */
export type BackgroundMode =
    | 'token-drift'        // colored syntax tokens drift and attract toward cursor
    | 'ascii-field'        // monospace punctuation as soft repelling particles
    | 'pixel-grid'         // low-res grid pulsing like a CPU/cache readout
    | 'indentation-wave'   // cursor dots travel along code-indent lines
    | 'lambda-drift'       // CS symbols drift with periodic reduction arcs
    | 'recursive-tree'     // a function-call tree grows and fades over time
    | 'terminal-pulse';    // sparse blinking cursors with type-wave trails

interface BackgroundContextType {
    mode: BackgroundMode;
    setMode: (mode: BackgroundMode) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

const STORAGE_KEY = 'lab-sync-bg-mode';
const DEFAULT_MODE: BackgroundMode = 'token-drift';

export interface BackgroundOption {
    id: BackgroundMode;
    name: string;
    catalogue: string;
    description: string;
    origin: string; // short note on the programming concept it depicts
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
    {
        id: 'token-drift',
        name: 'Token Drift',
        catalogue: '№ A01',
        description: 'Colored syntax tokens drift across the canvas.',
        origin: 'A lexer emits tokens — keyword, string, number — as colored fragments.'
    },
    {
        id: 'ascii-field',
        name: 'ASCII Field',
        catalogue: '№ A02',
        description: 'Monospace punctuation floats as particles with physics.',
        origin: 'The characters that make up a program reduced to pure shape.'
    },
    {
        id: 'pixel-grid',
        name: 'Pixel Grid',
        catalogue: '№ A03',
        description: 'Low-res grid pulses like an instrument readout.',
        origin: 'A memory bus or cache seen from a distance.'
    },
    {
        id: 'indentation-wave',
        name: 'Indentation',
        catalogue: '№ A04',
        description: 'Cursor dots travel along code lines that split and merge.',
        origin: 'A file being edited in slow motion — indentation as structure.'
    },
    {
        id: 'lambda-drift',
        name: 'Lambda Drift',
        catalogue: '№ A05',
        description: 'CS symbols drift and connect with reduction arcs.',
        origin: 'Lambda calculus — symbols reducing to other symbols.'
    },
    {
        id: 'recursive-tree',
        name: 'Call Tree',
        catalogue: '№ A06',
        description: 'A function-call tree grows and fades over time.',
        origin: 'Program execution visualized as a recursive tree.'
    },
    {
        id: 'terminal-pulse',
        name: 'Terminal',
        catalogue: '№ A07',
        description: 'Sparse blinking cursors with type-wave trails.',
        origin: 'A handful of terminals, each with an active prompt.'
    },
];

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<BackgroundMode>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as BackgroundMode) || DEFAULT_MODE;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const setMode = (newMode: BackgroundMode) => setModeState(newMode);

    return (
        <BackgroundContext.Provider value={{ mode, setMode }}>
            {children}
        </BackgroundContext.Provider>
    );
};

export const useBackground = () => {
    const context = useContext(BackgroundContext);
    if (context === undefined) {
        throw new Error('useBackground must be used within a BackgroundProvider');
    }
    return context;
};