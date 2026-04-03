import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Project, MCPConfig, Environment } from '../types';

// App-level state interface
export interface AppState {
    // App status
    status: string;
    loading: boolean;

    // Theme & UI
    appTheme: 'light' | 'dark';
    animationEnabled: boolean;

    // Projects
    projects: Project[];
    projectGroups: string[];
    projectGroupAssignments: Record<string, string>;
    collapsedProjectGroups: Set<string>;
    projectGroupsLoaded: boolean;

    // MCP
    mcpConfig: MCPConfig;
    mcpStatus: 'stopped' | 'running' | 'error';
    mcpEnvironments: Environment[];

    // Global UI modals
    createProjectModal: boolean;
    newProjectName: string;
    cookieModalVisible: boolean;
    cookieInput: string;
    globalCookies: any[];
    mcpModalVisible: boolean;
    historyModalVisible: boolean;
    createGroupModal: boolean;
    newGroupName: string;
    renameProjectModal: boolean;
    renameProjectId: string;
    renameProjectValue: string;
    renameGroupModal: boolean;
    renameGroupValue: string;
    editingGroupName: string;

    // Project drag & drop
    draggingProjectId: string | null;
    projectDropTargetGroup: string | null;
    draggingGroupName: string | null;
    groupSortDropTarget: string | null;
}

// App-level actions interface
export interface AppActions {
    // Theme
    setAppTheme: (theme: 'light' | 'dark') => void;
    setAnimationEnabled: (enabled: boolean) => void;

    // Projects
    setProjects: (projects: Project[]) => void;
    setProjectGroups: (groups: string[]) => void;
    setProjectGroupAssignments: (assignments: Record<string, string>) => void;
    setCollapsedProjectGroups: (groups: Set<string>) => void;
    setProjectGroupsLoaded: (loaded: boolean) => void;

    // MCP
    setMCPConfig: (config: MCPConfig) => void;
    setMCPStatus: (status: 'stopped' | 'running' | 'error') => void;
    setMCPEnvironments: (environments: Environment[]) => void;

    // Global UI modals
    setCreateProjectModal: (visible: boolean) => void;
    setNewProjectName: (name: string) => void;
    setCookieModalVisible: (visible: boolean) => void;
    setCookieInput: (input: string) => void;
    setGlobalCookies: (cookies: any[]) => void;
    setMCpModalVisible: (visible: boolean) => void;
    setHistoryModalVisible: (visible: boolean) => void;
    setCreateGroupModal: (visible: boolean) => void;
    setNewGroupName: (name: string) => void;
    setRenameProjectModal: (visible: boolean) => void;
    setRenameProjectId: (id: string) => void;
    setRenameProjectValue: (value: string) => void;
    setRenameGroupModal: (visible: boolean) => void;
    setRenameGroupValue: (value: string) => void;
    setEditingGroupName: (name: string) => void;

    // Project drag & drop
    setDraggingProjectId: (id: string | null) => void;
    setProjectDropTargetGroup: (group: string | null) => void;
    setDraggingGroupName: (name: string | null) => void;
    setGroupSortDropTarget: (group: string | null) => void;

    // Status
    setStatus: (status: string) => void;
    setLoading: (loading: boolean) => void;
}

type AppContextType = AppState & AppActions;

const AppContext = createContext<AppContextType | null>(null);

const defaultMCPConfig: MCPConfig = {
    enabled: false,
    port: 3847,
    project_id: '',
    environment_id: '',
    api_key: ''
};

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    // App status
    const [status, setStatus] = useState('初始化中...');
    const [loading, setLoading] = useState(false);

    // Theme & UI
    const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('apiman-theme');
        return saved === 'dark' || saved === 'light' ? saved : 'light';
    });
    const [animationEnabled, setAnimationEnabled] = useState(false);

    // Projects
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectGroups, setProjectGroups] = useState<string[]>([]);
    const [projectGroupAssignments, setProjectGroupAssignments] = useState<Record<string, string>>({});
    const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set());
    const [projectGroupsLoaded, setProjectGroupsLoaded] = useState(false);

    // MCP
    const [mcpConfig, setMCPConfig] = useState<MCPConfig>(defaultMCPConfig);
    const [mcpStatus, setMCPStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
    const [mcpEnvironments, setMCPEnvironments] = useState<Environment[]>([]);

    // Global UI modals
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [cookieModalVisible, setCookieModalVisible] = useState(false);
    const [cookieInput, setCookieInput] = useState('');
    const [globalCookies, setGlobalCookies] = useState<any[]>([]);
    const [mcpModalVisible, setMCpModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [createGroupModal, setCreateGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [renameProjectModal, setRenameProjectModal] = useState(false);
    const [renameProjectId, setRenameProjectId] = useState('');
    const [renameProjectValue, setRenameProjectValue] = useState('');
    const [renameGroupModal, setRenameGroupModal] = useState(false);
    const [renameGroupValue, setRenameGroupValue] = useState('');
    const [editingGroupName, setEditingGroupName] = useState('');

    // Project drag & drop
    const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
    const [projectDropTargetGroup, setProjectDropTargetGroup] = useState<string | null>(null);
    const [draggingGroupName, setDraggingGroupName] = useState<string | null>(null);
    const [groupSortDropTarget, setGroupSortDropTarget] = useState<string | null>(null);

    // Theme effect - apply to document
    React.useEffect(() => {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('theme-dark', appTheme === 'dark');
    }, [appTheme]);

    const value: AppContextType = {
        // App status
        status,
        loading,
        setStatus,
        setLoading,

        // Theme & UI
        appTheme,
        setAppTheme,
        animationEnabled,
        setAnimationEnabled,

        // Projects
        projects,
        setProjects,
        projectGroups,
        setProjectGroups,
        projectGroupAssignments,
        setProjectGroupAssignments,
        collapsedProjectGroups,
        setCollapsedProjectGroups,
        projectGroupsLoaded,
        setProjectGroupsLoaded,

        // MCP
        mcpConfig,
        setMCPConfig,
        mcpStatus,
        setMCPStatus,
        mcpEnvironments,
        setMCPEnvironments,

        // Global UI modals
        createProjectModal,
        setCreateProjectModal,
        newProjectName,
        setNewProjectName,
        cookieModalVisible,
        setCookieModalVisible,
        cookieInput,
        setCookieInput,
        globalCookies,
        setGlobalCookies,
        mcpModalVisible,
        setMCpModalVisible,
        historyModalVisible,
        setHistoryModalVisible,
        createGroupModal,
        setCreateGroupModal,
        newGroupName,
        setNewGroupName,
        renameProjectModal,
        setRenameProjectModal,
        renameProjectId,
        setRenameProjectId,
        renameProjectValue,
        setRenameProjectValue,
        renameGroupModal,
        setRenameGroupModal,
        renameGroupValue,
        setRenameGroupValue,
        editingGroupName,
        setEditingGroupName,

        // Project drag & drop
        draggingProjectId,
        setDraggingProjectId,
        projectDropTargetGroup,
        setProjectDropTargetGroup,
        draggingGroupName,
        setDraggingGroupName,
        groupSortDropTarget,
        setGroupSortDropTarget,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
}

export default AppContext;
