import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ProjectTree, Environment, ProjectScript, EnvironmentVariableRow, EnvironmentEditorTab } from '../types';

// Project-level state interface
export interface ProjectState {
    // Tab navigation
    activeTab: string;

    // Project tabs
    projectTabs: ProjectTab[];

    // Current project (derived from projectTabs)
    currentProject: Project | null;

    // Project trees
    projectTrees: Record<string, ProjectTree>;

    // Tree state
    expandedKeys: string[];
    selectedKeys: string[];
    collapsedFolders: Set<string>;
    expandedRequestPaths: Set<string>;

    // Search & filter
    searchKeyword: string;
    filterMethod: string;

    // Sidebar menu
    sidebarMenu: 'apis' | 'environments' | 'scripts';

    // Environments
    environments: Environment[];
    selectedEnvironmentId: string;
    environmentsInitiallyLoaded: boolean;
    editingEnvironmentId: string;
    environmentFormName: string;
    environmentFormVariables: EnvironmentVariableRow[];
    environmentTabs: EnvironmentEditorTab[];
    activeEnvironmentTab: string;

    // Scripts
    projectScripts: ProjectScript[];
    editingScriptId: string;
    scriptFormName: string;
    scriptFormDescription: string;
    scriptFormContent: string;

    // Drag & drop
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    invalidDropHint: { message: string; x: number; y: number } | null;
    movedHighlightPath: string | null;

    // UI state
    createFolderModal: boolean;
    newFolderName: string;
    createRequestModal: boolean;
    newRequestName: string;
    renameModal: boolean;
    renameType: 'request' | 'folder';
    renamePath: string;
    renameValue: string;
    selectedFolder: string | null;

    // Request tree UI - Note: searchInputRef, renameInputRef, renameSelectionEndRef
    // are managed locally in App.tsx, not via context
}

interface ProjectTab {
    id: string;
    title: string;
    project: Project;
}

interface Project {
    id: string;
    name: string;
}

// Project-level actions interface
export interface ProjectActions {
    // Tab navigation
    setActiveTab: (tab: string) => void;

    // Project tabs
    setProjectTabs: (tabs: ProjectTab[]) => void;

    // Tree state
    setExpandedKeys: (keys: string[]) => void;
    setSelectedKeys: (keys: string[]) => void;
    setCollapsedFolders: (folders: Set<string>) => void;
    setExpandedRequestPaths: (paths: Set<string>) => void;

    // Search & filter
    setSearchKeyword: (keyword: string) => void;
    setFilterMethod: (method: string) => void;

    // Sidebar menu
    setSidebarMenu: (menu: 'apis' | 'environments' | 'scripts') => void;

    // Environments
    setEnvironments: (environments: Environment[]) => void;
    setSelectedEnvironmentId: (id: string) => void;
    setEnvironmentsInitiallyLoaded: (loaded: boolean) => void;
    setEditingEnvironmentId: (id: string) => void;
    setEnvironmentFormName: (name: string) => void;
    setEnvironmentFormVariables: (variables: EnvironmentVariableRow[]) => void;
    setEnvironmentTabs: (tabs: EnvironmentEditorTab[]) => void;
    setActiveEnvironmentTab: (tab: string) => void;

    // Scripts
    setProjectScripts: (scripts: ProjectScript[]) => void;
    setEditingScriptId: (id: string) => void;
    setScriptFormName: (name: string) => void;
    setScriptFormDescription: (description: string) => void;
    setScriptFormContent: (content: string) => void;

    // Drag & drop
    setDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
    setDropTargetFolderPath: (path: string | null) => void;
    setInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
    setMovedHighlightPath: (path: string | null) => void;

    // UI state
    setCreateFolderModal: (visible: boolean) => void;
    setNewFolderName: (name: string) => void;
    setCreateRequestModal: (visible: boolean) => void;
    setNewRequestName: (name: string) => void;
    setRenameModal: (visible: boolean) => void;
    setRenameType: (type: 'request' | 'folder') => void;
    setRenamePath: (path: string) => void;
    setRenameValue: (value: string) => void;
    setSelectedFolder: (folder: string | null) => void;

    // Project trees
    setProjectTrees: (trees: Record<string, ProjectTree>) => void;

    // Project tabs helpers
    openProject: (project: Project) => void;
    closeProject: (projectId: string) => void;
}

type ProjectContextType = ProjectState & ProjectActions;

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
    children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
    // Tab navigation
    const [activeTab, setActiveTab] = useState<string>('home');

    // Project tabs
    const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);

    // Project trees
    const [projectTrees, setProjectTrees] = useState<Record<string, ProjectTree>>({});

    // Tree state
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [expandedRequestPaths, setExpandedRequestPaths] = useState<Set<string>>(() => new Set());

    // Search & filter
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');

    // Sidebar menu
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');

    // Environments
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [environmentsInitiallyLoaded, setEnvironmentsInitiallyLoaded] = useState(false);
    const [editingEnvironmentId, setEditingEnvironmentId] = useState<string>('');
    const [environmentFormName, setEnvironmentFormName] = useState('');
    const [environmentFormVariables, setEnvironmentFormVariables] = useState<EnvironmentVariableRow[]>([]);
    const [environmentTabs, setEnvironmentTabs] = useState<EnvironmentEditorTab[]>([]);
    const [activeEnvironmentTab, setActiveEnvironmentTab] = useState<string>('');

    // Scripts
    const [projectScripts, setProjectScripts] = useState<ProjectScript[]>([]);
    const [editingScriptId, setEditingScriptId] = useState<string>('');
    const [scriptFormName, setScriptFormName] = useState('');
    const [scriptFormDescription, setScriptFormDescription] = useState('');
    const [scriptFormContent, setScriptFormContent] = useState('// 在这里编写 JavaScript 脚本\n');

    // Drag & drop
    const [draggingNode, setDraggingNode] = useState<{ type: 'request' | 'folder'; path: string } | null>(null);
    const [dropTargetFolderPath, setDropTargetFolderPath] = useState<string | null>(null);
    const [invalidDropHint, setInvalidDropHint] = useState<{ message: string; x: number; y: number } | null>(null);
    const [movedHighlightPath, setMovedHighlightPath] = useState<string | null>(null);

    // UI state
    const [createFolderModal, setCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [createRequestModal, setCreateRequestModal] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [renameModal, setRenameModal] = useState(false);
    const [renameType, setRenameType] = useState<'request' | 'folder'>('request');
    const [renamePath, setRenamePath] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

    // Refs
    const searchInputRef = React.useRef<any>(null);
    const renameInputRef = React.useRef<any>(null);
    const renameSelectionEndRef = React.useRef<number>(0);

    // Get current project from tabs
    const currentProject = projectTabs.length > 0 ? projectTabs[0].project : null;

    // Project tab helpers
    const openProject = (project: Project) => {
        const exists = projectTabs.find(t => t.id === project.id);
        if (!exists) {
            setProjectTabs([...projectTabs, {
                id: project.id,
                title: project.name,
                project
            }]);
        }
    };

    const closeProject = (projectId: string) => {
        setProjectTabs(projectTabs.filter(t => t.id !== projectId));
    };

    const value: ProjectContextType = {
        // Tab navigation
        activeTab,
        setActiveTab,

        // Project tabs
        projectTabs,
        setProjectTabs,

        // Current project
        currentProject,

        // Project trees
        projectTrees,
        setProjectTrees,

        // Tree state
        expandedKeys,
        setExpandedKeys,
        selectedKeys,
        setSelectedKeys,
        collapsedFolders,
        setCollapsedFolders,
        expandedRequestPaths,
        setExpandedRequestPaths,

        // Search & filter
        searchKeyword,
        setSearchKeyword,
        filterMethod,
        setFilterMethod,

        // Sidebar menu
        sidebarMenu,
        setSidebarMenu,

        // Environments
        environments,
        setEnvironments,
        selectedEnvironmentId,
        setSelectedEnvironmentId,
        environmentsInitiallyLoaded,
        setEnvironmentsInitiallyLoaded,
        editingEnvironmentId,
        setEditingEnvironmentId,
        environmentFormName,
        setEnvironmentFormName,
        environmentFormVariables,
        setEnvironmentFormVariables,
        environmentTabs,
        setEnvironmentTabs,
        activeEnvironmentTab,
        setActiveEnvironmentTab,

        // Scripts
        projectScripts,
        setProjectScripts,
        editingScriptId,
        setEditingScriptId,
        scriptFormName,
        setScriptFormName,
        scriptFormDescription,
        setScriptFormDescription,
        scriptFormContent,
        setScriptFormContent,

        // Drag & drop
        draggingNode,
        setDraggingNode,
        dropTargetFolderPath,
        setDropTargetFolderPath,
        invalidDropHint,
        setInvalidDropHint,
        movedHighlightPath,
        setMovedHighlightPath,

        // UI state
        createFolderModal,
        setCreateFolderModal,
        newFolderName,
        setNewFolderName,
        createRequestModal,
        setCreateRequestModal,
        newRequestName,
        setNewRequestName,
        renameModal,
        setRenameModal,
        renameType,
        setRenameType,
        renamePath,
        setRenamePath,
        renameValue,
        setRenameValue,
        selectedFolder,
        setSelectedFolder,

        // Project tabs helpers
        openProject,
        closeProject,
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
