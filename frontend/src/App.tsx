import React, { useState, useEffect } from 'react';
import { Button, Space, Modal, Input, message, Spin, Tree, Dropdown, Tabs, Card, Col, Row, Select, Collapse, Empty, Radio, InputRef } from 'antd';
import { PlusOutlined, ApiOutlined, ProjectOutlined, FolderOutlined, FileOutlined, CloseOutlined, HomeOutlined, DragOutlined, SearchOutlined, RightOutlined, DownOutlined, MoreOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import './App.css';
import { TitleBar } from './components/TitleBar';
import { ListProjects, CreateProject, DeleteProject, GetProjectTree, CreateFolder, CreateRequest, GetRequest, DeleteRequest, DeleteFolder, ExecuteCurl, UpdateRequest } from '../wailsjs/go/main/App';

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
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [apiConfig, setApiConfig] = useState<ApiConfig>({
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
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const searchInputRef = React.useRef<InputRef>(null);

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

        if (tree.type === 'request') {
            const matchKeyword = !keyword || tree.name.toLowerCase().includes(keyword.toLowerCase());
            const matchMethod = method === 'ALL' || tree.method === method;
            if (matchKeyword && matchMethod) return tree;
            return null;
        }

        const filteredChildren = tree.children
            ?.map(child => filterTreeNodes(child, keyword, method))
            .filter(child => child !== null) as ProjectTree[];

        if (filteredChildren && filteredChildren.length > 0) {
            return { ...tree, children: filteredChildren };
        }
        return null;
    };

    const renderApiList = () => {
        if (!currentTree) return null;

        const filteredTree = filterTreeNodes(currentTree, searchKeyword, filterMethod);
        if (!filteredTree) return null;

        const renderRequestItem = (api: any) => (
            <div
                key={api.path}
                className={`api-item ${currentRequest?.path === api.path ? 'active' : ''}`}
                onClick={() => handleTreeItemClick(api)}
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
                        className="api-folder-header"
                        onClick={() => toggleFolderCollapse(folder.path || folder.id)}
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
    }, []);

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
            setActiveTab(existingTab.id);
        } else {
            const newTab: ProjectTab = {
                id: project.id,
                title: project.name,
                project: project,
            };
            setProjectTabs([...projectTabs, newTab]);
            setActiveTab(newTab.id);

            setLoading(true);
            try {
                const tree = await GetProjectTree(project.id);
                setProjectTrees(prev => ({ ...prev, [project.id]: tree }));
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
        if (activeTab === tabId) {
            const remaining = projectTabs.filter(t => t.id !== tabId);
            if (remaining.length > 0) {
                setActiveTab(remaining[0].id);
            } else {
                setActiveTab('home');
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

    const moveRequest = async (dragPath: string, targetFolderPath: string) => {
        if (!currentProject) return;
        try {
            const request = await GetRequest(dragPath);
            const fileName = dragPath.split(/[/\\]/).pop();
            await CreateRequest(currentProject.id, targetFolderPath, request.name, request.content);
            await DeleteRequest(dragPath);
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            message.success('接口移动成功');
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

    const tabItems = [
        {
            key: 'home',
            label: '首页',
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
                onTabChange={(key) => {
                    setActiveTab(key);
                    if (key === 'home') {
                        setCurrentRequest(null);
                        setRequestContent('');
                        setResponse(null);
                        setRequestTabs([]);
                        setActiveRequestTab('');
                    }
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
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateProjectModal(true)}>
                                新建项目
                            </Button>
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
                                    onChange={(e) => setSearchKeyword(e.target.value)}
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

                            <div className="sidebar-content">
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

        </div>
    );
}

export default App;
