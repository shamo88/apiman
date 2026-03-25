import { useState, useEffect } from 'react';
import { Button, Space, Modal, Input, message, Spin, Tree, Dropdown, Tabs, Card, Col, Row } from 'antd';
import { PlusOutlined, ApiOutlined, ProjectOutlined, FolderOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import './App.css';
import { ListProjects, CreateProject, DeleteProject, GetProjectTree, CreateFolder, CreateRequest, GetRequest, DeleteRequest, DeleteFolder, ExecuteCurl } from '../wailsjs/go/main/App';

interface Project {
    id: string;
    name: string;
    path: string;
}

interface ProjectTree {
    id: string;
    name: string;
    type: string;
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

        try {
            await CreateFolder(currentProject.id, currentProject.path, newFolderName);
            message.success('文件夹创建成功');
            setCreateFolderModal(false);
            setNewFolderName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const handleCreateRequest = async () => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!newRequestName.trim() || !currentProject) {
            message.warning('请先选择一个项目');
            return;
        }

        try {
            await CreateRequest(currentProject.id, currentProject.path, newRequestName, '# curl 命令\ncurl ');
            message.success('请求创建成功');
            setCreateRequestModal(false);
            setNewRequestName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const handleTreeItemClick = async (treeNode: ProjectTree) => {
        if (treeNode.type === 'request' && treeNode.path) {
            const existingTab = requestTabs.find(t => t.path === treeNode.path);
            if (existingTab) {
                setActiveRequestTab(existingTab.id);
            } else {
                const newTab: RequestTab = {
                    id: `request-${Date.now()}`,
                    title: treeNode.name,
                    path: treeNode.path,
                };
                setRequestTabs([...requestTabs, newTab]);
                setActiveRequestTab(newTab.id);
            }

            setLoading(true);
            try {
                const request = await GetRequest(treeNode.path);
                setCurrentRequest(request);
                setRequestContent(request.content);
                setResponse(null);
            } catch (error: any) {
                console.error('Failed to load request:', error);
                message.error('加载请求失败');
            } finally {
                setLoading(false);
            }
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
        if (!requestContent.trim()) {
            message.warning('请输入 curl 命令');
            return;
        }

        setExecuting(true);
        setResponse(null);
        try {
            const result = await ExecuteCurl(requestContent);
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
            await import('../wailsjs/go/main/App').then(module => {
                module.UpdateRequest(currentRequest!.path, requestContent);
            });
            message.success('请求已保存');
            setStatus('请求已保存');
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
            <div className="app-header">
                <span style={{ fontWeight: 500, fontSize: '16px', marginRight: 16 }}>API 管理工具</span>
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => {
                        setActiveTab(key);
                        if (key === 'home') {
                            setCurrentRequest(null);
                            setRequestContent('');
                            setResponse(null);
                            setRequestTabs([]);
                            setActiveRequestTab('');
                        }
                    }}
                    type="editable-card"
                    hideAdd
                    onEdit={(targetKey, action) => {
                        if (action === 'remove' && targetKey !== 'home') {
                            handleCloseProjectTab(targetKey as string);
                        }
                    }}
                    items={tabItems}
                    style={{ flex: 1 }}
                />
            </div>

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
                                <span style={{ fontWeight: 500 }}>接口列表</span>
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
                            <div className="sidebar-content">
                                {loading && <Spin style={{ display: 'block', margin: '20px auto' }} />}
                                {currentTree && (
                                    <Tree
                                        treeData={currentTree.children?.map(child => convertTreeToDataNode(child))}
                                        showIcon={false}
                                        expandedKeys={expandedKeys}
                                        onExpand={(keys) => setExpandedKeys(keys as string[])}
                                    />
                                )}
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
                                    <div className="toolbar">
                                        <Button type="primary" icon={<ApiOutlined />} onClick={handleExecuteCurl} loading={executing}>
                                            发送
                                        </Button>
                                        <Button icon={<PlusOutlined />} onClick={handleSaveRequest}>
                                            保存
                                        </Button>
                                    </div>

                                    <div className="request-editor">
                                        <Input.TextArea
                                            value={requestContent}
                                            onChange={(e) => setRequestContent(e.target.value)}
                                            placeholder="输入 curl 命令，例如: curl https://api.example.com/users"
                                            style={{ height: '100%', fontFamily: 'Monaco, Menlo, monospace', fontSize: 13 }}
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
