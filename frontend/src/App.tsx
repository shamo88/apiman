import { useState, useEffect } from 'react';
import { Button, Space, Modal, Input, message, Spin } from 'antd';
import { PlusOutlined, ApiOutlined, ProjectOutlined } from '@ant-design/icons';
import './App.css';
import { ListProjects, CreateProject, DeleteProject, GetProjectTree } from '../wailsjs/go/main/App';

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

function App() {
    const [status, setStatus] = useState('Initializing...');
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectTrees, setProjectTrees] = useState<Record<string, ProjectTree>>({});
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const projectList = await ListProjects();
            setProjects(projectList || []);

            const trees: Record<string, ProjectTree> = {};
            for (const project of (projectList || [])) {
                try {
                    const tree = await GetProjectTree(project.id);
                    trees[project.id] = tree;
                } catch (e) {
                    console.error('Error loading project tree:', e);
                }
            }
            setProjectTrees(trees);

            setStatus(`Loaded ${(projectList || []).length} projects`);
        } catch (error: any) {
            console.error('Failed to load projects:', error);
            setStatus(`Error: ${error?.message || error}`);
            message.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            message.warning('Please enter project name');
            return;
        }

        try {
            await CreateProject(newProjectName);
            message.success('Project created successfully');
            setCreateModalVisible(false);
            setNewProjectName('');
            loadProjects();
        } catch (error: any) {
            console.error('Failed to create project:', error);
            message.error(`Failed to create project: ${error?.message || error}`);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        Modal.confirm({
            title: 'Delete Project',
            content: 'Are you sure you want to delete this project?',
            onOk: async () => {
                try {
                    await DeleteProject(projectId);
                    message.success('Project deleted');
                    loadProjects();
                } catch (error: any) {
                    message.error(`Failed to delete: ${error?.message || error}`);
                }
            }
        });
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <ApiOutlined style={{ marginRight: 8 }} />
                <span>Apiman - API Management Tool</span>
            </div>

            <div className="app-content">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <span style={{ fontWeight: 500 }}>Projects</span>
                        <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalVisible(true)}
                        >
                            New
                        </Button>
                    </div>
                    <div className="sidebar-content">
                        {loading && <Spin style={{ display: 'block', margin: '20px auto' }} />}

                        {!loading && projects.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                No projects yet. Click "New" to create one.
                            </div>
                        )}

                        {projects.map(project => (
                            <div key={project.id} className="tree-item">
                                <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                <span className="tree-item-name" style={{ flex: 1 }}>{project.name}</span>
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    onClick={() => handleDeleteProject(project.id)}
                                    style={{ fontSize: '12px', height: 'auto', padding: '0 4px' }}
                                >
                                    ×
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main-area">
                    <div className="empty-state">
                        <ApiOutlined className="empty-state-icon" />
                        <div>Select a project or request to start</div>
                        <Space style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setCreateModalVisible(true)}
                            >
                                Create Project
                            </Button>
                        </Space>
                    </div>
                </div>
            </div>

            <Modal
                title="Create New Project"
                open={createModalVisible}
                onOk={handleCreateProject}
                onCancel={() => {
                    setCreateModalVisible(false);
                    setNewProjectName('');
                }}
            >
                <Input
                    placeholder="Enter project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onPressEnter={handleCreateProject}
                />
            </Modal>

            <div style={{
                padding: '10px 20px',
                background: '#e6f7ff',
                borderTop: '1px solid #91d5ff',
                fontSize: '14px'
            }}>
                Status: {status}
            </div>
        </div>
    );
}

export default App;
