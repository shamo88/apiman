import { HomeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Empty, InputRef, message, Modal, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import { AddRequestCase, CopyRequest, CreateFolder, CreateProject, CreateProjectScript, CreateRequest, DeleteFolder, DeleteProject, DeleteRequest, DeleteRequestCase, DuplicateRequestCase, ExecuteHTTPRequestWithScripts, ExecuteHTTPRequestWithProject, GetProjectTree, GetRequest, ImportPostmanCollection, InitProjectsDir, ListProjects, LoadAppConfig, LoadGlobalCookies, PullGitRepo, RenameFolder, RenameProject, RenameRequest, RenameRequestCase, UpdateRequest, UpdateRequestScripts } from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import './App.css';
import { ScriptHelpWindow, TitleBar } from './components/layout';
import { MCPSettingsModal, HistoryModal, CookieModal, AddCaseModal, RenameCaseModal, CreateFolderModal, CreateRequestModal, RenameModal, CreateProjectModal, CreateGroupModal, RenameProjectModal, RenameGroupModal } from './components/modals';
import { AppFooter, EmptyState, EnvironmentPanel, HomePage, ProjectSidebar, ScriptPanel } from './components/home';
import { RequestTabsBar } from './components/sidebar';
import { ResponseViewer } from './components/response';
import { VariableEditableInput, RequestEditor } from './components/request';
import { buildCurlCommand, parseCurlToApiConfig } from './utils/curlUtils';
import { ApiConfig, createDefaultApiConfig, cloneApiConfig, apiConfigFromHttpSpec, toWailsHttpSpec, apiConfigToSpec, apiConfigFromRequest } from './utils/apiConfig';
import {
    Project,
    ProjectTab,
    RequestTab,
    ProjectWorkspaceState,
    ProjectGroupStore,
    RequestCaseState,
    CurlRequest,
    createEmptyWorkspaceState,
    DEFAULT_PROJECT_GROUP,
    parseRequestCaseRef,
    requestRefFromIds,
} from './types';
import { useScriptContext } from './contexts/ScriptContext';
import { useEnvironment } from './hooks/useEnvironment';
import { useMCP } from './hooks/useMCP';
import { useProjects } from './hooks/useProjects';
import { useRequest } from './hooks/useRequest';
import { trimRightSpaces, getPrimaryName } from './utils/misc';

// ProjectTree interface - uses string type to match Wails generated model
interface ProjectTree {
    id: string;
    name: string;
    type: string;
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

function App() {
    const [status, setStatus] = useState('初始化中...');
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [cookieModalVisible, setCookieModalVisible] = useState(false);
    const [cookieInput, setCookieInput] = useState('');
    const [globalCookies, setGlobalCookies] = useState<any[]>([]);
    const [mcpModalVisible, setMCpModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    const {
        projectScripts,
        editingScriptId,
        scriptsLoading,
        scriptSaving,
        scriptHelpVisible,
        setProjectScripts,
        setEditingScriptId,
        setScriptFormName,
        setScriptFormDescription,
        setScriptFormContent,
        setScriptSaving,
        setScriptHelpVisible,
        loadProjectScriptsData,
        selectScript,
    } = useScriptContext();

    // Use environment hook to replace duplicate local state
    const useEnv = useEnvironment();
    const {
        environments,
        selectedEnvironmentId,
        editingEnvironmentId,
        envLoading,
        environmentTabs,
        activeEnvironmentTab,
        loadEnvironmentsData,
        openEnvironmentEditor,
        openCreateEnvironmentTab,
        closeEnvironmentTab,
        setSelectedEnvironmentId,
        setActiveEnvironmentTab,
    } = useEnv;

    const {
        mcpConfig,
        mcpStatus,
        mcpEnvironments,
        loadMCPConfig,
        saveAndApplyMCPConfig,
        loadMCPEnvironments,
        checkMCPStatus,
    } = useMCP();

    const useProjs = useProjects();

    const useReq = useRequest();

    // Destructure state from useReq to replace duplicate local state
    const {
        // Request tabs
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
        importing,
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
        setImporting,
        setSearchVersion,
        setForceListAnimation,
    } = useReq;

    // Use state and functions from useProjects hook
    const {
        loading,
        projects,
        projectTabs,
        activeTab,
        setActiveTab,
        projectTrees,
        setProjectTrees,
        collapsedFolders: projectCollapsedFolders,
        setCollapsedFolders: setProjectCollapsedFolders,
        expandedKeys: projectExpandedKeys,
        setExpandedKeys: setProjectExpandedKeys,
        projectGroups,
        projectGroupAssignments,
        collapsedProjectGroups,
        setCollapsedProjectGroups,
        draggingProjectId,
        projectDropTargetGroup,
        setDraggingProjectId,
        setProjectDropTargetGroup,
        draggingGroupName,
        groupSortDropTarget,
        createGroupModal,
        newGroupName,
        setCreateGroupModal,
        setNewGroupName,
        renameProjectModal,
        renameProjectId,
        renameProjectValue,
        setRenameProjectModal,
        setRenameProjectId,
        setRenameProjectValue,
        renameGroupModal,
        renameGroupValue,
        editingGroupName,
        setRenameGroupModal,
        setRenameGroupValue,
        setEditingGroupName,
        projectSearchKeyword,
        setProjectSearchKeyword,
        projectGroupsLoaded,
        setProjectGroupsLoaded,
        setProjectTabs,
        // Raw setters for group state
        setProjectGroups,
        setProjectGroupAssignments,
        setDraggingGroupName,
        setGroupSortDropTarget,
        // Group operations
        createGroupWithName,
        renameGroupWithName,
        handleAssignProjectGroup,
        toggleProjectGroupCollapse,
        openRenameProjectGroupModal,
        handleDeleteProjectGroup,
        // Drag and drop
        handleGroupDragStart,
        handleGroupDragOver,
        handleGroupDrop,
        // Project operations
        loadProjects,
        handleOpenProject,
        handleCloseProjectTab,
    } = useProjs;

    const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, ProjectWorkspaceState>>({});
    const [animationEnabled, setListAnimationEnabled] = useState(false);
    const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
        // 尝试从 localStorage 读取主题，避免闪烁
        const saved = localStorage.getItem('apiman-theme');
        return saved === 'dark' || saved === 'light' ? saved : 'light';
    });
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
    const forceAnimationTimerRef = React.useRef<number | null>(null);
    const movedHighlightTimerRef = React.useRef<number | null>(null);
    const renameInputRef = React.useRef<InputRef>(null);
    const renameSelectionEndRef = React.useRef<number>(0);

    // Ant Design 的下拉弹层会挂载到 body（portal）。因此需要把主题 class 挂到 html 上，
    // 才能让弹层也吃到深色主题的 CSS 变量与覆盖样式。
    React.useEffect(() => {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('theme-dark', appTheme === 'dark');
    }, [appTheme]);

    const collectFolderKeys = (tree: ProjectTree | null): string[] => {
        if (!tree) return [];
        const keys: string[] = [];

        const walk = (node: ProjectTree) => {
            if (node.type === 'folder') {
                keys.push(node.path || node.id);
            }
            if (node.children) {
                node.children.forEach(walk);
            }
        };

        walk(tree);
        return keys;
    };

    // Derived value: current active project
    const activeProject = projectTabs.find(t => t.id === activeTab)?.project;

    const toggleFolderCollapse = (folderPath: string) => {
        setCollapsedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderPath)) {
                newSet.delete(folderPath);
            } else {
                newSet.add(folderPath);
            }
            return newSet;
        });
    };

    const clearDragState = () => {
        setDraggingNode(null);
        setDropTargetFolderPath(null);
        setInvalidDropHint(null);
    };

    const replacePathPrefix = (path: string, fromPrefix: string, toPrefix: string) => {
        if (path === fromPrefix) return toPrefix;
        const normalizedFrom = fromPrefix.endsWith('/') || fromPrefix.endsWith('\\') ? fromPrefix : fromPrefix + '/';
        if (path.startsWith(normalizedFrom)) {
            return toPrefix + path.slice(fromPrefix.length);
        }
        return path;
    };

    const getChildrenByFolderPath = (folderPath: string): ProjectTree[] => {
        if (!currentTree || !currentTree?.path) return [];
        if (folderPath === currentTree.path) {
            return currentTree.children || [];
        }
        const node = findTreeNode(currentTree, folderPath);
        if (!node || node.type !== 'folder') return [];
        return node.children || [];
    };

    const getNodeByPath = (path: string): ProjectTree | null => {
        if (!currentTree) return null;
        return findTreeNode(currentTree, path);
    };

    const getParentFolderPath = (path: string): string | null => {
        if (!currentTree || !currentTree?.path) return null;

        let foundParent: string | null = null;
        const walk = (node: ProjectTree, parentPath: string) => {
            const nodePath = node.path || node.id;
            if (nodePath === path) {
                foundParent = parentPath;
                return;
            }
            if (!node.children || foundParent) return;

            const nextParent = node.type === 'folder' ? nodePath : parentPath;
            for (const child of node.children) {
                walk(child, nextParent);
                if (foundParent) return;
            }
        };

        walk(currentTree, currentTree.path);
        return foundParent;
    };

    /** 拖入某文件夹（或根）末尾 */
    const checkDropAppendIntoFolder = (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string): { ok: boolean; reason?: string } => {
        if (!currentTree?.path) return { ok: false, reason: 'invalid-target' };
        if (dragNode.path === targetFolderPath) return { ok: false, reason: 'self' };

        if (dragNode.type === 'folder') {
            let p: string | null = targetFolderPath;
            const seen = new Set<string>();
            while (p) {
                if (p === dragNode.path) {
                    return { ok: false, reason: 'child' };
                }
                if (seen.has(p)) break;
                seen.add(p);
                p = getParentFolderPath(p);
            }
        }

        const draggingTreeNode = getNodeByPath(dragNode.path);
        if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

        const targetChildren = getChildrenByFolderPath(targetFolderPath);
        if (dragNode.type === 'request') {
            const conflict = targetChildren.some(
                (child) => child.type === 'request' && child.name === draggingTreeNode.name && child.path !== dragNode.path
            );
            if (conflict) return { ok: false, reason: 'duplicate-request-name' };
        } else {
            const conflict = targetChildren.some(
                (child) => child.type === 'folder' && child.name === draggingTreeNode.name && child.path !== dragNode.path
            );
            if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
        }

        return { ok: true };
    };

    const subtreeContainsId = (folderRefPath: string, needleId: string): boolean => {
        const node = findTreeNode(currentTree, folderRefPath);
        if (!node) return false;
        const walk = (n: ProjectTree): boolean => {
            if (n.id === needleId) return true;
            return (n.children || []).some(walk);
        };
        return walk(node);
    };

    /** 插入到 parentContainerPath 的子列表中，位于 beforeID 之前；beforeID 为空表示末尾 */
    const checkDropOrdered = (
        dragNode: { type: 'request' | 'folder'; path: string },
        parentContainerPath: string,
        beforeID: string
    ): { ok: boolean; reason?: string } => {
        if (!currentTree?.path) return { ok: false, reason: 'invalid-target' };

        const dragParent = getParentFolderPath(dragNode.path);
        if (dragParent === null) return { ok: false, reason: 'missing-source' };

        if (dragNode.type === 'folder' && beforeID) {
            if (subtreeContainsId(dragNode.path, beforeID)) {
                return { ok: false, reason: 'child' };
            }
        }

        const draggingTreeNode = getNodeByPath(dragNode.path);
        if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

        if (dragParent !== parentContainerPath) {
            const targetChildren = getChildrenByFolderPath(parentContainerPath);
            if (dragNode.type === 'request') {
                const conflict = targetChildren.some((c) => c.type === 'request' && c.name === draggingTreeNode.name);
                if (conflict) return { ok: false, reason: 'duplicate-request-name' };
            } else {
                const conflict = targetChildren.some(
                    (c) => c.type === 'folder' && c.name === draggingTreeNode.name && c.path !== dragNode.path
                );
                if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
            }
        }

        return { ok: true };
    };

    const getDropHintMessage = (reason?: string) => {
        const map: Record<string, string> = {
            'self': '不能拖到自己',
            'same-parent': '已在该目录',
            'child': '不能移动到子目录',
            'duplicate-request-name': '同名接口冲突',
            'duplicate-folder-name': '同名文件夹冲突',
            'invalid-target': '目标无效',
            'missing-source': '源节点不存在',
        };
        if (!reason) return '不可放置';
        return map[reason] || '不可放置';
    };

    const markMovedNode = (path: string) => {
        if (movedHighlightTimerRef.current) {
            window.clearTimeout(movedHighlightTimerRef.current);
        }
        setMovedHighlightPath(path);
        movedHighlightTimerRef.current = window.setTimeout(() => {
            setMovedHighlightPath(null);
            movedHighlightTimerRef.current = null;
        }, 2000);
    };

    const resetWorkspaceState = () => {
        const emptyState = createEmptyWorkspaceState();
        setRequestTabs(emptyState.requestTabs);
        setActiveRequestTab(emptyState.activeRequestTab);
        setCurrentRequest(emptyState.currentRequest);
        setResponse(emptyState.response);
        setFormattedResponse('');
        setSelectedKeys(emptyState.selectedKeys);
        setApiConfig(emptyState.apiConfig);
        setSelectedEnvironmentId(emptyState.selectedEnvironmentId);
        setRequestCases(emptyState.requestCases);
        setActiveCaseId(emptyState.activeCaseId);
        setInterfaceApiConfig(emptyState.interfaceApiConfig);
        setRequestEditorSurface(emptyState.requestEditorSurface);
        setSidebarHighlightedCasePath(emptyState.sidebarHighlightedCasePath);
        setExpandedRequestPaths(new Set());
    };

    const captureCurrentWorkspaceState = (): ProjectWorkspaceState => ({
        requestTabs,
        activeRequestTab,
        currentRequest,
        response,
        selectedKeys,
        apiConfig,
        selectedEnvironmentId,
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
        setSelectedKeys(state.selectedKeys);
        setApiConfig(state.apiConfig);
        setSelectedEnvironmentId(state.selectedEnvironmentId || '');
        setRequestCases(state.requestCases || []);
        setActiveCaseId(state.activeCaseId || '');
        setInterfaceApiConfig(state.interfaceApiConfig || createDefaultApiConfig());
        setRequestEditorSurface(state.requestEditorSurface || 'plain');
        setSidebarHighlightedCasePath(state.sidebarHighlightedCasePath || '');
    };

    const handleCreateScript = async () => {
        if (!activeProject?.id) return;
        const scriptName = `脚本${projectScripts.length + 1}`;
        setScriptSaving(true);
        try {
            const created = await CreateProjectScript(activeProject.id, scriptName, '', '// 在这里编写 JavaScript 脚本\n');
            message.success('脚本已创建');
            await loadProjectScriptsData(activeProject.id);
            setEditingScriptId(created.id);
            setScriptFormName(created.name);
            setScriptFormDescription(created.description || '');
            setScriptFormContent(created.content || '');
            setSidebarMenu('scripts');
        } catch (error: any) {
            message.error(`创建脚本失败: ${error?.message || error}`);
        } finally {
            setScriptSaving(false);
        }
    };

    const switchProjectTab = (targetTab: string, skipSaveCurrent: boolean = false) => {
        if (targetTab === activeTab) {
            return;
        }

        if (!skipSaveCurrent && activeTab !== 'home') {
            const currentState = captureCurrentWorkspaceState();
            setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
        }

        setActiveTab(targetTab);
        if (targetTab === 'home') {
            resetWorkspaceState();
            return;
        }

        const targetState = projectWorkspaceStates[targetTab] || createEmptyWorkspaceState();
        applyWorkspaceState(targetState);
    };


    const filterTreeNodes = (tree: ProjectTree | null, keyword: string, method: string): ProjectTree | null => {
        if (!tree) return null;
        const normalizedKeyword = keyword.trim().toLowerCase();
        const noSearchOrMethodFilter = normalizedKeyword === '' && method === 'ALL';

        if (tree.type === 'case') {
            return tree;
        }

        if (tree.type === 'request') {
            const nameLower = (tree.name || '').toLowerCase();
            const urlLower = (tree.url || '').toLowerCase();

            const matchName = normalizedKeyword === '' || nameLower.includes(normalizedKeyword);
            const matchURL = normalizedKeyword === '' || urlLower.includes(normalizedKeyword);
            const matchMethod = method === 'ALL' || tree.method === method;
            const caseChildren = (tree.children || []).filter((c): c is ProjectTree => c.type === 'case');
            const caseNameMatch =
                normalizedKeyword === '' ||
                caseChildren.some((c) => (c.name || '').toLowerCase().includes(normalizedKeyword));

            if ((matchName || matchURL || caseNameMatch) && matchMethod) {
                let nextChildren = tree.children;
                if (normalizedKeyword !== '' && !matchName && !matchURL && caseNameMatch) {
                    nextChildren = caseChildren.filter((c) =>
                        (c.name || '').toLowerCase().includes(normalizedKeyword)
                    );
                }
                return { ...tree, children: nextChildren };
            }
            return null;
        }

        if (tree.type === 'folder') {
            const children = tree.children ?? [];
            const filteredChildren = children
                .map(child => filterTreeNodes(child, keyword, method))
                .filter((child): child is ProjectTree => child !== null);

            // 无搜索/方法筛选时保留空文件夹，否则新建的空目录不会出现在树里
            if (filteredChildren.length > 0 || noSearchOrMethodFilter) {
                return { ...tree, children: filteredChildren };
            }
            return null;
        }

        if (tree.type === 'project') {
            const children = tree.children ?? [];
            const filteredChildren = children
                .map(child => filterTreeNodes(child, keyword, method))
                .filter((child): child is ProjectTree => child !== null);

            return {
                ...tree,
                children: filteredChildren
            };
        }

        return tree;
    };


    useEffect(() => {
        const init = async () => {
            try {
                await InitProjectsDir();
            } catch (e) {
                console.error('Failed to init projects dir:', e);
            }
            loadProjects();
            loadUiConfig();
            loadProjectGroupsState();
            checkMCPStatus();
            loadMCPConfig();
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeProject?.id) {
            setProjectScripts([]);
            setEditingScriptId('');
            setScriptFormName('');
            setScriptFormDescription('');
            setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            return;
        }
        loadProjectScriptsData(activeProject.id);
        loadEnvironmentsData(activeProject.id);
    }, [activeTab, projectTabs, activeProject]);

    useEffect(() => {
        const projectIds = new Set(projects.map(p => p.id));
        setProjectGroupAssignments(prev => {
            let changed = false;
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([projectId, groupName]) => {
                if (projectIds.has(projectId)) {
                    next[projectId] = groupName;
                } else {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [projects]);

    useEffect(() => {
        return () => {
            if (forceAnimationTimerRef.current) {
                window.clearTimeout(forceAnimationTimerRef.current);
            }
            if (movedHighlightTimerRef.current) {
                window.clearTimeout(movedHighlightTimerRef.current);
            }
        };
    }, []);

    const loadUiConfig = async () => {
        try {
            const cfg = await LoadAppConfig() as any;
            setListAnimationEnabled(Boolean(cfg?.ui?.enableListAnimation));
            setAppTheme(cfg?.ui?.theme || 'light');
        } catch (error) {
            console.error('Failed to load UI config:', error);
        }
    };

    const loadProjectGroupsState = async () => {
        try {
            const state = await (window as any).go.main.App.LoadProjectGroupsState() as ProjectGroupStore;
            setProjectGroups(Array.isArray(state?.groups) ? state.groups.filter(Boolean) : []);
            setProjectGroupAssignments(state?.assignments || {});
            setCollapsedProjectGroups(new Set(Array.isArray(state?.collapsedGroups) ? state.collapsedGroups : []));
        } catch (error) {
            console.error('Failed to load project groups state:', error);
        } finally {
            setProjectGroupsLoaded(true);
        }
    };

    useEffect(() => {
        if (!projectGroupsLoaded) return;
        const persist = async () => {
            try {
                await (window as any).go.main.App.SaveProjectGroupsState({
                    groups: projectGroups,
                    assignments: projectGroupAssignments,
                    collapsedGroups: Array.from(collapsedProjectGroups),
                });
            } catch (error) {
                console.error('Failed to save project groups state:', error);
            }
        };
        persist();
    }, [projectGroups, projectGroupAssignments, collapsedProjectGroups, projectGroupsLoaded]);

    // Update curl preview when apiConfig changes
    useEffect(() => {
        setCurlPreview(buildCurlCommand(apiConfig));
    }, [apiConfig.method, apiConfig.url, apiConfig.headers, apiConfig.params, apiConfig.body, apiConfig.bodyType, apiConfig.formData, apiConfig.urlencoded]);

    // Calculate response-body height dynamically
    useEffect(() => {
        const calculateResponseBodyHeight = () => {
            const responsePanel = document.querySelector('.response-panel') as HTMLElement;
            const responseHeader = document.querySelector('.response-panel .response-header') as HTMLElement;
            if (responsePanel && responseHeader) {
                const panelHeight = responsePanel.offsetHeight;
                const headerHeight = responseHeader.offsetHeight;
                const bodyHeight = panelHeight - headerHeight - 40; // 40 = tabs height
                setResponseBodyHeight(Math.max(100, bodyHeight));
            }
        };

        calculateResponseBodyHeight();

        // Recalculate on window resize
        window.addEventListener('resize', calculateResponseBodyHeight);
        return () => window.removeEventListener('resize', calculateResponseBodyHeight);
    }, [response]);

    // Calculate script-results-panel height dynamically
    useEffect(() => {
        const calculateScriptResultsHeight = () => {
            const responsePanel = document.querySelector('.response-panel') as HTMLElement;
            const responseHeader = document.querySelector('.response-panel .response-header') as HTMLElement;
            if (responsePanel && responseHeader) {
                const panelHeight = responsePanel.offsetHeight;
                const headerHeight = responseHeader.offsetHeight;
                const bodyHeight = panelHeight - headerHeight - 40; // 40 = tabs height
                setScriptResultsHeight(Math.max(100, bodyHeight));
            }
        };

        calculateScriptResultsHeight();

        // Recalculate on window resize
        window.addEventListener('resize', calculateScriptResultsHeight);
        return () => window.removeEventListener('resize', calculateScriptResultsHeight);
    }, [useReq.response]);

    const triggerOpenTabAnimation = () => {
        if (forceAnimationTimerRef.current) {
            window.clearTimeout(forceAnimationTimerRef.current);
        }
        setForceListAnimation(true);
        forceAnimationTimerRef.current = window.setTimeout(() => {
            setForceListAnimation(false);
            forceAnimationTimerRef.current = null;
        }, 400);
    };

    const handleImportPostman = async (file: File) => {
        setImporting(true);
        try {
            const text = await file.text();
            const project = await ImportPostmanCollection(text);
            message.success(`成功导入项目: ${project.name}`);
            loadProjects();
        } catch (error: any) {
            console.error('Failed to import Postman collection:', error);
            message.error(`导入失败: ${error?.message || error}`);
        } finally {
            setImporting(false);
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.json',
        showUploadList: false,
        beforeUpload: (file) => {
            handleImportPostman(file);
            return false;
        },
    };

    const createProjectWithName = async (name: string) => {
        try {
            await CreateProject(name);
            message.success('项目创建成功');
            loadProjects();
        } catch (error: any) {
            console.error('Failed to create project:', error);
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const handleDeleteProject = async (projectId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        Modal.confirm({
            title: '删除项目',
            content: '确定要删除这个项目吗？此操作不可恢复。',
            onOk: async () => {
                try {
                    await DeleteProject(projectId);
                    message.success('项目已删除');
                    setProjectTabs(projectTabs.filter(t => t.project.id !== projectId));
                    loadProjects();
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };

    const openRenameProjectModal = (project: Project, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRenameProjectId(project.id);
        setRenameProjectValue(project.name);
        setRenameProjectModal(true);
    };

    const renameProjectWithName = async (name: string) => {
        if (!renameProjectId) return;
        const newName = name.trim();
        if (!newName) return;
        try {
            const renamed = await RenameProject(renameProjectId, newName);
            setProjectTabs(prev => prev.map(tab => (
                tab.project.id === renameProjectId
                    ? { ...tab, title: renamed.name, project: { ...tab.project, name: renamed.name } }
                    : tab
            )));
            message.success('项目重命名成功');
            await loadProjects();
        } catch (error: any) {
            const msg = String(error?.message || error || '');
            if (msg.includes('同名') || msg.includes('已存在')) {
                message.warning('重命名失败：已存在同名项目');
            } else {
                message.error(`重命名失败: ${msg}`);
            }
        }
    };

    const loadGlobalCookies = async () => {
        try {
            const data = await LoadGlobalCookies();
            if (data) {
                setGlobalCookies(JSON.parse(data));
            } else {
                setGlobalCookies([]);
            }
        } catch (err) {
            console.error('Failed to load cookies:', err);
            setGlobalCookies([]);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !activeProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || "";
        try {
            await CreateFolder(activeProject.id, parentPath, newFolderName);
            message.success('文件夹创建成功');
            setCreateFolderModal(false);
            setNewFolderName('');
            const tree = await GetProjectTree(activeProject.id);
            setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));

            // 清除折叠状态以显示新创建的文件夹
            if (!selectedFolder) {
                // 如果是在根目录创建，清除所有折叠状态
                setCollapsedFolders(new Set());
            } else {
                // 如果是在某个文件夹内创建，确保父文件夹展开
                setCollapsedFolders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedFolder);
                    return newSet;
                });
            }
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const findTreeNode = (tree: ProjectTree | null, key: string): ProjectTree | null => {
        if (!tree) return null;
        if ((tree.path || tree.id) === key) return tree;
        if (tree.children) {
            for (const child of tree.children) {
                const found = findTreeNode(child, key);
                if (found) return found;
            }
        }
        return null;
    };

    const moveRequestNode = async (requestPath: string, targetFolderPath: string, beforeID: string = '') => {
        if (!activeProject) return;

        try {
            await useReq.moveRequestNode(requestPath, targetFolderPath, beforeID ?? '', activeProject.id);

            useReq.setRequestTabs(prev => prev.map(tab =>
                tab.path === requestPath ? { ...tab, path: requestPath } : tab
            ));
            if (useReq.currentRequest?.path === requestPath) {
                useReq.setCurrentRequest({ ...useReq.currentRequest, path: requestPath });
            }

            const tree = await GetProjectTree(activeProject.id);
            setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
            useReq.setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(requestPath);
            message.success('接口移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const moveFolderNode = async (folderPath: string, targetFolderPath: string, beforeID: string = '') => {
        if (!activeProject) return;

        try {
            await useReq.moveFolderNode(folderPath, targetFolderPath, beforeID ?? '', activeProject.id);

            useReq.setRequestTabs(prev => prev.map(tab => ({
                ...tab,
                path: replacePathPrefix(tab.path, folderPath, folderPath)
            })));

            if (useReq.currentRequest?.path) {
                const nextPath = replacePathPrefix(useReq.currentRequest.path, folderPath, folderPath);
                if (nextPath !== useReq.currentRequest.path) {
                    useReq.setCurrentRequest({ ...useReq.currentRequest, path: nextPath });
                }
            }

            const tree = await GetProjectTree(activeProject.id);
            setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
            useReq.setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(folderPath);
            message.success('文件夹移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const handleCreateRequest = async () => {
        if (!newRequestName.trim() || !activeProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || "";
        try {
            await CreateRequest(activeProject.id, parentPath, newRequestName, toWailsHttpSpec(createDefaultApiConfig()));
            message.success('请求创建成功');
            setCreateRequestModal(false);
            setNewRequestName('');
            const tree = await GetProjectTree(activeProject.id);
            setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));

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
        }
    };

    const handleTreeItemClick = async (treeNode: ProjectTree) => {
        if (treeNode.type === 'request' && treeNode.path) {
            try {
                setSidebarHighlightedCasePath('');
                const request = await GetRequest(treeNode.path);
                hydrateRequestEditor(request);
                setCurrentRequest(request as CurlRequest);

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
    };

    const applyEnvironmentVariables = (input: string, variables: Record<string, string>): string => {
        if (!input) return input;
        return input.replace(/\{\{(\w+)\}\}/g, (raw, varName: string) => {
            return Object.prototype.hasOwnProperty.call(variables, varName) ? variables[varName] : raw;
        });
    };

    const currentEnvironmentVariables = React.useMemo(() => {
        const env = environments.find(item => item.id === selectedEnvironmentId);
        return env?.variables || {};
    }, [environments, selectedEnvironmentId]);

    const renderVariableAwareInput = (
        value: string,
        onChange: (next: string) => void,
        placeholder: string,
        style?: React.CSSProperties,
        multiline: boolean = false
    ) => <VariableEditableInput value={value} onChange={onChange} placeholder={placeholder} style={style} environmentVariables={currentEnvironmentVariables} multiline={multiline} />;

    const hydrateRequestEditor = (request: any, preferredCaseId?: string) => {
        useReq.hydrateRequestEditor(request, preferredCaseId);

        // Also update App-level state that RequestEditor reads from
        const name = request.name || '';
        const preScripts = request.pre_scripts || [];
        const postScripts = request.post_scripts || [];
        const reqCases = request.cases as any[];
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
    };

    const commitActiveCaseIntoList = (): RequestCaseState[] => {
        if (!currentRequest) return requestCases;
        return requestCases.map((c) =>
            c.id === activeCaseId ? { ...c, config: cloneApiConfig({ ...apiConfig, name: currentRequest.name }) } : c
        );
    };

    const refreshProjectTree = async () => {
        const cp = projectTabs.find((t) => t.id === activeTab)?.project;
        if (!cp) return;
        const tree = await GetProjectTree(cp.id);
        setProjectTrees((prev) => ({ ...prev, [cp.id]: tree }));
    };

    const toggleRequestCasesExpanded = (requestPath: string) => {
        setExpandedRequestPaths((prev) => {
            const next = new Set(prev);
            if (next.has(requestPath)) next.delete(requestPath);
            else next.add(requestPath);
            return next;
        });
    };

    const handleCaseTreeClick = async (caseNode: ProjectTree) => {
        const p = parseRequestCaseRef(caseNode.path || '');
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            const request = await GetRequest(reqPath);
            hydrateRequestEditor(request, p.caseId);
            setCurrentRequest(request as CurlRequest);
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
    };

    const openAddCaseModal = (requestPath: string) => {
        setAddCaseTargetPath(requestPath);
        setAddCaseNameInput('');
        setAddCaseModalOpen(true);
    };

    const confirmAddCaseModal = async (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            message.warning('请输入用例名称');
            return Promise.reject();
        }
        const targetPath = addCaseTargetPath;
        try {
            await AddRequestCase(targetPath, trimmedName);
            message.success('已新增用例');
            setAddCaseModalOpen(false);
            setAddCaseTargetPath('');
            setAddCaseNameInput('');
            setExpandedRequestPaths((prev) => new Set(prev).add(targetPath));
            await refreshProjectTree();
            if (currentRequest?.path === targetPath) {
                const r = await GetRequest(targetPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`新增用例失败: ${error?.message || error}`);
            return Promise.reject();
        }
    };

    const handleDuplicateCaseFromTree = async (casePath: string) => {
        const p = parseRequestCaseRef(casePath);
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            await DuplicateRequestCase(reqPath, p.caseId);
            message.success('已复制用例');
            setExpandedRequestPaths((prev) => new Set(prev).add(reqPath));
            await refreshProjectTree();
            if (currentRequest?.path === reqPath) {
                const r = await GetRequest(reqPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
        }
    };

    const handleDeleteCaseFromTree = (casePath: string) => {
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
                    await refreshProjectTree();
                    if (currentRequest?.path === reqPath) {
                        const r = await GetRequest(reqPath);
                        hydrateRequestEditor(r);
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            },
        });
    };

    const openCaseRenameFromTree = (casePath: string, currentName: string) => {
        setCaseRenameCasePath(casePath);
        setCaseRenameInput(currentName);
        setCaseRenameModalOpen(true);
    };

    const confirmCaseRenameFromTree = async (name: string) => {
        const p = parseRequestCaseRef(caseRenameCasePath);
        if (!p) {
            setCaseRenameModalOpen(false);
            return Promise.reject();
        }
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        const trimmedName = name.trim() || '未命名';
        try {
            await RenameRequestCase(reqPath, p.caseId, trimmedName);
            message.success('用例已重命名');
            setCaseRenameModalOpen(false);
            await refreshProjectTree();
            if (currentRequest?.path === reqPath) {
                setRequestCases((prev) => prev.map((c) => (c.id === p.caseId ? { ...c, name: trimmedName } : c)));
            }
        } catch (error: any) {
            message.error(`重命名失败: ${error?.message || error}`);
        }
    };

    const handleCloseRequestTab = (tabId: string) => {
        setRequestTabs(requestTabs.filter(t => t.id !== tabId));
        if (activeRequestTab === tabId) {
            const remaining = requestTabs.filter(t => t.id !== tabId);
            if (remaining.length > 0) {
                setActiveRequestTab(remaining[0].id);
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
    };

    const loadRequestContent = async (path: string) => {
        try {
            setSidebarHighlightedCasePath('');
            const request = await GetRequest(path);
            hydrateRequestEditor(request);
            setCurrentRequest(request as CurlRequest);
        } catch (error: any) {
            console.error('Failed to load request:', error);
        }
    };

    const handleExecuteCurl = async () => {
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

        const projectId = activeProject?.id || '';
        const projectName = activeProject?.name || '';
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
            setStatus(`请求完成 - ${result.status_code}`);
        } catch (error: any) {
            console.error('Failed to execute request:', error);
            message.error(`执行失败: ${error?.message || error}`);
        } finally {
            setExecuting(false);
        }
    };

    // Environment action wrappers - convert () => void interface for EnvironmentPanel
    const handleCreateEnvironment = () => {
        openCreateEnvironmentTab(projectTabs, activeTab);
    };

    const handleSaveRequest = async () => {
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
            setStatus('请求已保存');

            // 刷新项目树以更新接口列表中的方法显示
            if (activeProject) {
                const tree = await GetProjectTree(activeProject.id);
                setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
            }
        } catch (error: any) {
            message.error(`保存失败: ${error?.message || error}`);
        }
    };

    const handleDeleteRequest = async (path: string) => {
        Modal.confirm({
            title: '删除请求',
            content: '确定要删除这个请求吗？',
            onOk: async () => {
                try {
                    await DeleteRequest(path);
                    message.success('请求已删除');
                    handleCloseRequestTab(requestTabs.find(t => t.path === path)?.id || '');
                    if (activeProject) {
                        const tree = await GetProjectTree(activeProject.id);
                        setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };

    const handleCopyRequest = async (path: string) => {
        try {
            await CopyRequest(path);
            message.success('请求复制成功');
            if (activeProject) {
                const tree = await GetProjectTree(activeProject.id);
                setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
        }
    };

    const openRenameModal = (type: 'request' | 'folder', path: string, currentName: string) => {
        const normalizedName = trimRightSpaces(currentName);
        const primaryName = getPrimaryName(normalizedName);
        setRenameType(type);
        setRenamePath(path);
        setRenameValue(normalizedName);
        renameSelectionEndRef.current = primaryName.length;
        setRenameModal(true);
    };

    const handleRename = async () => {
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

            if (activeProject) {
                const tree = await GetProjectTree(activeProject.id);
                setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
            }
        } catch (error: any) {
            const msg = String(error?.message || error || '');
            if (msg.includes('同名') || msg.includes('已存在')) {
                message.warning(renameType === 'request' ? '重命名失败：同级目录下已存在同名接口' : '重命名失败：同级目录下已存在同名文件夹');
            } else {
                message.error(`重命名失败: ${msg}`);
            }
        }
    };

    useEffect(() => {
        if (!renameModal) return;
        setTimeout(() => {
            const input = renameInputRef.current?.input;
            if (!input) return;
            input.focus();
            const end = Math.max(0, Math.min(renameSelectionEndRef.current, input.value.length));
            input.setSelectionRange(0, end);
        }, 0);
    }, [renameModal]);

    const handleDeleteFolder = async (path: string) => {
        Modal.confirm({
            title: '删除文件夹',
            content: '确定要删除这个文件夹吗？',
            onOk: async () => {
                try {
                    await DeleteFolder(path);
                    message.success('文件夹已删除');
                    if (activeProject) {
                        const tree = await GetProjectTree(activeProject.id);
                        setProjectTrees(prev => ({ ...prev, [activeProject.id]: tree }));
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };


    const currentTree = activeProject ? projectTrees[activeProject.id] : null;
    const tabItems = [
        {
            key: 'home',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <HomeOutlined style={{ marginRight: 0 }} />
                    <span>主页</span>
                </span>
            ),
            closable: false,
        },
        ...projectTabs.map(tab => ({
            key: tab.id,
            label: tab.title,
        }))
    ];

    return (
        <div className={`app-container ${appTheme === 'dark' ? 'theme-dark' : ''}`}>
            <TitleBar
                activeTab={activeTab}
                onListAnimationChange={setListAnimationEnabled}
                onThemeChange={(theme) => {
                    localStorage.setItem('apiman-theme', theme);
                    setAppTheme(theme as 'light' | 'dark');
                }}
                theme={appTheme}
                onSettingsSave={loadProjects}
                onTabChange={(key) => {
                    switchProjectTab(key);
                }}
                onTabEdit={(targetKey, action) => {
                    if (action === 'remove' && targetKey !== 'home') {
                        handleCloseProjectTab(targetKey as string);
                    }
                }}
                tabItems={tabItems}
            />

            <div className="app-content">
                {activeTab === 'home' ? (
                    <HomePage
                        projects={projects as any}
                        loading={loading}
                        searchKeyword={projectSearchKeyword}
                        projectGroups={projectGroups}
                        projectGroupAssignments={projectGroupAssignments}
                        collapsedProjectGroups={collapsedProjectGroups}
                        draggingProjectId={draggingProjectId}
                        projectDropTargetGroup={projectDropTargetGroup}
                        groupSortDropTarget={groupSortDropTarget}
                        draggingGroupName={draggingGroupName}
                        createGroupModal={createGroupModal}
                        createProjectModal={createProjectModal}
                        uploadProps={uploadProps}
                        importing={importing}
                        DEFAULT_PROJECT_GROUP={DEFAULT_PROJECT_GROUP}
                        onSearchChange={setProjectSearchKeyword}
                        onCreateGroup={() => setCreateGroupModal(true)}
                        onCreateProject={() => setCreateProjectModal(true)}
                        onAssignProjectGroup={handleAssignProjectGroup}
                        onToggleGroupCollapse={toggleProjectGroupCollapse}
                        onGroupDragStart={handleGroupDragStart}
                        onGroupDragOver={handleGroupDragOver}
                        onGroupDrop={handleGroupDrop}
                        onDragEnd={() => {
                            setDraggingGroupName(null);
                            setGroupSortDropTarget(null);
                        }}
                        onOpenProject={handleOpenProject}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={(project) => openRenameProjectModal(project)}
                        onCreateGroupWithName={createGroupWithName}
                        onDeleteGroup={handleDeleteProjectGroup}
                        onOpenRenameGroupModal={openRenameProjectGroupModal}
                        onSetDraggingProjectId={setDraggingProjectId}
                        onSetProjectDropTargetGroup={setProjectDropTargetGroup}
                    />
                ) : (
                    <div className="project-workspace">
                        <ProjectSidebar
                            sidebarMenu={sidebarMenu}
                            currentTree={currentTree as any}
                            treeLoading={loading}
                            expandedKeys={expandedKeys}
                            collapsedFolders={collapsedFolders}
                            expandedRequestPaths={expandedRequestPaths}
                            sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                            searchKeyword={searchKeyword}
                            filterMethod={filterMethod}
                            environments={environments}
                            projectScripts={projectScripts}
                            editingEnvironmentId={editingEnvironmentId}
                            editingScriptId={editingScriptId}
                            envLoading={envLoading}
                            scriptsLoading={scriptsLoading}
                            scriptSaving={scriptSaving}
                            draggingNode={draggingNode}
                            dropTargetFolderPath={dropTargetFolderPath}
                            movedHighlightPath={movedHighlightPath}
                            animationEnabled={animationEnabled}
                            forceListAnimation={forceListAnimation}
                            currentRequestPath={currentRequest?.path}
                            onSidebarMenuChange={setSidebarMenu}
                            onCreateFolder={() => setCreateFolderModal(true)}
                            onCreateRequest={() => setCreateRequestModal(true)}
                            onCreateEnvironment={handleCreateEnvironment}
                            onCreateScript={handleCreateScript}
                            onEnvironmentSelect={(env) => openEnvironmentEditor(env)}
                            onScriptSelect={(script) => selectScript(script)}
                            onSearchChange={(v) => { setSearchKeyword(v); setSearchVersion(p => p + 1); }}
                            onMethodChange={setFilterMethod}
                            onToggleExpand={(key) => { setExpandedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); }}
                            onFolderCollapse={toggleFolderCollapse}
                            onItemClick={(key, node) => handleTreeItemClick(node)}
                            onAddRequest={(folderPath) => { setSelectedFolder(folderPath || currentTree?.path || ''); setCreateRequestModal(true); }}
                            onAddFolder={(folderPath) => { setSelectedFolder(folderPath || currentTree?.path || ''); setCreateFolderModal(true); }}
                            onRename={openRenameModal}
                            onDelete={(type, path) => { if (type === 'folder') { handleDeleteFolder(path); } else { handleDeleteRequest(path); } }}
                            onCopy={(path) => handleCopyRequest(path)}
                            onCaseClick={(casePath) => { const node = getNodeByPath(casePath); if (node) handleCaseTreeClick(node); }}
                            onToggleCasesExpanded={toggleRequestCasesExpanded}
                            onAddCase={openAddCaseModal}
                            onDeleteCase={(casePath) => handleDeleteCaseFromTree(casePath)}
                            onDuplicateCase={(casePath) => { const node = getNodeByPath(casePath); if (node) handleDuplicateCaseFromTree(node.path!); }}
                            onRenameCase={(casePath, currentName) => openCaseRenameFromTree(casePath, currentName)}
                            onClearDragState={clearDragState}
                            onSetDraggingNode={setDraggingNode}
                            onSetDropTargetFolderPath={setDropTargetFolderPath}
                            onSetInvalidDropHint={setInvalidDropHint}
                            onCheckDropAppendIntoFolder={checkDropAppendIntoFolder}
                            onCheckDropOrdered={checkDropOrdered}
                            onGetDropHintMessage={getDropHintMessage}
                            onMoveRequestNode={moveRequestNode}
                            onMoveFolderNode={moveFolderNode}
                            onGetParentFolderPath={getParentFolderPath}
                            onGetChildrenByFolderPath={getChildrenByFolderPath as any}
                        />

                        <div className="project-main">
                            {sidebarMenu === 'apis' && requestTabs.length > 0 && (
                                <RequestTabsBar
                                    requestTabs={requestTabs}
                                    activeRequestTab={activeRequestTab}
                                    selectedEnvironmentId={selectedEnvironmentId}
                                    environments={environments}
                                    animationEnabled={animationEnabled || forceListAnimation}
                                    onTabChange={setActiveRequestTab}
                                    onTabClose={handleCloseRequestTab}
                                    onEnvironmentChange={setSelectedEnvironmentId}
                                    loadRequestContent={loadRequestContent}
                                />
                            )}

                            {sidebarMenu === 'environments' ? (
                                <div className="request-panel">
                                    {environmentTabs.length > 0 ? (
                                        <>
                                            <Tabs
                                                activeKey={activeEnvironmentTab}
                                                onChange={(key) => setActiveEnvironmentTab(key)}
                                                type="editable-card"
                                                hideAdd
                                                onEdit={(targetKey, action) => {
                                                    if (action === 'remove') {
                                                        closeEnvironmentTab(targetKey as string);
                                                    }
                                                }}
                                                items={environmentTabs.map(tab => ({
                                                    key: tab.key,
                                                    label: tab.title,
                                                }))}
                                                size="small"
                                                style={{ marginBottom: 12 }}
                                                animated={(animationEnabled || forceListAnimation)}
                                            />
                                            <EnvironmentPanel
                                                projectId={activeProject?.id || ''}
                                            />
                                        </>
                                    ) : (
                                        <Empty description="请先在左侧选择环境，或点击新建" />
                                    )}
                                </div>
                            ) : sidebarMenu === 'scripts' ? (
                                <div className="request-panel">
                                    {editingScriptId ? (
                                        <ScriptPanel
                                            projectId={activeProject?.id || ''}
                                        />
                                    ) : (
                                        <Empty description="请先在左侧选择脚本，或点击新建" />
                                    )}
                                </div>
                            ) : currentRequest ? (
                                <div className="request-response-container">
                                    <RequestEditor
                                        apiConfig={apiConfig}
                                        executing={executing}
                                        requestCases={requestCases}
                                        activeCaseId={activeCaseId}
                                        requestEditorSurface={requestEditorSurface}
                                        curlPreview={curlPreview}
                                        environmentVariables={currentEnvironmentVariables}
                                        projectScripts={projectScripts}
                                        animationEnabled={animationEnabled}
                                        forceListAnimation={forceListAnimation}
                                        onMethodChange={(value) => setApiConfig({ ...apiConfig, method: value })}
                                        onUrlChange={(value) => setApiConfig({ ...apiConfig, url: value })}
                                        onSend={handleExecuteCurl}
                                        onSave={handleSaveRequest}
                                        onConfigChange={setApiConfig}
                                        onCurlPreviewChange={setCurlPreview}
                                        renderVariableAwareInput={renderVariableAwareInput}
                                        parseCurlToApiConfig={parseCurlToApiConfig}
                                    />

                                    {response && (
                                        <ResponseViewer
                                            response={response}
                                            formattedResponse={formattedResponse}
                                            responseBodyHeight={responseBodyHeight}
                                            scriptResultsHeight={scriptResultsHeight}
                                            scriptLogsExpanded={scriptLogsExpanded}
                                            testResultsExpanded={testResultsExpanded}
                                            animationEnabled={animationEnabled}
                                            forceListAnimation={forceListAnimation}
                                            appTheme={appTheme}
                                            onScriptLogsExpand={() => setScriptLogsExpanded(!scriptLogsExpanded)}
                                            onTestResultsExpand={() => setTestResultsExpanded(!testResultsExpanded)}
                                        />
                                    )}
                                </div>
                            ) : (
                                <EmptyState text="选择一个请求开始测试" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {invalidDropHint && (
                <div
                    className="drop-hint-floating"
                    style={{
                        left: invalidDropHint.x,
                        top: invalidDropHint.y,
                    }}
                >
                    {invalidDropHint.message}
                </div>
            )}

            <CreateProjectModal
                visible={createProjectModal}
                onClose={() => setCreateProjectModal(false)}
                onConfirm={createProjectWithName}
                appTheme={appTheme}
            />

            <CreateGroupModal
                visible={createGroupModal}
                onClose={() => setCreateGroupModal(false)}
                onConfirm={createGroupWithName}
            />

            <RenameProjectModal
                visible={renameProjectModal}
                onClose={() => {
                    setRenameProjectModal(false);
                    setRenameProjectId('');
                    setRenameProjectValue('');
                }}
                onConfirm={renameProjectWithName}
                initialValue={renameProjectValue}
            />

            <RenameGroupModal
                visible={renameGroupModal}
                onClose={() => {
                    setRenameGroupModal(false);
                    setEditingGroupName('');
                    setRenameGroupValue('');
                }}
                onConfirm={renameGroupWithName}
                initialValue={renameGroupValue}
            />

            <CreateFolderModal
                visible={createFolderModal}
                onClose={() => { setCreateFolderModal(false); setNewFolderName(''); }}
                onConfirm={handleCreateFolder}
            />

            <CreateRequestModal
                visible={createRequestModal}
                onClose={() => { setCreateRequestModal(false); setNewRequestName(''); }}
                onConfirm={handleCreateRequest}
            />

            <RenameModal
                visible={renameModal}
                onClose={() => { setRenameModal(false); setRenamePath(''); setRenameValue(''); }}
                onConfirm={handleRename}
                title={renameType === 'request' ? '重命名请求' : '重命名文件夹'}
                initialValue={renameValue}
            />

            <AddCaseModal
                visible={addCaseModalOpen}
                onClose={() => {
                    setAddCaseModalOpen(false);
                    setAddCaseTargetPath('');
                    setAddCaseNameInput('');
                }}
                onConfirm={confirmAddCaseModal}
                initialName={addCaseNameInput}
            />

            <RenameCaseModal
                visible={caseRenameModalOpen}
                onClose={() => {
                    setCaseRenameModalOpen(false);
                    setCaseRenameCasePath('');
                    setCaseRenameInput('');
                }}
                onConfirm={confirmCaseRenameFromTree}
                initialName={caseRenameInput}
            />

            <CookieModal
                visible={cookieModalVisible}
                onClose={() => { setCookieModalVisible(false); setCookieInput(''); }}
                appTheme={appTheme}
                cookieInput={cookieInput}
                setCookieInput={setCookieInput}
                globalCookies={globalCookies}
                onLoadCookies={loadGlobalCookies}
            />

            <ScriptHelpWindow
                visible={scriptHelpVisible}
                onClose={() => setScriptHelpVisible(false)}
            />

            <MCPSettingsModal
                visible={mcpModalVisible}
                onClose={() => setMCpModalVisible(false)}
                projects={projects}
                mcpConfig={mcpConfig}
                onSave={saveAndApplyMCPConfig}
                currentStatus={mcpStatus}
                appTheme={appTheme}
                environments={mcpEnvironments}
                onLoadEnvironments={loadMCPEnvironments}
            />

            <HistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                appTheme={appTheme}
            />

            <AppFooter
                mcpStatus={mcpStatus}
                onOpenCookie={() => { setCookieModalVisible(true); loadGlobalCookies(); }}
                onOpenMCP={() => setMCpModalVisible(true)}
                onOpenHistory={() => setHistoryModalVisible(true)}
            />
        </div>
    );
}

export default App;
