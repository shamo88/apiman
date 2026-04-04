import React, { useCallback, useRef, useEffect } from 'react';
import { message, Modal } from 'antd';
import {
    GetRequest,
    UpdateRequest,
    DeleteRequest,
    CopyRequest,
    CreateFolder,
    CreateRequest,
    DeleteFolder,
    RenameFolder,
    RenameRequest,
    MoveFolder,
    MoveRequest,
    ExecuteHTTPRequestWithScripts,
    ExecuteHTTPRequestWithProject,
    GetProjectTree,
    AddRequestCase,
    DeleteRequestCase,
    DuplicateRequestCase,
    RenameRequestCase,
    UpdateRequestScripts,
    PullGitRepo,
} from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import {
    RequestEditorSurface,
    RequestCaseState,
    ProjectWorkspaceState,
    CurlRequest,
    RequestTab,
    ProjectTree,
    Environment,
    parseRequestCaseRef,
    requestRefFromIds,
} from '../types';
import { useWorkspaceContext } from '../contexts/WorkspaceContext';
import { ApiConfig } from '../utils/apiConfig';
import {
    createDefaultApiConfig,
    cloneApiConfig,
    apiConfigFromHttpSpec,
    apiConfigToSpec,
    toWailsHttpSpec,
    containsVariablePlaceholder,
    BodyType,
} from '../utils/apiConfig';

/** 从 apiConfig 生成 curl 命令 */
const buildCurlCommand = (c: ApiConfig): string => {
    const parts: string[] = ['curl'];
    type KeyVal = { key: string; value: string; enabled: boolean };

    // URL with params
    let url = c.url || '';
    const enabledParams = (c.params || []).filter((p: KeyVal) => p.enabled && p.key);
    if (enabledParams.length > 0) {
        const queryParams = enabledParams.map((p: KeyVal) => {
            const encodedKey = encodeURIComponent(p.key);
            // 如果值包含 {{}} 变量，不进行编码
            const encodedValue = containsVariablePlaceholder(p.value) ? p.value : encodeURIComponent(p.value);
            return `${encodedKey}=${encodedValue}`;
        }).join('&');
        url += (url.includes('?') ? '&' : '?') + queryParams;
    }

    // Method
    if (c.method && c.method !== 'GET') {
        parts.push(`-X ${c.method}`);
    }

    // Headers
    const enabledHeaders = (c.headers || []).filter((h: KeyVal) => h.enabled && h.key);
    for (const h of enabledHeaders) {
        parts.push(`-H '${h.key}: ${h.value}'`);
    }

    // Body
    if (c.bodyType === 'json' || c.bodyType === 'raw' || c.bodyType === 'xml') {
        if (c.body) {
            // Add Content-Type if not present
            const hasContentType = enabledHeaders.some((h: KeyVal) => h.key.toLowerCase() === 'content-type');
            if (!hasContentType && c.bodyType === 'json') {
                parts.push("-H 'Content-Type: application/json'");
            } else if (!hasContentType && c.bodyType === 'xml') {
                parts.push("-H 'Content-Type: application/xml'");
            }
            parts.push(`-d '${c.body.replace(/'/g, "'\\''")}'`);
        }
    } else if (c.bodyType === 'form-data') {
        for (const f of (c.formData || []).filter((f: KeyVal) => f.enabled && f.key)) {
            parts.push(`-F '${f.key}=${f.value}'`);
        }
    } else if (c.bodyType === 'x-www-form-urlencoded') {
        const enabledFields = (c.urlencoded || []).filter((f: KeyVal) => f.enabled && f.key);
        if (enabledFields.length > 0) {
            const encoded = enabledFields.map((f: KeyVal) => {
                const encodedKey = encodeURIComponent(f.key);
                // 如果值包含 {{}} 变量，不进行编码
                const encodedValue = containsVariablePlaceholder(f.value) ? f.value : encodeURIComponent(f.value);
                return `${encodedKey}=${encodedValue}`;
            }).join('&');
            if (!enabledHeaders.some((h: KeyVal) => h.key.toLowerCase() === 'content-type')) {
                parts.push("-H 'Content-Type: application/x-www-form-urlencoded'");
            }
            parts.push(`-d '${encoded}'`);
        }
    }

    // URL (quoted if contains special chars)
    if (url) {
        if (url.includes('&') || url.includes('?') || url.includes('=')) {
            parts.push(`'${url}'`);
        } else {
            parts.push(url);
        }
    } else {
        parts.push("'http://example.com/api'");
    }

    return parts.join(' \\\n  ');
};

export interface UseRequestState {
    // Request tabs
    requestTabs: RequestTab[];
    activeRequestTab: string;
    currentRequest: CurlRequest | null;
    response: any;
    formattedResponse: string;
    responseBodyHeight: number;
    scriptResultsHeight: number;
    scriptLogsExpanded: boolean;
    testResultsExpanded: boolean;
    executing: boolean;
    apiConfig: ApiConfig;
    interfaceApiConfig: ApiConfig;
    curlPreview: string;
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
    // Create modals
    createFolderModal: boolean;
    newFolderName: string;
    createRequestModal: boolean;
    newRequestName: string;
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

export interface UseRequestActions {
    // Tab management
    setRequestTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>;
    setActiveRequestTab: React.Dispatch<React.SetStateAction<string>>;
    setCurrentRequest: React.Dispatch<React.SetStateAction<CurlRequest | null>>;
    setResponse: React.Dispatch<React.SetStateAction<any>>;
    setFormattedResponse: React.Dispatch<React.SetStateAction<string>>;
    setResponseBodyHeight: React.Dispatch<React.SetStateAction<number>>;
    setScriptResultsHeight: React.Dispatch<React.SetStateAction<number>>;
    setScriptLogsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setTestResultsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setExecuting: React.Dispatch<React.SetStateAction<boolean>>;
    setApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
    setInterfaceApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
    setCurlPreview: React.Dispatch<React.SetStateAction<string>>;
    setRequestCases: React.Dispatch<React.SetStateAction<RequestCaseState[]>>;
    setActiveCaseId: React.Dispatch<React.SetStateAction<string>>;
    setRequestEditorSurface: React.Dispatch<React.SetStateAction<RequestEditorSurface>>;
    setSidebarHighlightedCasePath: React.Dispatch<React.SetStateAction<string>>;
    setExpandedRequestPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
    // Case modal actions
    setCaseRenameModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setCaseRenameCasePath: React.Dispatch<React.SetStateAction<string>>;
    setCaseRenameInput: React.Dispatch<React.SetStateAction<string>>;
    setAddCaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setAddCaseTargetPath: React.Dispatch<React.SetStateAction<string>>;
    setAddCaseNameInput: React.Dispatch<React.SetStateAction<string>>;
    // Create modal actions
    setCreateFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
    setCreateRequestModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewRequestName: React.Dispatch<React.SetStateAction<string>>;
    // Rename modal actions
    setRenameModal: React.Dispatch<React.SetStateAction<boolean>>;
    setRenameType: React.Dispatch<React.SetStateAction<'request' | 'folder'>>;
    setRenamePath: React.Dispatch<React.SetStateAction<string>>;
    setRenameValue: React.Dispatch<React.SetStateAction<string>>;
    // Tree state actions
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
    // UI state actions
    setScriptHelpVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setImporting: React.Dispatch<React.SetStateAction<boolean>>;
    setSearchVersion: React.Dispatch<React.SetStateAction<number>>;
    setForceListAnimation: React.Dispatch<React.SetStateAction<boolean>>;
    // Request operations
    handleCreateFolder: (projectId: string) => Promise<void>;
    handleCreateRequest: (projectId: string) => Promise<void>;
    handleTreeItemClick: (treeNode: ProjectTree) => Promise<void>;
    loadRequestContent: (path: string) => Promise<void>;
    handleExecuteCurl: (projectId: string, projectName: string, selectedEnvironmentId: string, environments: Environment[]) => Promise<void>;
    handleSaveRequest: (projectId: string) => Promise<void>;
    handleDeleteRequest: (path: string, projectId: string, tabIdToClose?: string) => Promise<void>;
    handleCopyRequest: (path: string, projectId: string) => Promise<void>;
    openRenameModal: (type: 'request' | 'folder', path: string, currentName: string) => void;
    handleRename: () => Promise<void>;
    handleDeleteFolder: (path: string, projectId: string) => Promise<void>;
    refreshProjectTree: (projectId: string) => Promise<void>;
    toggleRequestCasesExpanded: (requestPath: string) => void;
    handleCaseTreeClick: (caseNode: ProjectTree) => Promise<void>;
    openAddCaseModal: (targetPath: string) => void;
    confirmAddCaseModal: (name?: string) => Promise<void>;
    handleDuplicateCaseFromTree: (casePath: string, projectId: string) => Promise<void>;
    handleDeleteCaseFromTree: (casePath: string, projectId: string) => Promise<void>;
    openCaseRenameFromTree: (casePath: string, currentName: string) => void;
    confirmCaseRenameFromTree: () => Promise<void>;
    handleCloseRequestTab: (tabIdToClose?: string) => void;
    moveRequestNode: (requestPath: string, targetFolderPath: string, beforeID: string, projectId: string) => Promise<void>;
    moveFolderNode: (folderPath: string, targetFolderPath: string, beforeID: string, projectId: string) => Promise<void>;
    // Workspace state
    resetWorkspaceState: () => void;
    captureCurrentWorkspaceState: () => ProjectWorkspaceState;
    applyWorkspaceState: (state: ProjectWorkspaceState) => void;
    // Helpers
    hydrateRequestEditor: (request: any, preferredCaseId?: string) => void;
    commitActiveCaseIntoList: () => RequestCaseState[];
    applyEnvironmentVariables: (input: string, variables: Record<string, string>) => string;
    updateCurlPreview: () => void;
}

export type UseRequest = UseRequestState & UseRequestActions;

/** Convert CurlRequest to ApiConfig */
const apiConfigFromRequest = (r: CurlRequest, fallbackName: string): ApiConfig => {
    const bt = (r.body_type || 'none') as BodyType;
    const allowed: BodyType[] = ['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw', 'binary'];
    const bodyType = allowed.includes(bt) ? bt : 'none';
    return {
        name: r.name || fallbackName,
        method: (r.method || 'GET').toUpperCase(),
        url: r.http_url || '',
        headers: Array.isArray(r.headers)
            ? r.headers.map((h) => ({
                key: h.key || '',
                value: h.value || '',
                enabled: h.enabled !== false,
            }))
            : [],
        params: Array.isArray(r.params)
            ? r.params.map((p) => ({
                key: p.key || '',
                value: p.value || '',
                enabled: p.enabled !== false,
            }))
            : [],
        body: r.body || '',
        bodyType,
        formData: Array.isArray(r.form_data)
            ? r.form_data.map((f) => ({
                key: f.key || '',
                value: f.value || '',
                enabled: f.enabled !== false,
            }))
            : [],
        urlencoded: Array.isArray(r.url_encoded)
            ? r.url_encoded.map((u) => ({
                key: u.key || '',
                value: u.value || '',
                enabled: u.enabled !== false,
            }))
            : [],
        preScripts: r.pre_scripts || [],
        postScripts: r.post_scripts || [],
    };
};

export function useRequest(options?: {
    onTreeRefresh?: (projectId: string, tree: any) => void;
}): UseRequest {
    // Tree refresh callback ref
    const treeRefreshCallbackRef = useRef(options?.onTreeRefresh);
    useEffect(() => {
        treeRefreshCallbackRef.current = options?.onTreeRefresh;
    }, [options?.onTreeRefresh]);

    // Use WorkspaceContext for all state
    const {
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

        // Create modals
        createFolderModal,
        setCreateFolderModal,
        newFolderName,
        setNewFolderName,
        createRequestModal,
        setCreateRequestModal,
        newRequestName,
        setNewRequestName,

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

        // Workspace helpers
        resetWorkspaceState,
        captureCurrentWorkspaceState,
        applyWorkspaceState,
    } = useWorkspaceContext();

    // Helper functions
    const applyEnvironmentVariables = useCallback((input: string, variables: Record<string, string>): string => {
        if (!input) return input;
        return input.replace(/\{\{(\w+)\}\}/g, (raw, varName: string) => {
            return Object.prototype.hasOwnProperty.call(variables, varName) ? variables[varName] : raw;
        });
    }, []);

    const updateCurlPreview = useCallback(() => {
        setCurlPreview(buildCurlCommand(apiConfig));
    }, [apiConfig]);

    const hydrateRequestEditor = useCallback((request: any, preferredCaseId?: string) => {
        const name = request.name || '';
        const preScripts = request.pre_scripts || [];
        const postScripts = request.post_scripts || [];
        setCurrentRequest(request as CurlRequest);
        const reqCases = request.cases as models.HttpRequestCase[] | undefined;
        const attachScripts = (cfg: ApiConfig): ApiConfig => ({
            ...cfg,
            preScripts: [...preScripts],
            postScripts: [...postScripts],
        });
        if (reqCases && reqCases.length > 0) {
            const rows: RequestCaseState[] = reqCases.map((c) => ({
                id: c.id,
                name: (c.name || '').trim() || '未命名',
                config: attachScripts({
                    ...apiConfigFromHttpSpec(c.spec, name),
                }),
            }));
            const cr = request as CurlRequest;
            const ifaceSpec = cr.interface_spec;
            const ifaceCfg: ApiConfig = ifaceSpec
                ? attachScripts({ ...apiConfigFromHttpSpec(ifaceSpec as any, name) })
                : attachScripts(apiConfigFromRequest(cr, name));
            setInterfaceApiConfig(ifaceCfg);
            setRequestCases(rows);
            const want = typeof preferredCaseId === 'string' ? preferredCaseId.trim() : '';
            const openAsCase = want !== '' && rows.some((r) => r.id === want);
            if (openAsCase) {
                setActiveCaseId(want);
                const activeRow = rows.find((r) => r.id === want)!;
                setApiConfig({ ...cloneApiConfig(activeRow.config), name });
                setRequestEditorSurface('case');
            } else {
                const resolvedActive = (request.active_case_id as string) || rows[0].id;
                setActiveCaseId(resolvedActive);
                setApiConfig({ ...cloneApiConfig(ifaceCfg), name });
                setRequestEditorSurface('interface');
            }
        } else {
            const cfg = attachScripts(apiConfigFromRequest(request as CurlRequest, name));
            setInterfaceApiConfig(createDefaultApiConfig());
            setRequestCases([]);
            setActiveCaseId('');
            setApiConfig(cfg);
            setRequestEditorSurface('plain');
        }
        setResponse(null);
    }, []);

    const commitActiveCaseIntoList = useCallback((): RequestCaseState[] => {
        if (!currentRequest) return requestCases;
        return requestCases.map((c) =>
            c.id === activeCaseId ? { ...c, config: cloneApiConfig({ ...apiConfig, name: currentRequest.name }) } : c
        );
    }, [currentRequest, requestCases, activeCaseId, apiConfig]);

    const refreshProjectTree = useCallback(async (projectId: string) => {
        const tree = await GetProjectTree(projectId);
        if (treeRefreshCallbackRef.current) {
            treeRefreshCallbackRef.current(projectId, tree);
        }
    }, []);

    const handleCreateFolder = useCallback(async (projectId: string) => {
        if (!newFolderName.trim()) {
            message.warning('请输入文件夹名称');
            return;
        }

        const parentPath = selectedFolder || '';
        try {
            await CreateFolder(projectId, parentPath, newFolderName);
            message.success('文件夹创建成功');
            setCreateFolderModal(false);
            setNewFolderName('');
            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }

            // 清除折叠状态以显示新创建的文件夹
            if (!selectedFolder) {
                setCollapsedFolders(new Set());
            } else {
                setCollapsedFolders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedFolder);
                    return newSet;
                });
            }
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
            throw error;
        }
    }, [newFolderName, selectedFolder]);

    const handleCreateRequest = useCallback(async (projectId: string) => {
        if (!newRequestName.trim()) {
            message.warning('请输入请求名称');
            return;
        }

        const parentPath = selectedFolder || '';
        try {
            await CreateRequest(projectId, parentPath, newRequestName, toWailsHttpSpec(createDefaultApiConfig()));
            message.success('请求创建成功');
            setCreateRequestModal(false);
            setNewRequestName('');
            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }

            // 清除折叠状态以显示新创建的请求
            if (!selectedFolder) {
                setCollapsedFolders(new Set());
            } else {
                setCollapsedFolders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedFolder);
                    return newSet;
                });
            }
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
            throw error;
        }
    }, [newRequestName, selectedFolder]);

    const handleTreeItemClick = useCallback(async (treeNode: ProjectTree) => {
        if (treeNode.type === 'request' && treeNode.path) {
            try {
                setSidebarHighlightedCasePath('');
                const request = await GetRequest(treeNode.path);
                hydrateRequestEditor(request);

                const existingTab = requestTabs.find(t => t.path === treeNode.path);
                if (existingTab) {
                    setActiveRequestTab(existingTab.id);
                } else {
                    const newTab: RequestTab = {
                        id: `request-${Date.now()}`,
                        title: request.name || treeNode.name.replace(/\.curl$/i, ''),
                        path: treeNode.path,
                    };
                    setRequestTabs([...requestTabs, newTab]);
                    setActiveRequestTab(newTab.id);
                }
            } catch (error: any) {
                console.error('Failed to load request:', error);
                message.error('加载请求失败');
            }
        }
    }, [requestTabs, hydrateRequestEditor]);

    const loadRequestContent = useCallback(async (path: string) => {
        try {
            setSidebarHighlightedCasePath('');
            const request = await GetRequest(path);
            hydrateRequestEditor(request);
        } catch (error: any) {
            console.error('Failed to load request:', error);
            message.error('加载请求失败');
        }
    }, [hydrateRequestEditor]);

    const handleExecuteCurl = useCallback(async (
        projectId: string,
        projectName: string,
        selectedEnvironmentId: string,
        environments: Environment[]
    ) => {
        const selectedEnvironment = environments.find(env => env.id === selectedEnvironmentId);
        const variables = selectedEnvironment?.variables || {};
        const resolvedConfig: ApiConfig = {
            ...apiConfig,
            url: applyEnvironmentVariables(apiConfig.url, variables),
            headers: apiConfig.headers.map(header => ({
                ...header,
                key: applyEnvironmentVariables(header.key, variables),
                value: applyEnvironmentVariables(header.value, variables),
            })),
            params: apiConfig.params.map(param => ({
                ...param,
                key: applyEnvironmentVariables(param.key, variables),
                value: applyEnvironmentVariables(param.value, variables),
            })),
            body: applyEnvironmentVariables(apiConfig.body, variables),
            formData: apiConfig.formData.map(item => ({
                ...item,
                key: applyEnvironmentVariables(item.key, variables),
                value: applyEnvironmentVariables(item.value, variables),
            })),
            urlencoded: apiConfig.urlencoded.map(item => ({
                ...item,
                key: applyEnvironmentVariables(item.key, variables),
                value: applyEnvironmentVariables(item.value, variables),
            })),
        };

        if (!apiConfig.url?.trim()) {
            message.warning('请输入 URL');
            return;
        }

        const requestName = currentRequest?.name || '';
        const requestPath = currentRequest?.path || '';

        setExecuting(true);
        setResponse(null);
        try {
            let result;
            if (projectId && (apiConfig.preScripts.length > 0 || apiConfig.postScripts.length > 0)) {
                result = await ExecuteHTTPRequestWithScripts(
                    projectId,
                    projectName,
                    requestName,
                    requestPath,
                    selectedEnvironmentId,
                    toWailsHttpSpec(resolvedConfig),
                    apiConfig.preScripts,
                    apiConfig.postScripts
                );
            } else {
                result = await ExecuteHTTPRequestWithProject(
                    projectId,
                    projectName,
                    requestName,
                    requestPath,
                    toWailsHttpSpec(resolvedConfig)
                );
            }
            setResponse(result);
            // 格式化响应体
            try {
                if (result.body) {
                    const parsed = JSON.parse(result.body);
                    setFormattedResponse(JSON.stringify(parsed, null, 2));
                } else {
                    setFormattedResponse('');
                }
            } catch {
                setFormattedResponse(result.body || '');
            }
        } catch (error: any) {
            console.error('Failed to execute request:', error);
            message.error(`执行失败: ${error?.message || error}`);
        } finally {
            setExecuting(false);
        }
    }, [apiConfig, currentRequest, applyEnvironmentVariables]);

    const handleSaveRequest = useCallback(async (projectId: string) => {
        if (!currentRequest?.path) return;

        try {
            // 保存前先 pull 最新代码
            await PullGitRepo();

            if (requestCases.length === 0) {
                await UpdateRequest(
                    currentRequest.path,
                    toWailsHttpSpec({ ...apiConfig, name: currentRequest.name }),
                    null as any,
                    ''
                );
            } else {
                const committed =
                    requestEditorSurface === 'case' ? commitActiveCaseIntoList() : requestCases;
                setRequestCases(committed);
                const ifaceSource =
                    requestEditorSurface === 'interface' ? apiConfig : interfaceApiConfig;
                const wailsCases = committed.map((c) =>
                    models.HttpRequestCase.createFrom({
                        id: c.id,
                        name: (c.name || '').trim() || '未命名',
                        spec: models.HttpRequestSpec.createFrom(
                            apiConfigToSpec({ ...c.config, name: currentRequest.name })
                        ),
                    })
                );
                await UpdateRequest(
                    currentRequest.path,
                    toWailsHttpSpec({ ...ifaceSource, name: currentRequest.name }),
                    wailsCases,
                    activeCaseId
                );
                if (requestEditorSurface === 'interface') {
                    setInterfaceApiConfig(cloneApiConfig({ ...apiConfig, name: currentRequest.name }));
                }
            }
            await UpdateRequestScripts(currentRequest.path, apiConfig.preScripts, apiConfig.postScripts);
            message.success('请求已保存');

            // 刷新项目树以更新接口列表中的方法显示
            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }
        } catch (error: any) {
            message.error(`保存失败: ${error?.message || error}`);
            throw error;
        }
    }, [currentRequest, apiConfig, requestCases, activeCaseId, requestEditorSurface, interfaceApiConfig, commitActiveCaseIntoList]);

    const handleDeleteRequest = useCallback(async (path: string, projectId: string, tabIdToClose?: string) => {
        Modal.confirm({
            title: '删除请求',
            content: '确定要删除这个请求吗？',
            onOk: async () => {
                try {
                    await DeleteRequest(path);
                    message.success('请求已删除');
                    handleCloseRequestTab(tabIdToClose);
                    const tree = await GetProjectTree(projectId);
                    if (treeRefreshCallbackRef.current) {
                        treeRefreshCallbackRef.current(projectId, tree);
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                    throw error;
                }
            }
        });
    }, []);

    const handleCopyRequest = useCallback(async (path: string, projectId: string) => {
        try {
            await CopyRequest(path);
            message.success('请求复制成功');
            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
            throw error;
        }
    }, []);

    const openRenameModal = useCallback((type: 'request' | 'folder', path: string, currentName: string) => {
        const normalizedName = currentName.replace(/\s+$/g, '');
        const primaryName = normalizedName.replace(/-副本\d*$/u, '');
        setRenameType(type);
        setRenamePath(path);
        setRenameValue(normalizedName);
        setRenameModal(true);
    }, []);

    const handleRename = useCallback(async () => {
        const newName = renameValue.trim();
        if (!newName) {
            message.warning('请输入名称');
            return;
        }

        try {
            if (renameType === 'request') {
                const renamed = await RenameRequest(renamePath, newName);

                setRequestTabs(prev => prev.map(tab => tab.path === renamePath
                    ? { ...tab, path: renamed.path, title: renamed.name }
                    : tab));

                if (currentRequest?.path === renamePath) {
                    setCurrentRequest({ ...currentRequest, path: renamed.path, name: renamed.name });
                    setApiConfig({ ...apiConfig, name: renamed.name });
                    setInterfaceApiConfig((prev) => ({ ...prev, name: renamed.name }));
                    setRequestCases((prev) =>
                        prev.map((c) => ({ ...c, config: { ...c.config, name: renamed.name } }))
                    );
                }
            } else {
                await RenameFolder(renamePath, newName);
            }

            message.success('重命名成功');
            setRenameModal(false);
        } catch (error: any) {
            const msg = String(error?.message || error || '');
            if (msg.includes('同名') || msg.includes('已存在')) {
                message.warning(renameType === 'request' ? '重命名失败：同级目录下已存在同名接口' : '重命名失败：同级目录下已存在同名文件夹');
            } else {
                message.error(`重命名失败: ${msg}`);
            }
        }
    }, [renameValue, renameType, renamePath, currentRequest, apiConfig]);

    const handleDeleteFolder = useCallback(async (path: string, projectId: string) => {
        Modal.confirm({
            title: '删除文件夹',
            content: '确定要删除这个文件夹吗？',
            onOk: async () => {
                try {
                    await DeleteFolder(path);
                    message.success('文件夹已删除');
                    const tree = await GetProjectTree(projectId);
                    if (treeRefreshCallbackRef.current) {
                        treeRefreshCallbackRef.current(projectId, tree);
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                    throw error;
                }
            }
        });
    }, []);

    const toggleRequestCasesExpanded = useCallback((requestPath: string) => {
        setExpandedRequestPaths((prev) => {
            const next = new Set(prev);
            if (next.has(requestPath)) next.delete(requestPath);
            else next.add(requestPath);
            return next;
        });
    }, []);

    const handleCaseTreeClick = useCallback(async (caseNode: ProjectTree) => {
        const p = parseRequestCaseRef(caseNode.path || '');
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            const request = await GetRequest(reqPath);
            hydrateRequestEditor(request, p.caseId);
            setSidebarHighlightedCasePath(caseNode.path || '');
            const existingTab = requestTabs.find((t) => t.path === reqPath);
            if (existingTab) {
                setActiveRequestTab(existingTab.id);
            } else {
                const newTab: RequestTab = {
                    id: `request-${Date.now()}`,
                    title: request.name || caseNode.name,
                    path: reqPath,
                };
                setRequestTabs([...requestTabs, newTab]);
                setActiveRequestTab(newTab.id);
            }
        } catch (error: any) {
            console.error('Failed to load case:', error);
            message.error('加载用例失败');
        }
    }, [requestTabs, hydrateRequestEditor]);

    const openAddCaseModal = useCallback((requestPath: string) => {
        setAddCaseTargetPath(requestPath);
        setAddCaseNameInput('');
        setAddCaseModalOpen(true);
    }, []);

    const confirmAddCaseModal = useCallback(async (name?: string) => {
        const trimmedName = (name !== undefined ? name : addCaseNameInput).trim();
        if (!trimmedName) {
            message.warning('请输入用例名称');
            return;
        }
        const targetPath = addCaseTargetPath;
        try {
            await AddRequestCase(targetPath, trimmedName);
            message.success('已新增用例');
            setAddCaseModalOpen(false);
            setAddCaseTargetPath('');
            setAddCaseNameInput('');
            setExpandedRequestPaths((prev) => new Set(prev).add(targetPath));
            await refreshProjectTree(targetPath);
            if (currentRequest?.path === targetPath) {
                const r = await GetRequest(targetPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`新增用例失败: ${error?.message || error}`);
            throw error;
        }
    }, [addCaseNameInput, addCaseTargetPath, currentRequest, refreshProjectTree, hydrateRequestEditor]);

    const handleDuplicateCaseFromTree = useCallback(async (casePath: string, projectId: string) => {
        const p = parseRequestCaseRef(casePath);
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            await DuplicateRequestCase(reqPath, p.caseId);
            message.success('已复制用例');
            setExpandedRequestPaths((prev) => new Set(prev).add(reqPath));
            await refreshProjectTree(projectId);
            if (currentRequest?.path === reqPath) {
                const r = await GetRequest(reqPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
            throw error;
        }
    }, [currentRequest, refreshProjectTree, hydrateRequestEditor]);

    const handleDeleteCaseFromTree = useCallback(async (casePath: string, projectId: string) => {
        const p = parseRequestCaseRef(casePath);
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        Modal.confirm({
            title: '删除用例',
            content: '确定删除该用例吗？',
            onOk: async () => {
                try {
                    await DeleteRequestCase(reqPath, p.caseId);
                    message.success('用例已删除');
                    await refreshProjectTree(projectId);
                    if (currentRequest?.path === reqPath) {
                        const r = await GetRequest(reqPath);
                        hydrateRequestEditor(r);
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                    throw error;
                }
            },
        });
    }, [currentRequest, refreshProjectTree, hydrateRequestEditor]);

    const openCaseRenameFromTree = useCallback((casePath: string, currentName: string) => {
        setCaseRenameCasePath(casePath);
        setCaseRenameInput(currentName);
        setCaseRenameModalOpen(true);
    }, []);

    const confirmCaseRenameFromTree = useCallback(async () => {
        const p = parseRequestCaseRef(caseRenameCasePath);
        if (!p) {
            setCaseRenameModalOpen(false);
            return;
        }
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        const trimmedName = caseRenameInput.trim() || '未命名';
        try {
            await RenameRequestCase(reqPath, p.caseId, trimmedName);
            message.success('用例已重命名');
            setCaseRenameModalOpen(false);
            await refreshProjectTree(p.projectId);
            if (currentRequest?.path === reqPath) {
                setRequestCases((prev) => prev.map((c) => (c.id === p.caseId ? { ...c, name: trimmedName } : c)));
            }
        } catch (error: any) {
            message.error(`重命名失败: ${error?.message || error}`);
            throw error;
        }
    }, [caseRenameCasePath, caseRenameInput, currentRequest, refreshProjectTree]);

    const handleCloseRequestTab = useCallback((tabIdToClose?: string) => {
        const targetTabId = tabIdToClose || activeRequestTab;
        setRequestTabs(prev => {
            const remaining = prev.filter(t => t.id !== targetTabId);
            if (targetTabId && prev.length > 0) {
                const newActive = remaining.length > 0 ? remaining[remaining.length - 1].id : '';
                if (newActive) {
                    setActiveRequestTab(newActive);
                    const lastRequest = remaining[remaining.length - 1];
                    loadRequestContent(lastRequest.path);
                } else {
                    setActiveRequestTab('');
                    setCurrentRequest(null);
                    setResponse(null);
                    setRequestCases([]);
                    setActiveCaseId('');
                    setInterfaceApiConfig(createDefaultApiConfig());
                    setRequestEditorSurface('plain');
                    setSidebarHighlightedCasePath('');
                    setApiConfig(createDefaultApiConfig());
                }
            }
            return remaining;
        });
    }, [activeRequestTab, loadRequestContent]);

    const moveRequestNode = useCallback(async (
        requestPath: string,
        targetFolderPath: string,
        beforeID: string,
        projectId: string
    ) => {
        try {
            const newRequestPath = await MoveRequest(requestPath, targetFolderPath, beforeID || '');

            setRequestTabs(prev => prev.map(tab =>
                tab.path === requestPath ? { ...tab, path: newRequestPath } : tab
            ));
            if (currentRequest?.path === requestPath) {
                setCurrentRequest({ ...currentRequest, path: newRequestPath });
            }

            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            setMovedHighlightPath(newRequestPath);
            message.success('接口移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
            throw error;
        }
    }, [currentRequest]);

    const moveFolderNode = useCallback(async (
        folderPath: string,
        targetFolderPath: string,
        beforeID: string,
        projectId: string
    ) => {
        try {
            const newFolderPath = await MoveFolder(folderPath, targetFolderPath, beforeID || '');

            setRequestTabs(prev => prev.map(tab => ({
                ...tab,
                path: tab.path.startsWith(folderPath)
                    ? newFolderPath + tab.path.slice(folderPath.length)
                    : tab.path
            })));

            if (currentRequest?.path) {
                const nextPath = currentRequest.path.startsWith(folderPath)
                    ? newFolderPath + currentRequest.path.slice(folderPath.length)
                    : currentRequest.path;
                if (nextPath !== currentRequest.path) {
                    setCurrentRequest({ ...currentRequest, path: nextPath });
                }
            }

            const tree = await GetProjectTree(projectId);
            if (treeRefreshCallbackRef.current) {
                treeRefreshCallbackRef.current(projectId, tree);
            }
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            setMovedHighlightPath(newFolderPath);
            message.success('文件夹移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
            throw error;
        }
    }, [currentRequest]);

    return {
        // State
        requestTabs,
        activeRequestTab,
        currentRequest,
        response,
        formattedResponse,
        responseBodyHeight,
        scriptResultsHeight,
        scriptLogsExpanded,
        testResultsExpanded,
        executing,
        apiConfig,
        interfaceApiConfig,
        curlPreview,
        requestCases,
        activeCaseId,
        requestEditorSurface,
        sidebarHighlightedCasePath,
        expandedRequestPaths,
        caseRenameModalOpen,
        caseRenameCasePath,
        caseRenameInput,
        addCaseModalOpen,
        addCaseTargetPath,
        addCaseNameInput,
        createFolderModal,
        newFolderName,
        createRequestModal,
        newRequestName,
        renameModal,
        renameType,
        renamePath,
        renameValue,
        selectedFolder,
        selectedKeys,
        searchKeyword,
        filterMethod,
        collapsedFolders,
        draggingNode,
        dropTargetFolderPath,
        invalidDropHint,
        movedHighlightPath,
        expandedKeys,

        // UI state
        scriptHelpVisible,
        importing,
        searchVersion,
        forceListAnimation,

        // Setters
        setRequestTabs,
        setActiveRequestTab,
        setCurrentRequest,
        setResponse,
        setFormattedResponse,
        setResponseBodyHeight,
        setScriptResultsHeight,
        setScriptLogsExpanded,
        setTestResultsExpanded,
        setExecuting,
        setApiConfig,
        setInterfaceApiConfig,
        setCurlPreview,
        setRequestCases,
        setActiveCaseId,
        setRequestEditorSurface,
        setSidebarHighlightedCasePath,
        setExpandedRequestPaths,
        setCaseRenameModalOpen,
        setCaseRenameCasePath,
        setCaseRenameInput,
        setAddCaseModalOpen,
        setAddCaseTargetPath,
        setAddCaseNameInput,
        setCreateFolderModal,
        setNewFolderName,
        setCreateRequestModal,
        setNewRequestName,
        setRenameModal,
        setRenameType,
        setRenamePath,
        setRenameValue,
        setSelectedFolder,
        setSelectedKeys,
        setSearchKeyword,
        setFilterMethod,
        setCollapsedFolders,
        setDraggingNode,
        setDropTargetFolderPath,
        setInvalidDropHint,
        setMovedHighlightPath,
        setExpandedKeys,

        // UI state setters
        setScriptHelpVisible,
        setImporting,
        setSearchVersion,
        setForceListAnimation,

        // Actions
        handleCreateFolder,
        handleCreateRequest,
        handleTreeItemClick,
        loadRequestContent,
        handleExecuteCurl,
        handleSaveRequest,
        handleDeleteRequest,
        handleCopyRequest,
        openRenameModal,
        handleRename,
        handleDeleteFolder,
        refreshProjectTree,
        toggleRequestCasesExpanded,
        handleCaseTreeClick,
        openAddCaseModal,
        confirmAddCaseModal,
        handleDuplicateCaseFromTree,
        handleDeleteCaseFromTree,
        openCaseRenameFromTree,
        confirmCaseRenameFromTree,
        handleCloseRequestTab,
        moveRequestNode,
        moveFolderNode,
        resetWorkspaceState,
        captureCurrentWorkspaceState,
        applyWorkspaceState,
        hydrateRequestEditor,
        commitActiveCaseIntoList,
        applyEnvironmentVariables,
        updateCurlPreview,
    };
}
