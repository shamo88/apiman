import React, { createContext, useContext, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useEnvironment } from '../hooks/useEnvironment';
import { useScriptContext } from './ScriptContext';
import { useRequest } from '../hooks/useRequest';

// Create a context that combines all the app state hooks
interface AppStateContextType {
    projects: ReturnType<typeof useProjects>;
    environment: ReturnType<typeof useEnvironment>;
    script: ReturnType<typeof useScriptContext>;
    request: ReturnType<typeof useRequest>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

interface AppStateProviderProps {
    children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
    const projects = useProjects();
    const environment = useEnvironment();
    const script = useScriptContext();
    const request = useRequest({
        onTreeRefresh: (projectId, tree) => {
            projects.setProjectTrees(prev => ({ ...prev, [projectId]: tree }));
        }
    });

    const value: AppStateContextType = {
        projects,
        environment,
        script,
        request,
    };

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextType {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return context;
}

export default AppStateContext;
