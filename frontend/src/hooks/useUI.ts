import { useState, useCallback } from 'react';
import { Project, ProjectTab, ProjectWorkspaceState, createEmptyWorkspaceState } from '../types';

export interface UseUIState {
    activeTab: string;
    projectTabs: ProjectTab[];
    sidebarMenu: 'apis' | 'environments' | 'scripts';
    appTheme: 'light' | 'dark';
    animationEnabled: boolean;
    importing: boolean;
    searchVersion: number;
    forceListAnimation: boolean;
    status: string;
    projectWorkspaceStates: Record<string, ProjectWorkspaceState>;
}

export interface UseUIActions {
    setActiveTab: (tab: string) => void;
    setProjectTabs: (tabs: ProjectTab[]) => void;
    setSidebarMenu: (menu: 'apis' | 'environments' | 'scripts') => void;
    setAppTheme: (theme: 'light' | 'dark') => void;
    setAnimationEnabled: (enabled: boolean) => void;
    switchProjectTab: (projectId: string) => void;
    openProject: (project: Project) => void;
    triggerOpenTabAnimation: () => void;
}

export type UseUI = UseUIState & UseUIActions;

export function useUI(): UseUI {
    const [activeTab, setActiveTab] = useState<string>('home');
    const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
    const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');
    const [animationEnabled, setAnimationEnabled] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchVersion, setSearchVersion] = useState(0);
    const [forceListAnimation, setForceListAnimation] = useState(false);
    const [status, setStatus] = useState('');
    const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, ProjectWorkspaceState>>({});

    const switchProjectTab = useCallback((projectId: string) => {
        setActiveTab(projectId);
    }, []);

    const openProject = useCallback((project: Project) => {
        const existingTab = projectTabs.find(tab => tab.project.id === project.id);
        if (existingTab) {
            setActiveTab(existingTab.id);
        } else {
            const newTab: ProjectTab = {
                id: project.id,
                title: project.name,
                project: project,
            };
            setProjectTabs(prev => [...prev, newTab]);
            setActiveTab(project.id);
            setProjectWorkspaceStates(prev => ({
                ...prev,
                [project.id]: createEmptyWorkspaceState(),
            }));
        }
    }, [projectTabs]);

    const triggerOpenTabAnimation = useCallback(() => {
        setForceListAnimation(true);
        setTimeout(() => setForceListAnimation(false), 0);
    }, []);

    return {
        // State
        activeTab,
        projectTabs,
        sidebarMenu,
        appTheme,
        animationEnabled,
        importing,
        searchVersion,
        forceListAnimation,
        status,
        projectWorkspaceStates,
        // Actions
        setActiveTab,
        setProjectTabs,
        setSidebarMenu,
        setAppTheme,
        setAnimationEnabled,
        switchProjectTab,
        openProject,
        triggerOpenTabAnimation,
    };
}
