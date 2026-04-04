import React, { createContext, useContext, ReactNode } from 'react';
import { useScript, UseScriptReturn } from '../hooks/useScript';

const ScriptContext = createContext<UseScriptReturn | null>(null);

interface ScriptProviderProps {
    children: ReactNode;
}

export const ScriptProvider: React.FC<ScriptProviderProps> = ({ children }) => {
    const scriptState = useScript();
    return (
        <ScriptContext.Provider value={scriptState}>
            {children}
        </ScriptContext.Provider>
    );
};

export const useScriptContext = (): UseScriptReturn => {
    const context = useContext(ScriptContext);
    if (!context) {
        throw new Error('useScriptContext must be used within ScriptProvider');
    }
    return context;
};
