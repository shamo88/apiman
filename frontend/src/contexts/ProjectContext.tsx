import React, { createContext, useContext, ReactNode } from 'react';
import type { Project } from '../types';
import type { UseEnvironment } from '../hooks/useEnvironment';
import type { UseScriptReturn } from '../hooks/useScript';
import type { UseProjectTreeReturn } from '../hooks/useProjectTree';

// Combined context for sharing hook state between components
interface ProjectContextType {
    // Project navigation
    openProject: (project: Project) => Promise<void>;

    // Environment state (from App.tsx's useEnvironment)
    environment: UseEnvironment;

    // Script state (from App.tsx's useScriptContext)
    script: UseScriptReturn;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
    children: ReactNode;
    onOpenProject: (project: Project) => Promise<void>;
    environment: UseEnvironment;
    script: UseScriptReturn;
}

export function ProjectProvider({ children, onOpenProject, environment, script }: ProjectProviderProps) {
    const value: ProjectContextType = {
        openProject: onOpenProject,
        environment,
        script,
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextType {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjectContext must be used within ProjectProvider');
    }
    return context;
}

export default ProjectContext;
