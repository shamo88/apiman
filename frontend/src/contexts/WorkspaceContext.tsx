import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ApiConfig } from '../utils/apiConfig';
import type { CurlRequest, RequestCaseState, RequestEditorSurface } from '../types';

// Workspace-level state interface
export interface WorkspaceState {
    // Request tabs
    requestTabs: RequestTab[];
    activeRequestTab: string;

    // Current request
    currentRequest: CurlRequest | null;

    // Response
    response: any;
    formattedResponse: string;
    responseBodyHeight: number;
    scriptResultsHeight: number;
    scriptLogsExpanded: boolean;
    testResultsExpanded: boolean;

    // Execution
    executing: boolean;

    // API Config
    apiConfig: ApiConfig;
    interfaceApiConfig: ApiConfig;
    curlPreview: string;

    // Request cases
    requestCases: RequestCaseState[];
    activeCaseId: string;
    requestEditorSurface: RequestEditorSurface;
    sidebarHighlightedCasePath: string;
    expandedRequestPaths: Set<string>;

    // Case modals
    caseRenameModalOpen: boolean;
    caseRenameCasePath: string;
    caseRenameInput: string;
    addCaseModalOpen: boolean;
    addCaseTargetPath: string;
    addCaseNameInput: string;

    // Rename modal
    renameModal: boolean;
    renameType: 'request' | 'folder';
    renamePath: string;
    renameValue: string;

    // Tree state
    selectedFolder: string | null;
    selectedKeys: string[];
    searchKeyword: string;
    filterMethod: string;
    collapsedFolders: Set<string>;
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    invalidDropHint: { message: string; x: number; y: number } | null;
    movedHighlightPath: string | null;
    expandedKeys: string[];

    // UI state
    scriptHelpVisible: boolean;
    importing: boolean;
    searchVersion: number;
    forceListAnimation: boolean;
}

interface RequestTab {
    id: string;
    title: string;
    path: string;
}

// Workspace-level actions interface
export interface WorkspaceActions {
    // Request tabs
    setRequestTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>;
    setActiveRequestTab: React.Dispatch<React.SetStateAction<string>>;

    // Current request
    setCurrentRequest: React.Dispatch<React.SetStateAction<CurlRequest | null>>;

    // Response
    setResponse: React.Dispatch<React.SetStateAction<any>>;
    setFormattedResponse: React.Dispatch<React.SetStateAction<string>>;
    setResponseBodyHeight: React.Dispatch<React.SetStateAction<number>>;
    setScriptResultsHeight: React.Dispatch<React.SetStateAction<number>>;
    setScriptLogsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setTestResultsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

    // Execution
    setExecuting: React.Dispatch<React.SetStateAction<boolean>>;

    // API Config
    setApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
    setInterfaceApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
    setCurlPreview: React.Dispatch<React.SetStateAction<string>>;

    // Request cases
    setRequestCases: React.Dispatch<React.SetStateAction<RequestCaseState[]>>;
    setActiveCaseId: React.Dispatch<React.SetStateAction<string>>;
    setRequestEditorSurface: React.Dispatch<React.SetStateAction<RequestEditorSurface>>;
    setSidebarHighlightedCasePath: React.Dispatch<React.SetStateAction<string>>;
    setExpandedRequestPaths: React.Dispatch<React.SetStateAction<Set<string>>>;

    // Case modals
    setCaseRenameModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setCaseRenameCasePath: React.Dispatch<React.SetStateAction<string>>;
    setCaseRenameInput: React.Dispatch<React.SetStateAction<string>>;
    setAddCaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setAddCaseTargetPath: React.Dispatch<React.SetStateAction<string>>;
    setAddCaseNameInput: React.Dispatch<React.SetStateAction<string>>;

    // Rename modal
    setRenameModal: React.Dispatch<React.SetStateAction<boolean>>;
    setRenameType: React.Dispatch<React.SetStateAction<'request' | 'folder'>>;
    setRenamePath: React.Dispatch<React.SetStateAction<string>>;
    setRenameValue: React.Dispatch<React.SetStateAction<string>>;

    // Tree state
    setSelectedFolder: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedKeys: React.Dispatch<React.SetStateAction<string[]>>;
    setSearchKeyword: React.Dispatch<React.SetStateAction<string>>;
    setFilterMethod: React.Dispatch<React.SetStateAction<string>>;
    setCollapsedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
    setDraggingNode: React.Dispatch<React.SetStateAction<{ type: 'request' | 'folder'; path: string } | null>>;
    setDropTargetFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
    setInvalidDropHint: React.Dispatch<React.SetStateAction<{ message: string; x: number; y: number } | null>>;
    setMovedHighlightPath: React.Dispatch<React.SetStateAction<string | null>>;
    setExpandedKeys: React.Dispatch<React.SetStateAction<string[]>>;

    // UI state
    setScriptHelpVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setImporting: React.Dispatch<React.SetStateAction<boolean>>;
    setSearchVersion: React.Dispatch<React.SetStateAction<number>>;
    setForceListAnimation: React.Dispatch<React.SetStateAction<boolean>>;

    // Workspace state helpers
    resetWorkspaceState: () => void;
    captureCurrentWorkspaceState: () => ProjectWorkspaceState;
    applyWorkspaceState: (state: ProjectWorkspaceState) => void;
}

type WorkspaceContextType = WorkspaceState & WorkspaceActions;

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

interface ProjectWorkspaceState {
    requestTabs: RequestTab[];
    activeRequestTab: string;
    currentRequest: CurlRequest | null;
    response: any;
    selectedKeys: string[];
    apiConfig: ApiConfig;
    selectedEnvironmentId: string;
    requestCases: RequestCaseState[];
    activeCaseId: string;
    interfaceApiConfig: ApiConfig;
    requestEditorSurface: RequestEditorSurface;
    sidebarHighlightedCasePath: string;
}

const createDefaultApiConfig = (): ApiConfig => ({
    name: '',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: '',
    bodyType: 'none',
    formData: [],
    urlencoded: [],
    preScripts: [],
    postScripts: [],
});

const createEmptyWorkspaceState = (): ProjectWorkspaceState => ({
    requestTabs: [],
    activeRequestTab: '',
    currentRequest: null,
    response: null,
    selectedKeys: [],
    apiConfig: createDefaultApiConfig(),
    selectedEnvironmentId: '',
    requestCases: [],
    activeCaseId: '',
    interfaceApiConfig: createDefaultApiConfig(),
    requestEditorSurface: 'plain',
    sidebarHighlightedCasePath: ''
});

interface WorkspaceProviderProps {
    children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
    // Request tabs
    const [requestTabs, setRequestTabs] = useState<RequestTab[]>([]);
    const [activeRequestTab, setActiveRequestTab] = useState<string>('');

    // Current request
    const [currentRequest, setCurrentRequest] = useState<CurlRequest | null>(null);

    // Response
    const [response, setResponse] = useState<any>(null);
    const [formattedResponse, setFormattedResponse] = useState<string>('');
    const [responseBodyHeight, setResponseBodyHeight] = useState<number>(200);
    const [scriptResultsHeight, setScriptResultsHeight] = useState<number>(200);
    const [scriptLogsExpanded, setScriptLogsExpanded] = useState(true);
    const [testResultsExpanded, setTestResultsExpanded] = useState(true);

    // Execution
    const [executing, setExecuting] = useState(false);

    // API Config
    const [apiConfig, setApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [interfaceApiConfig, setInterfaceApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [curlPreview, setCurlPreview] = useState<string>('');

    // Request cases
    const [requestCases, setRequestCases] = useState<RequestCaseState[]>([]);
    const [activeCaseId, setActiveCaseId] = useState<string>('');
    const [requestEditorSurface, setRequestEditorSurface] = useState<RequestEditorSurface>('plain');
    const [sidebarHighlightedCasePath, setSidebarHighlightedCasePath] = useState<string>('');
    const [expandedRequestPaths, setExpandedRequestPaths] = useState<Set<string>>(() => new Set());

    // Case modals
    const [caseRenameModalOpen, setCaseRenameModalOpen] = useState(false);
    const [caseRenameCasePath, setCaseRenameCasePath] = useState('');
    const [caseRenameInput, setCaseRenameInput] = useState('');
    const [addCaseModalOpen, setAddCaseModalOpen] = useState(false);
    const [addCaseTargetPath, setAddCaseTargetPath] = useState('');
    const [addCaseNameInput, setAddCaseNameInput] = useState('');

    // Rename modal
    const [renameModal, setRenameModal] = useState(false);
    const [renameType, setRenameType] = useState<'request' | 'folder'>('request');
    const [renamePath, setRenamePath] = useState('');
    const [renameValue, setRenameValue] = useState('');

    // Tree state
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [draggingNode, setDraggingNode] = useState<{ type: 'request' | 'folder'; path: string } | null>(null);
    const [dropTargetFolderPath, setDropTargetFolderPath] = useState<string | null>(null);
    const [invalidDropHint, setInvalidDropHint] = useState<{ message: string; x: number; y: number } | null>(null);
    const [movedHighlightPath, setMovedHighlightPath] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    // UI state
    const [scriptHelpVisible, setScriptHelpVisible] = useState(false);
    const [importing, setImporting] = useState(false);
    const [searchVersion, setSearchVersion] = useState(0);
    const [forceListAnimation, setForceListAnimation] = useState(false);

    // Workspace state helpers
    const resetWorkspaceState = () => {
        const emptyState = createEmptyWorkspaceState();
        setRequestTabs(emptyState.requestTabs);
        setActiveRequestTab(emptyState.activeRequestTab);
        setCurrentRequest(emptyState.currentRequest);
        setResponse(emptyState.response);
        setFormattedResponse('');
        // Note: selectedKeys is managed by ProjectContext
        setApiConfig(emptyState.apiConfig);
        // Note: selectedEnvironmentId is managed by ProjectContext
        setRequestCases(emptyState.requestCases);
        setActiveCaseId(emptyState.activeCaseId);
        setInterfaceApiConfig(emptyState.interfaceApiConfig);
        setRequestEditorSurface(emptyState.requestEditorSurface);
        setSidebarHighlightedCasePath(emptyState.sidebarHighlightedCasePath);
    };

    const captureCurrentWorkspaceState = (): ProjectWorkspaceState => ({
        requestTabs,
        activeRequestTab,
        currentRequest,
        response,
        selectedKeys: [], // Will be managed by ProjectContext
        apiConfig,
        selectedEnvironmentId: '', // Will be managed by ProjectContext
        requestCases,
        activeCaseId,
        interfaceApiConfig,
        requestEditorSurface,
        sidebarHighlightedCasePath
    });

    const applyWorkspaceState = (state: ProjectWorkspaceState) => {
        setRequestTabs(state.requestTabs);
        setActiveRequestTab(state.activeRequestTab);
        setCurrentRequest(state.currentRequest);
        setResponse(state.response);
        setApiConfig(state.apiConfig);
        setRequestCases(state.requestCases || []);
        setActiveCaseId(state.activeCaseId || '');
        setInterfaceApiConfig(state.interfaceApiConfig || createDefaultApiConfig());
        setRequestEditorSurface(state.requestEditorSurface || 'plain');
        setSidebarHighlightedCasePath(state.sidebarHighlightedCasePath || '');
    };

    const value: WorkspaceContextType = {
        // Request tabs
        requestTabs,
        setRequestTabs,
        activeRequestTab,
        setActiveRequestTab,

        // Current request
        currentRequest,
        setCurrentRequest,

        // Response
        response,
        setResponse,
        formattedResponse,
        setFormattedResponse,
        responseBodyHeight,
        setResponseBodyHeight,
        scriptResultsHeight,
        setScriptResultsHeight,
        scriptLogsExpanded,
        setScriptLogsExpanded,
        testResultsExpanded,
        setTestResultsExpanded,

        // Execution
        executing,
        setExecuting,

        // API Config
        apiConfig,
        setApiConfig,
        interfaceApiConfig,
        setInterfaceApiConfig,
        curlPreview,
        setCurlPreview,

        // Request cases
        requestCases,
        setRequestCases,
        activeCaseId,
        setActiveCaseId,
        requestEditorSurface,
        setRequestEditorSurface,
        sidebarHighlightedCasePath,
        setSidebarHighlightedCasePath,
        expandedRequestPaths,
        setExpandedRequestPaths,

        // Case modals
        caseRenameModalOpen,
        setCaseRenameModalOpen,
        caseRenameCasePath,
        setCaseRenameCasePath,
        caseRenameInput,
        setCaseRenameInput,
        addCaseModalOpen,
        setAddCaseModalOpen,
        addCaseTargetPath,
        setAddCaseTargetPath,
        addCaseNameInput,
        setAddCaseNameInput,

        // Rename modal
        renameModal,
        setRenameModal,
        renameType,
        setRenameType,
        renamePath,
        setRenamePath,
        renameValue,
        setRenameValue,

        // Tree state
        selectedFolder,
        setSelectedFolder,
        selectedKeys,
        setSelectedKeys,
        searchKeyword,
        setSearchKeyword,
        filterMethod,
        setFilterMethod,
        collapsedFolders,
        setCollapsedFolders,
        draggingNode,
        setDraggingNode,
        dropTargetFolderPath,
        setDropTargetFolderPath,
        invalidDropHint,
        setInvalidDropHint,
        movedHighlightPath,
        setMovedHighlightPath,
        expandedKeys,
        setExpandedKeys,

        // UI state
        scriptHelpVisible,
        setScriptHelpVisible,
        importing,
        setImporting,
        searchVersion,
        setSearchVersion,
        forceListAnimation,
        setForceListAnimation,

        // Workspace state helpers
        resetWorkspaceState,
        captureCurrentWorkspaceState,
        applyWorkspaceState,
    };

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextType {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
    }
    return context;
}

export default WorkspaceContext;
