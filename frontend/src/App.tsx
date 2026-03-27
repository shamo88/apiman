import React, { useState, useEffect } from 'react';
import { Button, Space, Modal, Input, message, Spin, Tree, Dropdown, Tabs, Card, Col, Row, Select, Collapse, Empty, Radio, InputRef, Upload } from 'antd';
import { PlusOutlined, ApiOutlined, ProjectOutlined, FolderOutlined, FileOutlined, CopyOutlined, EditOutlined, CloseOutlined, HomeOutlined, DragOutlined, SearchOutlined, RightOutlined, DownOutlined, MoreOutlined, ImportOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { UploadProps } from 'antd';
import './App.css';
import { TitleBar } from './components/TitleBar';
import { ListProjects, CreateProject, DeleteProject, GetProjectTree, CreateFolder, CreateRequest, CopyRequest, RenameRequest, RenameFolder, MoveRequest, MoveFolder, GetRequest, DeleteRequest, DeleteFolder, ExecuteCurl, UpdateRequest, ImportPostmanCollection, LoadAppConfig } from '../wailsjs/go/main/App';

interface Project {
    id: string;
    name: string;
    path: string;
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

interface CurlRequest {
    path: string;
    name: string;
    content: string;
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

interface ApiConfig {
    name: string;
    method: string;
    url: string;
    headers: { key: string; value: string; enabled: boolean }[];
    params: { key: string; value: string; enabled: boolean }[];
    body: string;
    bodyType: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary';
    formData: { key: string; value: string }[];
    urlencoded: { key: string; value: string }[];
}

interface ProjectWorkspaceState {
    requestTabs: RequestTab[];
    activeRequestTab: string;
    currentRequest: CurlRequest | null;
    requestContent: string;
    response: any;
    selectedKeys: string[];
    apiConfig: ApiConfig;
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
    urlencoded: []
});

const createEmptyWorkspaceState = (): ProjectWorkspaceState => ({
    requestTabs: [],
    activeRequestTab: '',
    currentRequest: null,
    requestContent: '',
    response: null,
    selectedKeys: [],
    apiConfig: createDefaultApiConfig()
});

function App() {
    const [status, setStatus] = useState('初始化中...');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
    const [activeTab, setActiveTab] = useState<string>('home');
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [projectTrees, setProjectTrees] = useState<Record<string, ProjectTree>>({});
    const [requestTabs, setRequestTabs] = useState<RequestTab[]>([]);
    const [activeRequestTab, setActiveRequestTab] = useState<string>('');
    const [currentRequest, setCurrentRequest] = useState<CurlRequest | null>(null);
    const [requestContent, setRequestContent] = useState('');
    const [response, setResponse] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
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
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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
    const [listAnimationEnabled, setListAnimationEnabled] = useState(false);
    const [forceListAnimation, setForceListAnimation] = useState(false);
    const forceAnimationTimerRef = React.useRef<number | null>(null);
    const movedHighlightTimerRef = React.useRef<number | null>(null);

    const trimRightSpaces = (value: string) => value.replace(/\s+$/g, '');
    const getPrimaryName = (value: string) => value.replace(/-副本\d*$/u, '');

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
        if (!currentTree || !currentProject?.path) return [];
        if (folderPath === currentProject.path) {
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
        if (!currentTree || !currentProject?.path) return null;

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

        walk(currentTree, currentProject.path);
        return foundParent;
    };

    const checkDropValidity = (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string): { ok: boolean; reason?: string } => {
        if (!currentProject?.path) return { ok: false, reason: 'invalid-target' };
        if (dragNode.path === targetFolderPath) return { ok: false, reason: 'self' };

        const sourceParent = getParentFolderPath(dragNode.path);
        if (!sourceParent) return { ok: false, reason: 'missing-source' };
        if (sourceParent === targetFolderPath) return { ok: false, reason: 'same-parent' };

        if (dragNode.type === 'folder') {
            if (targetFolderPath.startsWith(dragNode.path + '\\') || targetFolderPath.startsWith(dragNode.path + '/')) {
                return { ok: false, reason: 'child' };
            }
        }

        const draggingTreeNode = getNodeByPath(dragNode.path);
        if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

        const targetChildren = getChildrenByFolderPath(targetFolderPath);
        if (dragNode.type === 'request') {
            const conflict = targetChildren.some(child => child.type === 'request' && child.name === draggingTreeNode.name);
            if (conflict) return { ok: false, reason: 'duplicate-request-name' };
        } else {
            const conflict = targetChildren.some(child => child.type === 'folder' && child.name === draggingTreeNode.name && child.path !== dragNode.path);
            if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
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
        setRequestContent(emptyState.requestContent);
        setResponse(emptyState.response);
        setSelectedKeys(emptyState.selectedKeys);
        setApiConfig(emptyState.apiConfig);
    };

    const captureCurrentWorkspaceState = (): ProjectWorkspaceState => ({
        requestTabs,
        activeRequestTab,
        currentRequest,
        requestContent,
        response,
        selectedKeys,
        apiConfig
    });

    const applyWorkspaceState = (state: ProjectWorkspaceState) => {
        setRequestTabs(state.requestTabs);
        setActiveRequestTab(state.activeRequestTab);
        setCurrentRequest(state.currentRequest);
        setRequestContent(state.requestContent);
        setResponse(state.response);
        setSelectedKeys(state.selectedKeys);
        setApiConfig(state.apiConfig);
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

    const getMethodColor = (method: string) => {
        const colors: Record<string, string> = {
            GET: '#61affe',
            POST: '#49cc90',
            PUT: '#fca130',
            DELETE: '#f93e3e',
            PATCH: '#50e3c2',
            OPTIONS: '#0d5aa7',
            HEAD: '#9012fe'
        };
        return colors[method.toUpperCase()] || '#999';
    };

    const filterTreeNodes = (tree: ProjectTree | null, keyword: string, method: string): ProjectTree | null => {
        if (!tree) return null;
        const normalizedKeyword = keyword.trim().toLowerCase();

        if (tree.type === 'request') {
            const nameLower = (tree.name || '').toLowerCase();
            const urlLower = (tree.url || '').toLowerCase();

            const matchName = normalizedKeyword === '' || nameLower.includes(normalizedKeyword);
            const matchURL = normalizedKeyword === '' || urlLower.includes(normalizedKeyword);
            const matchMethod = method === 'ALL' || tree.method === method;

            if ((matchName || matchURL) && matchMethod) {
                return tree;
            }
            return null;
        }

        if (tree.type === 'folder') {
            const filteredChildren = tree.children
                ?.map(child => filterTreeNodes(child, keyword, method))
                .filter(child => child !== null) as ProjectTree[];

            if (filteredChildren.length > 0) {
                return { ...tree, children: filteredChildren };
            }
            return null;
        }

        if (tree.type === 'project') {
            const filteredChildren = tree.children
                ?.map(child => filterTreeNodes(child, keyword, method))
                .filter(child => child !== null) as ProjectTree[];

            return {
                ...tree,
                children: filteredChildren || []
            };
        }

        return tree;
    };

    const renderApiList = () => {
        if (!filteredTree) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        const allChildren = filteredTree.children || [];
        if (allChildren.length === 0) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        const renderRequestItem = (api: any) => (
            <div
                key={api.path}
                className={`api-item ${currentRequest?.path === api.path ? 'active' : ''} ${movedHighlightPath === api.path ? 'moved-highlight' : ''}`}
                draggable
                onClick={() => handleTreeItemClick(api)}
                onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggingNode({ type: 'request', path: api.path! });
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={clearDragState}
                onMouseEnter={() => setHoveredItem(api.path || '')}
                onMouseLeave={() => setHoveredItem(null)}
            >
                <span
                    className="api-method-tag"
                    style={{ backgroundColor: getMethodColor((api as any).method || 'GET') + '20', color: getMethodColor((api as any).method || 'GET') }}
                >
                    {((api as any).method || 'GET').substring(0, 7).toUpperCase()}
                </span>
                <span className="api-name">{api.name.replace('.curl', '')}</span>
                {hoveredItem === api.path && (
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'copy', icon: <CopyOutlined />, label: '复制', onClick: () => { handleCopyRequest(api.path!); } },
                                { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => { openRenameModal('request', api.path!, api.name); } },
                                { key: 'delete', icon: <CloseOutlined />, label: '删除', danger: true, onClick: () => { handleDeleteRequest(api.path!); } }
                            ]
                        }}
                        trigger={['click']}
                    >
                        <button className="api-action-btn" onClick={(e) => e.stopPropagation()}>
                            <MoreOutlined />
                        </button>
                    </Dropdown>
                )}
            </div>
        );

        // 递归渲染文件夹及其内容
        const renderFolder = (folder: any) => {
            const folderChildren = folder.children || [];
            const subFolders = folderChildren.filter((child: any) => child.type === 'folder');
            const requests = folderChildren.filter((child: any) => child.type === 'request');
            const isCollapsed = collapsedFolders.has(folder.path || folder.id);
            const totalCount = folderChildren.length;

            return (
                <div key={folder.path || folder.id} className="api-folder">
                    <div
                        className={`api-folder-header ${dropTargetFolderPath === (folder.path || folder.id) ? 'drop-target' : ''} ${movedHighlightPath === (folder.path || folder.id) ? 'moved-highlight' : ''}`}
                        draggable
                        onClick={() => toggleFolderCollapse(folder.path || folder.id)}
                        onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingNode({ type: 'folder', path: folder.path! });
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={clearDragState}
                        onDragOver={(e) => {
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const targetPath = folder.path || folder.id;
                            const check = checkDropValidity(draggingNode, targetPath);
                            if (!check.ok) {
                                e.dataTransfer.dropEffect = 'none';
                                setDropTargetFolderPath(null);
                                setInvalidDropHint({
                                    message: getDropHintMessage(check.reason),
                                    x: e.clientX + 14,
                                    y: e.clientY + 14,
                                });
                                return;
                            }
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDropTargetFolderPath(targetPath);
                            setInvalidDropHint(null);
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const targetPath = folder.path || folder.id;
                            const check = checkDropValidity(draggingNode, targetPath);
                            if (!check.ok) {
                                clearDragState();
                                return;
                            }
                            if (draggingNode.type === 'request') {
                                await moveRequestNode(draggingNode.path, targetPath);
                            } else {
                                await moveFolderNode(draggingNode.path, targetPath);
                            }
                            clearDragState();
                        }}
                    >
                        <span className="folder-toggle-icon">
                            {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                        </span>
                        <FolderOutlined className="folder-icon" />
                        <span className="folder-name">{folder.name}</span>
                        <span className="folder-count">{totalCount}</span>
                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'add-request', icon: <PlusOutlined />, label: '新建请求', onClick: () => { setSelectedFolder(folder.path || currentProject?.path || ''); setCreateRequestModal(true); } },
                                    { key: 'add-folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => { setSelectedFolder(folder.path || currentProject?.path || ''); setCreateFolderModal(true); } },
                                    { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => openRenameModal('folder', folder.path!, folder.name) },
                                    { type: 'divider' },
                                    { key: 'delete', icon: <CloseOutlined />, label: '删除文件夹', danger: true, onClick: () => handleDeleteFolder(folder.path!) }
                                ]
                            }}
                            trigger={['click']}
                        >
                            <button className="folder-action-btn" onClick={(e) => e.stopPropagation()}>
                                <MoreOutlined />
                            </button>
                        </Dropdown>
                    </div>

                    {!isCollapsed && folderChildren.length > 0 && (
                        <div className="api-folder-content">
                            {requests.map(renderRequestItem)}
                            {subFolders.map(renderFolder)}
                        </div>
                    )}
                </div>
            );
        };

        const rootFolders = filteredTree.children?.filter((child: any) => child.type === 'folder') || [];
        const rootRequests = filteredTree.children?.filter((child: any) => child.type === 'request') || [];

        return (
            <>
                {rootRequests.length > 0 && (
                    <div className="api-folder">
                        <div className="api-folder-content">
                            {rootRequests.map(renderRequestItem)}
                        </div>
                    </div>
                )}
                {rootFolders.map(renderFolder)}
            </>
        );
    };

    useEffect(() => {
        loadProjects();
        loadUiConfig();
    }, []);

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
        } catch (error) {
            console.error('Failed to load UI config:', error);
        }
    };

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

    const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
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

        const parentPath = selectedFolder || currentProject.path;
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

    const moveRequestNode = async (requestPath: string, targetFolderPath: string) => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newRequestPath = await MoveRequest(requestPath, targetFolderPath);

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

    const moveFolderNode = async (folderPath: string, targetFolderPath: string) => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newFolderPath = await MoveFolder(folderPath, targetFolderPath);

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

        const parentPath = selectedFolder || currentProject.path;
        try {
            await CreateRequest(currentProject.id, parentPath, newRequestName, 'curl ');
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
                const request = await GetRequest(treeNode.path);
                setCurrentRequest(request);
                const parsedConfig = parseCurlToConfig(request.content, request.name);
                setApiConfig(parsedConfig);
                setRequestContent(request.content);
                setResponse(null);

                const existingTab = requestTabs.find(t => t.path === treeNode.path);
                if (existingTab) {
                    setActiveRequestTab(existingTab.id);
                } else {
                    const newTab: RequestTab = {
                        id: `request-${Date.now()}`,
                        title: request.name || treeNode.name.replace('.curl', ''),
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

    const parseCurlToConfig = (curlCommand: string, name: string): ApiConfig => {
        const config: ApiConfig = {
            name: name,
            method: 'GET',
            url: '',
            headers: [],
            params: [],
            body: '',
            bodyType: 'none',
            formData: [],
            urlencoded: []
        };

        const lines = curlCommand.split('\n');
        let urlFound = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('#')) continue;

            const methodMatch = trimmedLine.match(/-X\s+(\w+)/i);
            if (methodMatch) {
                config.method = methodMatch[1].toUpperCase();
            }

            const headerMatch = trimmedLine.match(/-H\s+['"]([^'"]+)['"]/i);
            if (headerMatch) {
                const [key, ...valueParts] = headerMatch[1].split(':');
                config.headers.push({
                    key: key.trim(),
                    value: valueParts.join(':').trim(),
                    enabled: true
                });
            }

            const dataMatch = trimmedLine.match(/-d\s+['"]([^'"]+)['"]/i);
            if (dataMatch) {
                config.body = dataMatch[1];
            }

            const urlMatch = trimmedLine.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/i);
            if (urlMatch && !urlFound) {
                let url = urlMatch[1];
                const paramMatch = url.match(/\?(.+)$/);
                if (paramMatch) {
                    url = url.replace(/\?.*$/, '');
                    const paramPairs = paramMatch[1].split('&');
                    for (const pair of paramPairs) {
                        const [key, value] = pair.split('=');
                        config.params.push({
                            key: decodeURIComponent(key || ''),
                            value: decodeURIComponent(value || ''),
                            enabled: true
                        });
                    }
                }
                config.url = url;
                urlFound = true;
            }
        }

        return config;
    };

    const configToCurl = (config: ApiConfig): string => {
        let curl = 'curl';

        if (config.method !== 'GET') {
            curl += ` -X ${config.method}`;
        }

        for (const header of config.headers) {
            if (header.enabled && header.key) {
                curl += ` -H "${header.key}: ${header.value}"`;
            }
        }

        for (const param of config.params) {
            if (param.enabled && param.key) {
                const separator = config.url.includes('?') ? '&' : '?';
                config.url += `${separator}${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`;
            }
        }

        if (config.bodyType === 'none') {
            // 不添加 body
        } else if (config.bodyType === 'form-data' || config.bodyType === 'x-www-form-urlencoded') {
            const data = config.bodyType === 'form-data' ? config.formData : config.urlencoded;
            if (data.length > 0) {
                if (config.bodyType === 'x-www-form-urlencoded') {
                    curl += ` -H "Content-Type: application/x-www-form-urlencoded"`;
                    const formBody = data.map(item => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`).join('&');
                    curl += ` -d '${formBody}'`;
                } else {
                    for (const item of data) {
                        curl += ` -F "${item.key}=${item.value}"`;
                    }
                }
            }
        } else if (config.bodyType === 'json') {
            curl += ` -H "Content-Type: application/json"`;
            curl += ` -d '${config.body}'`;
        } else if (config.bodyType === 'xml') {
            curl += ` -H "Content-Type: application/xml"`;
            curl += ` -d '${config.body}'`;
        } else if (config.bodyType === 'raw') {
            curl += ` -d '${config.body}'`;
        } else if (config.bodyType === 'binary') {
            // Binary 类型需要文件路径，暂时不支持
        }

        curl += ` "${config.url}"`;

        return curl;
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
                setRequestContent('');
                setResponse(null);
            }
        }
    };

    const loadRequestContent = async (path: string) => {
        setLoading(true);
        try {
            const request = await GetRequest(path);
            setCurrentRequest(request);
            setRequestContent(request.content);
            setResponse(null);
        } catch (error: any) {
            console.error('Failed to load request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteCurl = async () => {
        const curlCommand = configToCurl(apiConfig);
        if (!curlCommand || !apiConfig.url) {
            message.warning('请输入 URL');
            return;
        }

        setExecuting(true);
        setResponse(null);
        try {
            const result = await ExecuteCurl(curlCommand);
            setResponse(result);
            setStatus(`请求完成 - ${result.status_code}`);
        } catch (error: any) {
            console.error('Failed to execute curl:', error);
            message.error(`执行失败: ${error?.message || error}`);
        } finally {
            setExecuting(false);
        }
    };

    const handleSaveRequest = async () => {
        if (!currentRequest?.path) return;

        try {
            const curlCommand = configToCurl(apiConfig);
            await UpdateRequest(currentRequest.path, curlCommand);
            setRequestContent(curlCommand);
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

    const convertTreeToDataNode = (tree: ProjectTree): DataNode => {
        return {
            key: tree.path || tree.id,
            title: (
                <div className="tree-item">
                    <span
                        className="tree-item-content"
                        onClick={() => handleTreeItemClick(tree)}
                        style={{ cursor: tree.type === 'request' ? 'pointer' : 'default' }}
                    >
                        {tree.type === 'project' && <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />}
                        {tree.type === 'folder' && <FolderOutlined style={{ marginRight: 8, color: '#faad14' }} />}
                        {tree.type === 'request' && <FileOutlined style={{ marginRight: 8, color: '#52c41a' }} />}
                        <span>{tree.name}</span>
                    </span>
                    {(tree.type === 'folder' || tree.type === 'request') && (
                        <Dropdown
                            menu={{
                                items: tree.type === 'folder'
                                    ? [{ key: 'delete', icon: <CloseOutlined />, label: '删除', danger: true, onClick: () => handleDeleteFolder(tree.path!) }]
                                    : [{ key: 'delete', icon: <CloseOutlined />, label: '删除', danger: true, onClick: () => handleDeleteRequest(tree.path!) }]
                            }}
                            trigger={['click']}
                        >
                            <CloseOutlined style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }} />
                        </Dropdown>
                    )}
                </div>
            ),
            isLeaf: tree.type === 'request',
            children: tree.children?.map(child => convertTreeToDataNode(child)),
        };
    };

    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return '#52c41a';
        if (code >= 300 && code < 400) return '#faad14';
        if (code >= 400 && code < 500) return '#fa8c16';
        if (code >= 500) return '#ff4d4f';
        return '#999';
    };

    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
    const currentTree = currentProject ? projectTrees[currentProject.id] : null;

    const filteredTree = React.useMemo(() => {
        if (!currentTree) return null;
        return filterTreeNodes(currentTree, searchKeyword, filterMethod);
    }, [currentTree, searchKeyword, filterMethod, searchVersion]);

    const tabItems = [
        {
            key: 'home',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
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
        <div className="app-container">
            <TitleBar
                activeTab={activeTab}
                onListAnimationChange={setListAnimationEnabled}
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
                    <div className="home-page">
                        <div className="home-header">
                            <h2>我的项目</h2>
                            <Space>
                                <Upload {...uploadProps}>
                                    <Button icon={<ImportOutlined />} loading={importing}>
                                        导入 Postman
                                    </Button>
                                </Upload>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateProjectModal(true)}>
                                    新建项目
                                </Button>
                            </Space>
                        </div>

                        {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}

                        {!loading && projects.length === 0 && (
                            <div className="empty-state">
                                <ApiOutlined className="empty-state-icon" />
                                <div>暂无项目，点击"新建项目"创建一个</div>
                            </div>
                        )}

                        {!loading && projects.length > 0 && (
                            <Row gutter={[16, 16]} style={{ padding: '20px' }}>
                                {projects.map(project => (
                                    <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                                        <Card
                                            hoverable
                                            className="project-card"
                                            onClick={() => handleOpenProject(project)}
                                            actions={[
                                                <CloseOutlined key="delete" onClick={(e) => handleDeleteProject(project.id, e)} />,
                                            ]}
                                        >
                                            <Card.Meta
                                                avatar={<ProjectOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                                                title={project.name}
                                                description="点击打开项目"
                                            />
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </div>
                ) : (
                    <div className="project-workspace">
                        <div className="project-sidebar">
                            <div className="sidebar-header">
                                <div className="sidebar-title">
                                    <span>接口列表</span>
                                </div>
                                <Dropdown
                                    menu={{
                                        items: [
                                            { key: 'folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => setCreateFolderModal(true) },
                                            { key: 'request', icon: <FileOutlined />, label: '新建请求', onClick: () => setCreateRequestModal(true) },
                                        ]
                                    }}
                                    trigger={['click']}
                                >
                                    <Button size="small" icon={<PlusOutlined />} />
                                </Dropdown>
                            </div>

                            <div className="sidebar-search">
                                <Input
                                    prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                                    placeholder="搜索接口..."
                                    value={searchKeyword}
                                    onChange={(e) => {
                                        setSearchKeyword(e.target.value);
                                        setSearchVersion(v => v + 1);
                                    }}
                                    allowClear
                                    size="small"
                                    style={{ backgroundColor: '#f5f7fa' }}
                                />
                            </div>

                            <div className="sidebar-filters">
                                <Select
                                    value={filterMethod}
                                    onChange={(value) => setFilterMethod(value)}
                                    size="small"
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'ALL', label: '全部方法' },
                                        { value: 'GET', label: 'GET' },
                                        { value: 'POST', label: 'POST' },
                                        { value: 'PUT', label: 'PUT' },
                                        { value: 'DELETE', label: 'DELETE' },
                                        { value: 'PATCH', label: 'PATCH' },
                                    ]}
                                />
                            </div>

                            <div
                                className={`sidebar-content${(listAnimationEnabled || forceListAnimation) ? ' list-animations-enabled' : ''}${dropTargetFolderPath === currentProject?.path ? ' root-drop-target' : ''}`}
                                onDragOver={(e) => {
                                    if (!draggingNode || !currentProject?.path) return;
                                    const check = checkDropValidity(draggingNode, currentProject.path);
                                    if (!check.ok) {
                                        e.dataTransfer.dropEffect = 'none';
                                        setDropTargetFolderPath(null);
                                        setInvalidDropHint({
                                            message: getDropHintMessage(check.reason),
                                            x: e.clientX + 14,
                                            y: e.clientY + 14,
                                        });
                                        return;
                                    }
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setDropTargetFolderPath(currentProject.path);
                                    setInvalidDropHint(null);
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    if (!draggingNode || !currentProject?.path) return;
                                    const check = checkDropValidity(draggingNode, currentProject.path);
                                    if (!check.ok) {
                                        clearDragState();
                                        return;
                                    }
                                    if (draggingNode.type === 'request') {
                                        await moveRequestNode(draggingNode.path, currentProject.path);
                                    } else {
                                        await moveFolderNode(draggingNode.path, currentProject.path);
                                    }
                                    clearDragState();
                                }}
                            >
                                {loading && <Spin style={{ display: 'block', margin: '20px auto' }} />}
                                {!loading && !currentTree && (
                                    <div className="empty-sidebar">
                                        <ApiOutlined style={{ fontSize: 32, color: '#d0d0db', marginBottom: 12 }} />
                                        <div>暂无接口</div>
                                    </div>
                                )}
                                {!loading && currentTree && renderApiList()}
                            </div>
                        </div>

                        <div className="project-main">
                            {requestTabs.length > 0 && (
                                <Tabs
                                    activeKey={activeRequestTab}
                                    onChange={(key) => {
                                        setActiveRequestTab(key);
                                        const tab = requestTabs.find(t => t.id === key);
                                        if (tab) loadRequestContent(tab.path);
                                    }}
                                    type="editable-card"
                                    hideAdd
                                    onEdit={(targetKey, action) => {
                                        if (action === 'remove') {
                                            handleCloseRequestTab(targetKey as string);
                                        }
                                    }}
                                    items={requestTabs.map(tab => ({
                                        key: tab.id,
                                        label: tab.title,
                                    }))}
                                    size="small"
                                    style={{ marginBottom: 0 }}
                                />
                            )}

                            {currentRequest ? (
                                <div className="request-panel">
                                    <div className="api-request-bar">
                                        <Select
                                            value={apiConfig.method}
                                            onChange={(value) => setApiConfig({ ...apiConfig, method: value })}
                                            style={{ width: 100 }}
                                            options={[
                                                { value: 'GET', label: 'GET' },
                                                { value: 'POST', label: 'POST' },
                                                { value: 'PUT', label: 'PUT' },
                                                { value: 'DELETE', label: 'DELETE' },
                                                { value: 'PATCH', label: 'PATCH' },
                                            ]}
                                        />
                                        <Input
                                            placeholder="输入请求 URL"
                                            value={apiConfig.url}
                                            onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                                            style={{ flex: 1 }}
                                        />
                                        <Button type="primary" onClick={handleExecuteCurl} loading={executing}>
                                            发送
                                        </Button>
                                        <Button onClick={handleSaveRequest}>
                                            保存
                                        </Button>
                                    </div>

                                    <div className="api-config-section">
                                        <Tabs
                                            defaultActiveKey="params"
                                            items={[
                                                {
                                                    key: 'params',
                                                    label: 'Params',
                                                    children: (
                                                        <div className="kv-editor">
                                                            {apiConfig.params.map((param, index) => (
                                                                <div key={index} className="kv-row">
                                                                    <Input
                                                                        placeholder="Key"
                                                                        value={param.key}
                                                                        onChange={(e) => {
                                                                            const newParams = [...apiConfig.params];
                                                                            newParams[index].key = e.target.value;
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                    />
                                                                    <Input
                                                                        placeholder="Value"
                                                                        value={param.value}
                                                                        onChange={(e) => {
                                                                            const newParams = [...apiConfig.params];
                                                                            newParams[index].value = e.target.value;
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        onClick={() => {
                                                                            const newParams = apiConfig.params.filter((_, i) => i !== index);
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="link"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => {
                                                                    setApiConfig({
                                                                        ...apiConfig,
                                                                        params: [...apiConfig.params, { key: '', value: '', enabled: true }]
                                                                    });
                                                                }}
                                                            >
                                                                添加参数
                                                            </Button>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'headers',
                                                    label: 'Headers',
                                                    children: (
                                                        <div className="kv-editor">
                                                            {apiConfig.headers.map((header, index) => (
                                                                <div key={index} className="kv-row">
                                                                    <Input
                                                                        placeholder="Key"
                                                                        value={header.key}
                                                                        onChange={(e) => {
                                                                            const newHeaders = [...apiConfig.headers];
                                                                            newHeaders[index].key = e.target.value;
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        }}
                                                                    />
                                                                    <Input
                                                                        placeholder="Value"
                                                                        value={header.value}
                                                                        onChange={(e) => {
                                                                            const newHeaders = [...apiConfig.headers];
                                                                            newHeaders[index].value = e.target.value;
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        onClick={() => {
                                                                            const newHeaders = apiConfig.headers.filter((_, i) => i !== index);
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="link"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => {
                                                                    setApiConfig({
                                                                        ...apiConfig,
                                                                        headers: [...apiConfig.headers, { key: '', value: '', enabled: true }]
                                                                    });
                                                                }}
                                                            >
                                                                添加请求头
                                                            </Button>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'body',
                                                    label: 'Body',
                                                    children: (
                                                        <div className="body-editor">
                                                            <div className="body-type-selector">
                                                                <Radio.Group
                                                                    value={apiConfig.bodyType || 'none'}
                                                                    onChange={(e) => setApiConfig({ ...apiConfig, bodyType: e.target.value })}
                                                                    optionType="button"
                                                                    buttonStyle="solid"
                                                                >
                                                                    <Radio.Button value="none">none</Radio.Button>
                                                                    <Radio.Button value="form-data">form-data</Radio.Button>
                                                                    <Radio.Button value="x-www-form-urlencoded">x-www-form-urlencoded</Radio.Button>
                                                                    <Radio.Button value="json">JSON</Radio.Button>
                                                                    <Radio.Button value="xml">XML</Radio.Button>
                                                                    <Radio.Button value="raw">Raw</Radio.Button>
                                                                    <Radio.Button value="binary">Binary</Radio.Button>
                                                                </Radio.Group>
                                                            </div>
                                                            {apiConfig.bodyType === 'none' && (
                                                                <div className="body-empty">This request does not have a body</div>
                                                            )}
                                                            {(apiConfig.bodyType === 'form-data' || apiConfig.bodyType === 'x-www-form-urlencoded') && (
                                                                <div className="kv-editor">
                                                                    {(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded).map((item: any, index: number) => (
                                                                        <div key={index} className="kv-row">
                                                                            <Input
                                                                                placeholder="Key"
                                                                                value={item.key}
                                                                                onChange={(e) => {
                                                                                    const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                                                                    newData[index].key = e.target.value;
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                }}
                                                                            />
                                                                            <Input
                                                                                placeholder="Value"
                                                                                value={item.value}
                                                                                onChange={(e) => {
                                                                                    const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                                                                    newData[index].value = e.target.value;
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                type="text"
                                                                                danger
                                                                                onClick={() => {
                                                                                    const newData = (apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded).filter((_: any, i: number) => i !== index);
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button
                                                                        type="link"
                                                                        icon={<PlusOutlined />}
                                                                        onClick={() => {
                                                                            const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded), { key: '', value: '' }];
                                                                            setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                ? { ...apiConfig, formData: newData }
                                                                                : { ...apiConfig, urlencoded: newData });
                                                                        }}
                                                                    >
                                                                        添加字段
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {(apiConfig.bodyType === 'json' || apiConfig.bodyType === 'xml' || apiConfig.bodyType === 'raw') && (
                                                                <Input.TextArea
                                                                    placeholder={apiConfig.bodyType === 'json' ? '{\n  "key": "value"\n}' : apiConfig.bodyType === 'xml' ? '<root>\n  <key>value</key>\n</root>' : 'Raw body content'}
                                                                    value={apiConfig.body}
                                                                    onChange={(e) => setApiConfig({ ...apiConfig, body: e.target.value })}
                                                                    style={{
                                                                        fontFamily: 'monospace',
                                                                        minHeight: 150,
                                                                        marginTop: 12
                                                                    }}
                                                                />
                                                            )}
                                                            {apiConfig.bodyType === 'binary' && (
                                                                <div className="body-binary">
                                                                    <Input type="file" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ),
                                                },
                                            ]}
                                        />
                                    </div>

                                    {response && (
                                        <div className="response-panel">
                                            <div className="response-header">
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    background: getStatusColor(response.status_code) + '20',
                                                    color: getStatusColor(response.status_code),
                                                    border: `1px solid ${getStatusColor(response.status_code)}40`
                                                }}>
                                                    {response.status_code}
                                                </span>
                                                <span className="duration">{response.duration}ms</span>
                                            </div>
                                            <div className="response-body">
                                                <pre className="response-content">
                                                    {response.body || response.error || 'No response body'}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <ApiOutlined className="empty-state-icon" />
                                    <div>选择一个请求开始测试</div>
                                </div>
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

            <Modal
                title="创建新项目"
                open={createProjectModal}
                onOk={handleCreateProject}
                onCancel={() => { setCreateProjectModal(false); setNewProjectName(''); }}
            >
                <Input
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onPressEnter={handleCreateProject}
                />
            </Modal>

            <Modal
                title="创建文件夹"
                open={createFolderModal}
                onOk={handleCreateFolder}
                onCancel={() => { setCreateFolderModal(false); setNewFolderName(''); }}
            >
                <Input
                    placeholder="输入文件夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onPressEnter={handleCreateFolder}
                />
            </Modal>

            <Modal
                title="创建请求"
                open={createRequestModal}
                onOk={handleCreateRequest}
                onCancel={() => { setCreateRequestModal(false); setNewRequestName(''); }}
            >
                <Input
                    placeholder="输入请求名称"
                    value={newRequestName}
                    onChange={(e) => setNewRequestName(e.target.value)}
                    onPressEnter={handleCreateRequest}
                />
            </Modal>

            <Modal
                title={renameType === 'request' ? '重命名请求' : '重命名文件夹'}
                open={renameModal}
                onOk={handleRename}
                onCancel={() => { setRenameModal(false); setRenamePath(''); setRenameValue(''); }}
            >
                <Input
                    ref={renameInputRef}
                    placeholder="输入新名称"
                    value={renameValue}
                    onChange={(e) => setRenameValue(trimRightSpaces(e.target.value))}
                    onPressEnter={handleRename}
                />
            </Modal>

        </div>
    );
}

export default App;
