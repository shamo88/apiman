import { CloseOutlined, CopyOutlined, DownOutlined, EditOutlined, FileOutlined, FolderOutlined, HomeOutlined, ImportOutlined, MoreOutlined, PlusOutlined, ProjectOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Button, Col, Divider, Dropdown, Empty, Input, InputRef, message, Modal, Row, Select, Tabs, Tooltip, Upload } from 'antd';
import React, { useEffect, useState } from 'react';
import { AddGlobalCookies, AddRequestCase, CopyRequest, CreateEnvironment, CreateFolder, CreateProject, CreateProjectScript, CreateRequest, DeleteEnvironment, DeleteFolder, DeleteGlobalCookie, DeleteProject, DeleteProjectScript, DeleteRequest, DeleteRequestCase, DuplicateRequestCase, ExecuteHTTPRequest, ExecuteHTTPRequestWithScripts, ExecuteHTTPRequestWithProject, GetProjectTree, GetRequest, ImportPostmanCollection, InitProjectsDir, ListProjects, ListProjectScripts, LoadAppConfig, LoadEnvironments, LoadGlobalCookies, MoveFolder, MoveRequest, PullGitRepo, RenameFolder, RenameProject, RenameRequest, RenameRequestCase, SaveAppConfig, SaveGlobalCookies, UpdateEnvironment, UpdateProjectScript, UpdateRequest, UpdateRequestScripts, LoadMCPConfig, SaveMCPConfig, StartMCP, StopMCP, GetMCPStatus, ListHistory, GetHistoryEntry, DeleteHistory, ClearHistory, SearchHistory } from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import './App.css';
import { ScriptHelpWindow, TitleBar } from './components/layout';
import { MCPSettingsModal, HistoryModal, CookieModal, AddCaseModal, RenameCaseModal, CreateFolderModal, CreateRequestModal, RenameModal, CreateProjectModal, CreateGroupModal, RenameProjectModal, RenameGroupModal } from './components/modals';
import { AppFooter, EmptyState, EnvironmentVarEditor, EnvironmentPanel, HomePage, ProjectSearchBar, ProjectSidebar, ScriptPanel } from './components/home';
import { SidebarMenuHeader, RequestTabsBar, ApiListFilters, SidebarList } from './components/sidebar';
import { ResponseCookies, ResponseHeaders, ResponseStatus, ResponseBodyViewer, ResponseViewer, ScriptResultsPanel } from './components/response';
import { MethodSelector, BodyTypeSelector, ScriptEditor, ScriptBindingList, KeyValueEditor, ApiRequestBar, VariableEditableInput, RequestEditor } from './components/request';
import { buildCurlCommand, parseCurlToApiConfig } from './utils/curlUtils';
import { escapeHtml, getCaretOffset, setCaretOffset, renderHighlightedVariableHtml, isBuiltInGenerator, builtInGenerators, getVariableSuggestions } from './utils/variableUtils';
import { ApiConfig, createDefaultApiConfig, cloneApiConfig, apiConfigFromHttpSpec, toWailsHttpSpec, apiConfigToSpec, containsVariablePlaceholder, apiConfigFromRequest } from './utils/apiConfig';
import { createEmptyWorkspaceState, CurlRequest } from './types';
import { getMethodColor, formatSidebarMethodLabel, trimRightSpaces, getPrimaryName } from './utils/misc';

interface Project {
    id: string;
    name: string;
}

interface ProjectTree {
    id: string;
    name: string;
    type: string;
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

const parseRequestCaseRef = (path: string): { projectId: string; requestId: string; caseId: string } | null => {
    if (!path.startsWith('requestCase|')) return null;
    const parts = path.slice('requestCase|'.length).split('|');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return { projectId: parts[0], requestId: parts[1], caseId: parts[2] };
};

const requestRefFromIds = (projectId: string, requestId: string) => `request|${projectId}|${requestId}`;

/** plain：无子用例；interface：编辑集合根请求；case：编辑某一用例 */
type RequestEditorSurface = 'plain' | 'interface' | 'case';

interface RequestCaseState {
    id: string;
    name: string;
    config: ApiConfig;
}

interface ProjectTab {
    id: string;
    title: string;
    project: Project;
}

interface RequestTab {
    id: string;
    title: string;
    path: string;
}

interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
    created_at: string;
    updated_at: string;
}

interface EnvironmentVariableRow {
    id: string;
    key: string;
    value: string;
}

interface EnvironmentEditorTab {
    key: string;
    title: string;
    environmentId?: string;
    isNew?: boolean;
}

interface ProjectScript {
    id: string;
    project_id: string;
    name: string;
    description: string;
    path: string;
    content: string;
}


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
    /** 侧栏用例高亮：仅用户点击用例行时设置；点击接口行或切换请求标签时清空 */
    sidebarHighlightedCasePath: string;
}

interface ProjectGroupStore {
    groups: string[];
    assignments: Record<string, string>;
    collapsedGroups?: string[];
}


const createEnvironmentVariableRow = (key: string = '', value: string = ''): EnvironmentVariableRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value
});

const DEFAULT_PROJECT_GROUP = '未分组';

function App() {
    const [status, setStatus] = useState('初始化中...');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [cookieModalVisible, setCookieModalVisible] = useState(false);
    const [cookieInput, setCookieInput] = useState('');
    const [globalCookies, setGlobalCookies] = useState<any[]>([]);
    const [mcpModalVisible, setMCpModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historyDetail, setHistoryDetail] = useState<any | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearchProject, setHistorySearchProject] = useState('');
    const [historySearchName, setHistorySearchName] = useState('');
    const [historySearchURL, setHistorySearchURL] = useState('');
    const [historySearchMethod, setHistorySearchMethod] = useState('');
    const [historySearchStatus, setHistorySearchStatus] = useState('');
    const [historySearchSource, setHistorySearchSource] = useState('');

    // Build search params from individual fields
    const buildHistorySearchParams = (): any => {
        const params: any = {};
        if (historySearchProject) params.project = historySearchProject;
        if (historySearchName) params.name = historySearchName;
        if (historySearchURL) params.url = historySearchURL;
        if (historySearchMethod) params.method = historySearchMethod.toUpperCase();
        if (historySearchStatus) params.status = parseInt(historySearchStatus, 10) || 0;
        if (historySearchSource) params.source = historySearchSource.toUpperCase();
        return params;
    };

    // Search history with current filters
    const searchHistory = async () => {
        setHistoryLoading(true);
        try {
            const params = buildHistorySearchParams();
            const list = await SearchHistory(params, 100);
            setHistoryList(list || []);
        } catch (e) {
            console.error('Failed to search history:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Load history list
    const loadHistoryList = async () => {
        setHistoryLoading(true);
        try {
            const list = await ListHistory(100);
            setHistoryList(list || []);
        } catch (e) {
            console.error('Failed to load history:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Clear all search fields
    const clearHistorySearch = () => {
        setHistorySearchProject('');
        setHistorySearchName('');
        setHistorySearchURL('');
        setHistorySearchMethod('');
        setHistorySearchStatus('');
        setHistorySearchSource('');
        loadHistoryList();
    };

    const [mcpConfig, setMCPConfig] = useState<any>({ enabled: false, port: 3847, project_id: '', environment_id: '', api_key: '' });
    const [mcpStatus, setMCPStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
    const [mcpEnvironments, setMCPEnvironments] = useState<Environment[]>([]);
    const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
    const [activeTab, setActiveTab] = useState<string>('home');
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [projectTrees, setProjectTrees] = useState<Record<string, ProjectTree>>({});
    const [requestTabs, setRequestTabs] = useState<RequestTab[]>([]);
    const [activeRequestTab, setActiveRequestTab] = useState<string>('');
    const [currentRequest, setCurrentRequest] = useState<CurlRequest | null>(null);
    const [response, setResponse] = useState<any>(null);
    const [formattedResponse, setFormattedResponse] = useState<string>('');
    const [responseBodyHeight, setResponseBodyHeight] = useState<number>(200);
    const [scriptResultsHeight, setScriptResultsHeight] = useState<number>(200);
    const [executing, setExecuting] = useState(false);
    const [scriptLogsExpanded, setScriptLogsExpanded] = useState(true);
    const [testResultsExpanded, setTestResultsExpanded] = useState(true);
    const [createFolderModal, setCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [createRequestModal, setCreateRequestModal] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [renameModal, setRenameModal] = useState(false);
    const [renameType, setRenameType] = useState<'request' | 'folder'>('request');
    const [renamePath, setRenamePath] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [apiConfig, setApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [curlPreview, setCurlPreview] = useState<string>('');
    const [requestCases, setRequestCases] = useState<RequestCaseState[]>([]);
    const [activeCaseId, setActiveCaseId] = useState<string>('');
    const [interfaceApiConfig, setInterfaceApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [requestEditorSurface, setRequestEditorSurface] = useState<RequestEditorSurface>('plain');
    const [sidebarHighlightedCasePath, setSidebarHighlightedCasePath] = useState<string>('');
    const [expandedRequestPaths, setExpandedRequestPaths] = useState<Set<string>>(() => new Set());
    const [caseRenameModalOpen, setCaseRenameModalOpen] = useState(false);
    const [caseRenameCasePath, setCaseRenameCasePath] = useState('');
    const [caseRenameInput, setCaseRenameInput] = useState('');
    const [addCaseModalOpen, setAddCaseModalOpen] = useState(false);
    const [addCaseTargetPath, setAddCaseTargetPath] = useState('');
    const [addCaseNameInput, setAddCaseNameInput] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [draggingNode, setDraggingNode] = useState<{ type: 'request' | 'folder'; path: string } | null>(null);
    const [dropTargetFolderPath, setDropTargetFolderPath] = useState<string | null>(null);
    const [invalidDropHint, setInvalidDropHint] = useState<{ message: string; x: number; y: number } | null>(null);
    const [movedHighlightPath, setMovedHighlightPath] = useState<string | null>(null);
    const searchInputRef = React.useRef<InputRef>(null);
    const renameInputRef = React.useRef<InputRef>(null);
    const renameSelectionEndRef = React.useRef<number>(0);
    const [importing, setImporting] = useState(false);
    const [searchVersion, setSearchVersion] = useState(0);
    const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, ProjectWorkspaceState>>({});
    const [animationEnabled, setListAnimationEnabled] = useState(false);
    const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
        // 尝试从 localStorage 读取主题，避免闪烁
        const saved = localStorage.getItem('apiman-theme');
        return saved === 'dark' || saved === 'light' ? saved : 'light';
    });
    const [forceListAnimation, setForceListAnimation] = useState(false);
    const [projectSearchKeyword, setProjectSearchKeyword] = useState('');
    const [projectGroups, setProjectGroups] = useState<string[]>([]);
    const [projectGroupAssignments, setProjectGroupAssignments] = useState<Record<string, string>>({});
    const [createGroupModal, setCreateGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [renameProjectModal, setRenameProjectModal] = useState(false);
    const [renameProjectId, setRenameProjectId] = useState('');
    const [renameProjectValue, setRenameProjectValue] = useState('');
    const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set());
    const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
    const [projectDropTargetGroup, setProjectDropTargetGroup] = useState<string | null>(null);
    const [renameGroupModal, setRenameGroupModal] = useState(false);
    const [renameGroupValue, setRenameGroupValue] = useState('');
    const [editingGroupName, setEditingGroupName] = useState('');
    const [draggingGroupName, setDraggingGroupName] = useState<string | null>(null);
    const [groupSortDropTarget, setGroupSortDropTarget] = useState<string | null>(null);
    const [projectGroupsLoaded, setProjectGroupsLoaded] = useState(false);
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [environmentsInitiallyLoaded, setEnvironmentsInitiallyLoaded] = useState(false);
    const [editingEnvironmentId, setEditingEnvironmentId] = useState<string>('');
    const [environmentFormName, setEnvironmentFormName] = useState('');
    const [environmentFormVariables, setEnvironmentFormVariables] = useState<EnvironmentVariableRow[]>([createEnvironmentVariableRow()]);
    const [envLoading, setEnvLoading] = useState(false);
    const [envSaving, setEnvSaving] = useState(false);
    const [environmentTabs, setEnvironmentTabs] = useState<EnvironmentEditorTab[]>([]);
    const [activeEnvironmentTab, setActiveEnvironmentTab] = useState<string>('');
    const [projectScripts, setProjectScripts] = useState<ProjectScript[]>([]);
    const [editingScriptId, setEditingScriptId] = useState<string>('');
    const [scriptFormName, setScriptFormName] = useState('');
    const [scriptFormDescription, setScriptFormDescription] = useState('');
    const [scriptFormContent, setScriptFormContent] = useState('// 在这里编写 JavaScript 脚本\n');
    const [scriptsLoading, setScriptsLoading] = useState(false);
    const [scriptSaving, setScriptSaving] = useState(false);
    const [scriptHelpVisible, setScriptHelpVisible] = useState(false);
    const forceAnimationTimerRef = React.useRef<number | null>(null);
    const movedHighlightTimerRef = React.useRef<number | null>(null);

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

    const environmentToRows = (variables: Record<string, string>): EnvironmentVariableRow[] => {
        const rows = Object.entries(variables || {}).map(([key, value]) => createEnvironmentVariableRow(key, value));
        return rows.length > 0 ? rows : [createEnvironmentVariableRow()];
    };

    const rowsToEnvironmentVariables = (rows: EnvironmentVariableRow[]): Record<string, string> => {
        return rows.reduce((acc, item) => {
            const key = item.key.trim();
            if (!key) return acc;
            acc[key] = item.value;
            return acc;
        }, {} as Record<string, string>);
    };

    const resetEnvironmentEditor = () => {
        setEditingEnvironmentId('');
        setEnvironmentFormName('');
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
    };

    const loadEnvironmentsData = async (projectID: string) => {
        setEnvLoading(true);
        setEnvironmentsInitiallyLoaded(false);
        try {
            const envs = await LoadEnvironments(projectID);
            setEnvironments(envs || []);
        } catch (error: any) {
            console.error('Failed to load environments:', error);
            message.error(`加载环境失败: ${error?.message || error}`);
            setEnvironments([]);
        } finally {
            setEnvLoading(false);
        }
    };

    const loadProjectScriptsData = async (projectID: string) => {
        setScriptsLoading(true);
        try {
            const scripts = await ListProjectScripts(projectID);
            setProjectScripts(scripts || []);
            if (scripts && scripts.length > 0) {
                const target = scripts.find(item => item.id === editingScriptId) || scripts[0];
                setEditingScriptId(target.id);
                setScriptFormName(target.name);
                setScriptFormDescription(target.description || '');
                setScriptFormContent(target.content || '');
            } else {
                setEditingScriptId('');
                setScriptFormName('');
                setScriptFormDescription('');
                setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            }
        } catch (error: any) {
            console.error('Failed to load scripts:', error);
            message.error(`加载脚本失败: ${error?.message || error}`);
        } finally {
            setScriptsLoading(false);
        }
    };

    const handleCreateScript = async () => {
        if (!currentProject?.id) return;
        const scriptName = `脚本${projectScripts.length + 1}`;
        setScriptSaving(true);
        try {
            const created = await CreateProjectScript(currentProject.id, scriptName, '', '// 在这里编写 JavaScript 脚本\n');
            message.success('脚本已创建');
            await loadProjectScriptsData(currentProject.id);
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

    const handleSelectScriptEditor = (script: ProjectScript) => {
        setEditingScriptId(script.id);
        setScriptFormName(script.name);
        setScriptFormDescription(script.description || '');
        setScriptFormContent(script.content || '');
    };

    const handleSaveScript = async () => {
        if (!currentProject?.id || !editingScriptId) return;
        const name = scriptFormName.trim();
        if (!name) {
            message.warning('请输入脚本名称');
            return;
        }
        setScriptSaving(true);
        try {
            await UpdateProjectScript(currentProject.id, editingScriptId, name, scriptFormDescription, scriptFormContent);
            message.success('脚本已保存');
            await loadProjectScriptsData(currentProject.id);
        } catch (error: any) {
            message.error(`保存脚本失败: ${error?.message || error}`);
        } finally {
            setScriptSaving(false);
        }
    };

    const handleDeleteScriptCurrent = async () => {
        if (!currentProject?.id || !editingScriptId) return;
        Modal.confirm({
            title: '删除脚本',
            content: '确定删除当前脚本吗？接口中已绑定该脚本的配置会被清空。',
            onOk: async () => {
                try {
                    await DeleteProjectScript(currentProject.id, editingScriptId);
                    message.success('脚本已删除');
                    await loadProjectScriptsData(currentProject.id);
                    setApiConfig((prev) => ({
                        ...prev,
                        preScripts: prev.preScripts.filter(id => id !== editingScriptId),
                        postScripts: prev.postScripts.filter(id => id !== editingScriptId),
                    }));
                    setInterfaceApiConfig((prev) => ({
                        ...prev,
                        preScripts: prev.preScripts.filter(id => id !== editingScriptId),
                        postScripts: prev.postScripts.filter(id => id !== editingScriptId),
                    }));
                } catch (error: any) {
                    message.error(`删除脚本失败: ${error?.message || error}`);
                }
            }
        });
    };

    const openEnvironmentEditor = (env: Environment) => {
        const tabKey = `env-${env.id}`;
        setEnvironmentTabs(prev => {
            if (prev.some(tab => tab.key === tabKey)) return prev;
            return [...prev, { key: tabKey, title: env.name, environmentId: env.id }];
        });
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    };

    const openCreateEnvironmentTab = () => {
        const p = projectTabs.find(t => t.id === activeTab)?.project;
        if (!p?.id) {
            message.warning('请先打开项目');
            return;
        }
        const tabKey = `new-env-${Date.now()}`;
        setEnvironmentTabs(prev => [...prev, { key: tabKey, title: '新建环境', isNew: true }]);
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId('');
        setEnvironmentFormName(`环境${environments.length + 1}`);
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
        setSidebarMenu('environments');
    };

    const closeEnvironmentTab = (tabKey: string) => {
        setEnvironmentTabs(prev => {
            const next = prev.filter(tab => tab.key !== tabKey);
            if (activeEnvironmentTab === tabKey) {
                setActiveEnvironmentTab(next[0]?.key || '');
                if (next.length === 0) {
                    resetEnvironmentEditor();
                }
            }
            return next;
        });
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
            loadMCPStatus();
            loadMCPConfig();
        };
        init();
    }, []);

    useEffect(() => {
        if (environments.length === 0) {
            if (selectedEnvironmentId) {
                setSelectedEnvironmentId('');
            }
            if (editingEnvironmentId) {
                resetEnvironmentEditor();
            }
            return;
        }

        // Auto-select first environment only on initial load, not on subsequent changes
        // This preserves user's explicit selection of "不使用环境"
        if (!environmentsInitiallyLoaded) {
            if (!selectedEnvironmentId) {
                setSelectedEnvironmentId(environments[0].id);
            }
            setEnvironmentsInitiallyLoaded(true);
        }

        if (editingEnvironmentId && !environments.some(env => env.id === editingEnvironmentId)) {
            resetEnvironmentEditor();
        }
    }, [environments, selectedEnvironmentId, editingEnvironmentId, environmentsInitiallyLoaded]);

    useEffect(() => {
        const activeProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!activeProject?.id) {
            setProjectScripts([]);
            setEditingScriptId('');
            setScriptFormName('');
            setScriptFormDescription('');
            setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            setEnvironments([]);
            setEnvironmentsInitiallyLoaded(false);
            return;
        }
        loadProjectScriptsData(activeProject.id);
        loadEnvironmentsData(activeProject.id);
    }, [activeTab, projectTabs]);

    useEffect(() => {
        setEnvironmentTabs(prev => prev
            .filter(tab => tab.isNew || (tab.environmentId && environments.some(env => env.id === tab.environmentId)))
            .map(tab => {
                if (tab.isNew || !tab.environmentId) return tab;
                const env = environments.find(item => item.id === tab.environmentId);
                return env ? { ...tab, title: env.name } : tab;
            }));
    }, [environments]);

    useEffect(() => {
        if (!activeEnvironmentTab) return;
        const activeTab = environmentTabs.find(tab => tab.key === activeEnvironmentTab);
        if (!activeTab) return;
        if (activeTab.isNew) {
            setEditingEnvironmentId('');
            if (!environmentFormName) {
                setEnvironmentFormName(`环境${environments.length + 1}`);
            }
            if (!environmentFormVariables.length) {
                setEnvironmentFormVariables([createEnvironmentVariableRow()]);
            }
            return;
        }
        if (!activeTab.environmentId) return;
        const env = environments.find(item => item.id === activeTab.environmentId);
        if (!env) return;
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    }, [activeEnvironmentTab, environmentTabs, environments]);

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
    }, [response]);

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

    const loadProjects = async () => {
        setLoading(true);
        try {
            const projectList = await ListProjects();
            setProjects(projectList || []);
            setStatus(`已加载 ${(projectList || []).length} 个项目`);
        } catch (error: any) {
            console.error('Failed to load projects:', error);
            setStatus(`错误: ${error?.message || error}`);
            message.error('加载项目失败');
        } finally {
            setLoading(false);
        }
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

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            message.warning('请输入项目名称');
            return;
        }

        try {
            await CreateProject(newProjectName);
            message.success('项目创建成功');
            setCreateProjectModal(false);
            setNewProjectName('');
            loadProjects();
        } catch (error: any) {
            console.error('Failed to create project:', error);
            message.error(`创建失败: ${error?.message || error}`);
        }
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

    const handleRenameProject = async () => {
        const newName = renameProjectValue.trim();
        if (!renameProjectId) return;
        if (!newName) {
            message.warning('请输入项目名称');
            return;
        }
        try {
            const renamed = await RenameProject(renameProjectId, newName);
            setProjectTabs(prev => prev.map(tab => (
                tab.project.id === renameProjectId
                    ? { ...tab, title: renamed.name, project: { ...tab.project, name: renamed.name } }
                    : tab
            )));
            setRenameProjectModal(false);
            setRenameProjectId('');
            setRenameProjectValue('');
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

    const createGroupWithName = async (groupName: string) => {
        const name = groupName.trim();
        if (!name) {
            message.warning('请输入分组名称');
            return;
        }
        if (name === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (projectGroups.includes(name)) {
            message.warning('分组名称已存在');
            return;
        }
        setProjectGroups(prev => [...prev, name]);
        message.success('分组创建成功');
    };

    const renameGroupWithName = async (groupName: string) => {
        const oldName = editingGroupName;
        const newName = groupName.trim();
        if (!newName || !oldName) return;
        if (newName === oldName) return;
        if (newName === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (projectGroups.includes(newName)) {
            message.warning('分组名称已存在');
            return;
        }
        setProjectGroups(prev => prev.map(g => g === oldName ? newName : g));
        setProjectGroupAssignments(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (next[key] === oldName) {
                    next[key] = newName;
                }
            });
            return next;
        });
        message.success('分组重命名成功');
    };

    const handleCreateProjectGroup = () => {
        const groupName = newGroupName.trim();
        if (!groupName) {
            message.warning('请输入分组名称');
            return;
        }
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (projectGroups.includes(groupName)) {
            message.warning('分组名称已存在');
            return;
        }
        setProjectGroups(prev => [...prev, groupName]);
        setCreateGroupModal(false);
        setNewGroupName('');
        message.success('分组创建成功');
    };

    const loadMCPStatus = async () => {
        try {
            const status = await GetMCPStatus();
            setMCPStatus(status as 'stopped' | 'running' | 'error');
        } catch (err) {
            console.error('Failed to get MCP status:', err);
            setMCPStatus('stopped');
        }
    };

    const loadMCPConfig = async () => {
        try {
            const config = await LoadMCPConfig();
            if (config) {
                setMCPConfig(config);
            }
        } catch (err) {
            console.error('Failed to load MCP config:', err);
        }
    };

    const loadMCPEnvironments = async (projectId: string) => {
        try {
            const data = await LoadEnvironments(projectId);
            if (data) {
                setMCPEnvironments(data);
            } else {
                setMCPEnvironments([]);
            }
        } catch (err) {
            console.error('Failed to load MCP environments:', err);
            setMCPEnvironments([]);
        }
    };

    const handleSaveMCPConfig = async (config: any) => {
        try {
            // Save config first
            await SaveMCPConfig(config);
            setMCPConfig(config);

            // Then start or stop based on enabled flag
            if (config.enabled) {
                await StartMCP();
                setMCPStatus('running');
            } else {
                await StopMCP();
                setMCPStatus('stopped');
            }
        } catch (err) {
            console.error('Failed to save MCP config:', err);
            setMCPStatus('error');
            throw err;
        }
    };

    const handleStopMCP = async () => {
        try {
            await StopMCP();
            setMCPStatus('stopped');
            const config = { ...mcpConfig, enabled: false };
            await SaveMCPConfig(config);
            setMCPConfig(config);
        } catch (err) {
            console.error('Failed to stop MCP:', err);
            message.error('停止 MCP 失败');
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

    const handleSaveCookies = async () => {
        if (!cookieInput.trim()) {
            message.warning('请输入 set-cookie 内容');
            return;
        }
        try {
            await AddGlobalCookies(cookieInput);
            message.success('Cookie 保存成功');
            setCookieInput('');
            loadGlobalCookies();
        } catch (err) {
            message.error(`保存失败: ${err}`);
        }
    };

    const handleDeleteCookie = async (id: string) => {
        try {
            await DeleteGlobalCookie(id);
            message.success('Cookie 已删除');
            loadGlobalCookies();
        } catch (err: any) {
            console.error('Delete error:', err);
            message.error(`删除失败: ${err?.message || err}`);
        }
    };

    const handleAssignProjectGroup = (projectId: string, groupName: string) => {
        if (!groupName || groupName === DEFAULT_PROJECT_GROUP) {
            setProjectGroupAssignments(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
            return;
        }
        setProjectGroupAssignments(prev => ({ ...prev, [projectId]: groupName }));
    };

    const toggleProjectGroupCollapse = (groupName: string) => {
        setCollapsedProjectGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    const openRenameProjectGroupModal = (groupName: string) => {
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('默认分组不支持重命名');
            return;
        }
        setEditingGroupName(groupName);
        setRenameGroupValue(groupName);
        setRenameGroupModal(true);
    };

    const handleRenameProjectGroup = () => {
        const nextName = renameGroupValue.trim();
        if (!editingGroupName) return;
        if (!nextName) {
            message.warning('请输入分组名称');
            return;
        }
        if (nextName === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (nextName !== editingGroupName && projectGroups.includes(nextName)) {
            message.warning('分组名称已存在');
            return;
        }

        setProjectGroups(prev => prev.map(name => (name === editingGroupName ? nextName : name)));
        setProjectGroupAssignments(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(projectId => {
                if (next[projectId] === editingGroupName) {
                    next[projectId] = nextName;
                }
            });
            return next;
        });
        setCollapsedProjectGroups(prev => {
            const next = new Set(prev);
            if (next.delete(editingGroupName)) {
                next.add(nextName);
            }
            return next;
        });

        setRenameGroupModal(false);
        setEditingGroupName('');
        setRenameGroupValue('');
        message.success('分组重命名成功');
    };

    const handleDeleteProjectGroup = (groupName: string) => {
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('默认分组不支持删除');
            return;
        }
        const affectedCount = Object.values(projectGroupAssignments).filter(name => name === groupName).length;
        Modal.confirm({
            title: '删除分组',
            content: affectedCount > 0
                ? `该分组下有 ${affectedCount} 个项目，删除后将自动移动到"${DEFAULT_PROJECT_GROUP}"。是否继续？`
                : '确定删除该分组吗？',
            onOk: () => {
                setProjectGroups(prev => prev.filter(name => name !== groupName));
                setProjectGroupAssignments(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(projectId => {
                        if (next[projectId] === groupName) {
                            delete next[projectId];
                        }
                    });
                    return next;
                });
                setCollapsedProjectGroups(prev => {
                    const next = new Set(prev);
                    next.delete(groupName);
                    return next;
                });
                message.success('分组已删除');
            }
        });
    };

    const handleGroupDragStart = (groupName: string, e: React.DragEvent) => {
        if (groupName === DEFAULT_PROJECT_GROUP) return;
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        setDraggingGroupName(groupName);
    };

    const handleGroupDragOver = (groupName: string, e: React.DragEvent) => {
        if (!draggingGroupName) return;
        if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setGroupSortDropTarget(groupName);
    };

    const handleGroupDrop = (groupName: string, e: React.DragEvent) => {
        if (!draggingGroupName) return;
        if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
        e.preventDefault();
        e.stopPropagation();
        setProjectGroups(prev => {
            const sourceIndex = prev.indexOf(draggingGroupName);
            const targetIndex = prev.indexOf(groupName);
            if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return prev;
            const next = [...prev];
            next.splice(sourceIndex, 1);
            const insertIndex = next.indexOf(groupName);
            next.splice(insertIndex, 0, draggingGroupName);
            return next;
        });
        setDraggingGroupName(null);
        setGroupSortDropTarget(null);
    };

    const handleOpenProject = async (project: Project) => {
        const existingTab = projectTabs.find(t => t.project.id === project.id);
        if (existingTab) {
            switchProjectTab(existingTab.id);
        } else {
            const newTab: ProjectTab = {
                id: project.id,
                title: project.name,
                project: project,
            };
            if (activeTab !== 'home') {
                const currentState = captureCurrentWorkspaceState();
                setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
            }
            setProjectTabs([...projectTabs, newTab]);
            setProjectWorkspaceStates(prev => ({ ...prev, [newTab.id]: createEmptyWorkspaceState() }));
            setActiveTab(newTab.id);
            resetWorkspaceState();
            triggerOpenTabAnimation();

            setLoading(true);
            try {
                const tree = await GetProjectTree(project.id);
                setProjectTrees(prev => ({ ...prev, [project.id]: tree }));
                const folderKeys = collectFolderKeys(tree);
                setCollapsedFolders(prev => {
                    const next = new Set(prev);
                    folderKeys.forEach((key) => next.add(key));
                    return next;
                });
                setExpandedKeys([project.id]);
            } catch (error: any) {
                console.error('Failed to load project tree:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCloseProjectTab = (tabId: string) => {
        setProjectTabs(projectTabs.filter(t => t.id !== tabId));
        setProjectWorkspaceStates(prev => {
            const next = { ...prev };
            delete next[tabId];
            return next;
        });
        if (activeTab === tabId) {
            const remaining = projectTabs.filter(t => t.id !== tabId);
            if (remaining.length > 0) {
                switchProjectTab(remaining[0].id, true);
            } else {
                switchProjectTab('home', true);
            }
        }
    };

    const handleCreateFolder = async () => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!newFolderName.trim() || !currentProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || "";
        try {
            await CreateFolder(currentProject.id, parentPath, newFolderName);
            message.success('文件夹创建成功');
            setCreateFolderModal(false);
            setNewFolderName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));

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
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newRequestPath = await MoveRequest(requestPath, targetFolderPath, beforeID ?? '');

            setRequestTabs(prev => prev.map(tab =>
                tab.path === requestPath ? { ...tab, path: newRequestPath } : tab
            ));
            if (currentRequest?.path === requestPath) {
                setCurrentRequest({ ...currentRequest, path: newRequestPath });
            }

            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(newRequestPath);
            message.success('接口移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const moveFolderNode = async (folderPath: string, targetFolderPath: string, beforeID: string = '') => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newFolderPath = await MoveFolder(folderPath, targetFolderPath, beforeID ?? '');

            setRequestTabs(prev => prev.map(tab => ({
                ...tab,
                path: replacePathPrefix(tab.path, folderPath, newFolderPath)
            })));

            if (currentRequest?.path) {
                const nextPath = replacePathPrefix(currentRequest.path, folderPath, newFolderPath);
                if (nextPath !== currentRequest.path) {
                    setCurrentRequest({ ...currentRequest, path: nextPath });
                }
            }

            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(newFolderPath);
            message.success('文件夹移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const handleCreateRequest = async () => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!newRequestName.trim() || !currentProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || "";
        try {
            await CreateRequest(currentProject.id, parentPath, newRequestName, toWailsHttpSpec(createDefaultApiConfig()));
            message.success('请求创建成功');
            setCreateRequestModal(false);
            setNewRequestName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));

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
                ? attachScripts({ ...apiConfigFromHttpSpec(ifaceSpec, name) })
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
        setLoading(true);
        try {
            setSidebarHighlightedCasePath('');
            const request = await GetRequest(path);
            hydrateRequestEditor(request);
        } catch (error: any) {
            console.error('Failed to load request:', error);
        } finally {
            setLoading(false);
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

        const projectId = currentProject?.id || '';
        const projectName = currentProject?.name || '';
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

    const handleCreateEnvironmentClick = () => {
        openCreateEnvironmentTab();
    };

    const handleSaveEnvironment = async () => {
        const projectId = projectTabs.find(t => t.id === activeTab)?.project?.id;
        if (!projectId) {
            message.warning('请先打开项目');
            return;
        }
        const name = environmentFormName.trim();
        if (!name) {
            message.warning('请输入环境名称');
            return;
        }

        const variables = rowsToEnvironmentVariables(environmentFormVariables);
        setEnvSaving(true);
        try {
            if (editingEnvironmentId) {
                await UpdateEnvironment(projectId, editingEnvironmentId, name, variables);
                message.success('环境已更新');
            } else {
                const created = await CreateEnvironment(projectId, name, variables);
                message.success('环境已创建');
                setSelectedEnvironmentId(created.id);
                setEnvironmentTabs(prev => prev.map(tab => tab.key === activeEnvironmentTab
                    ? { key: `env-${created.id}`, title: created.name, environmentId: created.id }
                    : tab));
                setActiveEnvironmentTab(`env-${created.id}`);
                setEditingEnvironmentId(created.id);
            }
            await loadEnvironmentsData(projectId);
        } catch (error: any) {
            message.error(`保存环境失败: ${error?.message || error}`);
        } finally {
            setEnvSaving(false);
        }
    };

    const handleDeleteEnvironmentCurrent = async () => {
        const projectId = projectTabs.find(t => t.id === activeTab)?.project?.id;
        if (!projectId || !editingEnvironmentId) return;
        Modal.confirm({
            title: '删除环境',
            content: '确定删除当前环境吗？删除后无法恢复。',
            onOk: async () => {
                try {
                    await DeleteEnvironment(projectId, editingEnvironmentId);
                    message.success('环境已删除');
                    await loadEnvironmentsData(projectId);
                    setEnvironmentTabs(prev => prev.filter(tab => tab.environmentId !== editingEnvironmentId));
                    resetEnvironmentEditor();
                } catch (error: any) {
                    message.error(`删除环境失败: ${error?.message || error}`);
                }
            }
        });
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
            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
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
                    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
                    if (currentProject) {
                        const tree = await GetProjectTree(currentProject.id);
                        setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
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
            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
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

            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
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
                    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
                    if (currentProject) {
                        const tree = await GetProjectTree(currentProject.id);
                        setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };


    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
    const currentTree = currentProject ? projectTrees[currentProject.id] : null;
    const normalizedProjectKeyword = projectSearchKeyword.trim().toLowerCase();
    const filteredProjects = projects.filter(project => {
        if (!normalizedProjectKeyword) return true;
        return (project.name || '').toLowerCase().includes(normalizedProjectKeyword);
    });
    const groupedProjects = React.useMemo(() => {
        const bucket: Record<string, Project[]> = {};
        const orderedGroups = [...projectGroups, DEFAULT_PROJECT_GROUP];

        filteredProjects.forEach(project => {
            const assigned = projectGroupAssignments[project.id];
            const groupName = assigned && projectGroups.includes(assigned) ? assigned : DEFAULT_PROJECT_GROUP;
            if (!bucket[groupName]) bucket[groupName] = [];
            bucket[groupName].push(project);
        });

        return orderedGroups
            .map(groupName => ({
                groupName,
                projects: bucket[groupName] || [],
            }));
    }, [filteredProjects, projectGroupAssignments, projectGroups]);

    const filteredTree = React.useMemo(() => {
        if (!currentTree) return null;
        return filterTreeNodes(currentTree, searchKeyword, filterMethod);
    }, [currentTree, searchKeyword, filterMethod, searchVersion]);

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
                            onCreateEnvironment={handleCreateEnvironmentClick}
                            onCreateScript={handleCreateScript}
                            onEnvironmentSelect={(env) => openEnvironmentEditor(env)}
                            onScriptSelect={(script) => handleSelectScriptEditor(script)}
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
                                                environmentFormName={environmentFormName}
                                                environmentFormVariables={environmentFormVariables}
                                                envSaving={envSaving}
                                                editingEnvironmentId={editingEnvironmentId}
                                                onNameChange={setEnvironmentFormName}
                                                onVariablesUpdate={(id, field, value) => setEnvironmentFormVariables(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))}
                                                onVariablesRemove={(id) => setEnvironmentFormVariables(prev => {
                                                    const next = prev.filter((row) => row.id !== id);
                                                    return next.length > 0 ? next : [createEnvironmentVariableRow()];
                                                })}
                                                onVariablesAdd={() => setEnvironmentFormVariables(prev => [...prev, createEnvironmentVariableRow()])}
                                                onReset={resetEnvironmentEditor}
                                                onDelete={handleDeleteEnvironmentCurrent}
                                                onSave={handleSaveEnvironment}
                                                createEnvironmentVariableRow={createEnvironmentVariableRow}
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
                                            scriptFormName={scriptFormName}
                                            scriptFormDescription={scriptFormDescription}
                                            scriptFormContent={scriptFormContent}
                                            scriptSaving={scriptSaving}
                                            appTheme={appTheme}
                                            onNameChange={setScriptFormName}
                                            onDescriptionChange={setScriptFormDescription}
                                            onContentChange={setScriptFormContent}
                                            onHelpClick={() => setScriptHelpVisible(true)}
                                            onDelete={handleDeleteScriptCurrent}
                                            onSave={handleSaveScript}
                                        />
                                    ) : (
                                        <Empty description="请先在左侧选择脚本，或点击新建" />
                                    )}
                                </div>
                            ) : currentRequest ? (
                                <>
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
                                </>
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
                onClose={() => { setCreateProjectModal(false); setNewProjectName(''); }}
                onConfirm={createProjectWithName}
                appTheme={appTheme}
            />

            <CreateGroupModal
                visible={createGroupModal}
                onClose={() => { setCreateGroupModal(false); setNewGroupName(''); }}
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
                onSave={handleSaveMCPConfig}
                currentStatus={mcpStatus}
                appTheme={appTheme}
                environments={mcpEnvironments}
                onLoadEnvironments={loadMCPEnvironments}
            />

            <HistoryModal
                visible={historyModalVisible}
                onClose={() => { setHistoryModalVisible(false); setHistoryDetail(null); }}
                appTheme={appTheme}
                historyList={historyList}
                setHistoryList={setHistoryList}
                historyDetail={historyDetail}
                setHistoryDetail={setHistoryDetail}
                historyLoading={historyLoading}
                setHistoryLoading={setHistoryLoading}
                historySearchProject={historySearchProject}
                setHistorySearchProject={setHistorySearchProject}
                historySearchName={historySearchName}
                setHistorySearchName={setHistorySearchName}
                historySearchURL={historySearchURL}
                setHistorySearchURL={setHistorySearchURL}
                historySearchMethod={historySearchMethod}
                setHistorySearchMethod={setHistorySearchMethod}
                historySearchStatus={historySearchStatus}
                setHistorySearchStatus={setHistorySearchStatus}
                historySearchSource={historySearchSource}
                setHistorySearchSource={setHistorySearchSource}
                onSearch={searchHistory}
                onClearSearch={clearHistorySearch}
            />

            <AppFooter
                mcpStatus={mcpStatus}
                onOpenCookie={() => { setCookieModalVisible(true); loadGlobalCookies(); }}
                onOpenMCP={() => setMCpModalVisible(true)}
                onOpenHistory={() => { setHistoryModalVisible(true); clearHistorySearch(); }}
            />
        </div>
    );
}

export default App;
