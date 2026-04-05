import React, { useMemo } from 'react';
import { Card, Col, Dropdown, Empty, Row, Select, Spin, message } from 'antd';
import {
    CloseOutlined, CopyOutlined, DownOutlined, EditOutlined, FolderOutlined,
    MoreOutlined, ProjectOutlined, RightOutlined
} from '@ant-design/icons';
import type { Project } from '../../types';
import { ProjectSearchBar } from './ProjectSearchBar';
import { EmptyState } from './EmptyState';
import { useProjects } from '../../hooks/useProjects';
import { useProjectContext } from '../../contexts/ProjectContext';
import { DEFAULT_PROJECT_GROUP } from '../../types';
import { CreateProjectModal, CreateGroupModal } from '../modals';

interface GroupedProject {
    groupName: string;
    projects: Project[];
}

export const HomePage: React.FC = () => {
    const { openProject } = useProjectContext();
    const {
        projects,
        loading,
        projectGroups,
        projectGroupAssignments,
        collapsedProjectGroups,
        draggingProjectId,
        projectDropTargetGroup,
        groupSortDropTarget,
        handleAssignProjectGroup,
        toggleProjectGroupCollapse,
        handleGroupDragStart,
        handleGroupDragOver,
        handleGroupDrop,
        handleDeleteProject,
        openRenameProjectModal,
        createGroupWithName,
        handleDeleteProjectGroup,
        openRenameProjectGroupModal,
        handleImportPostman,
        setProjectSearchKeyword,
        projectSearchKeyword,
        createProjectModal,
        createGroupModal,
        setCreateGroupModal,
        setCreateProjectModal,
        createProjectWithName,
        setDraggingProjectId,
        setProjectDropTargetGroup,
        setDraggingGroupName,
        setGroupSortDropTarget,
    } = useProjects();

    // Group projects
    const groupedProjects: GroupedProject[] = useMemo(() => {
        const bucket: Record<string, Project[]> = {};
        const orderedGroups = [...projectGroups, DEFAULT_PROJECT_GROUP];

        // Assign projects to groups
        projects.forEach(project => {
            const assigned = projectGroupAssignments[project.id];
            const groupName = assigned && projectGroups.includes(assigned) ? assigned : DEFAULT_PROJECT_GROUP;
            if (!bucket[groupName]) bucket[groupName] = [];
            bucket[groupName].push(project);
        });

        // Build result with proper order - include ALL groups
        return orderedGroups
            .map(groupName => ({
                groupName,
                projects: bucket[groupName] || [],
            }));
    }, [projects, projectGroups, projectGroupAssignments]);

    // Filter by search keyword
    const filteredProjects = useMemo(() => {
        if (!projectSearchKeyword) return groupedProjects;
        const keyword = projectSearchKeyword.toLowerCase();
        return groupedProjects
            .map(group => ({
                ...group,
                projects: group.projects.filter(p =>
                    p.name.toLowerCase().includes(keyword)
                ),
            }))
            .filter(group => group.projects.length > 0 || group.groupName.toLowerCase().includes(keyword));
    }, [groupedProjects, projectSearchKeyword]);

    const handleDragEnd = () => {
        setDraggingGroupName(null);
        setGroupSortDropTarget(null);
    };

    return (
        <div className="home-page">
            <ProjectSearchBar
                searchKeyword={projectSearchKeyword}
                onSearchChange={setProjectSearchKeyword}
                onImport={handleImportPostman}
                onCreateGroup={() => setCreateGroupModal(true)}
                onCreateProject={() => setCreateProjectModal(true)}
            />

            {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}

            {!loading && projects.length === 0 && (
                <EmptyState text='暂无项目，点击"新建项目"创建一个' />
            )}

            {!loading && projects.length > 0 && filteredProjects.length === 0 && (
                <EmptyState text="没有匹配的项目" />
            )}

            {!loading && groupedProjects.length > 0 && (
                <div className="project-group-list">
                    {filteredProjects.map(group => (
                        <div
                            className={`project-group-section${projectDropTargetGroup === group.groupName ? ' drag-over' : ''}`}
                            key={group.groupName}
                            onDragOver={(e) => {
                                if (!draggingProjectId) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDragLeave={() => {}}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (!draggingProjectId) return;
                                handleAssignProjectGroup(draggingProjectId, group.groupName);
                                message.success(`已移动到分组：${group.groupName}`);
                            }}
                        >
                            <div
                                className={`project-group-header${groupSortDropTarget === group.groupName ? ' sort-drop-target' : ''}`}
                                draggable={group.groupName !== DEFAULT_PROJECT_GROUP}
                                onDragStart={(e) => handleGroupDragStart(group.groupName, e)}
                                onDragOver={(e) => handleGroupDragOver(group.groupName, e)}
                                onDrop={(e) => handleGroupDrop(group.groupName, e)}
                                onDragEnd={handleDragEnd}
                                onClick={() => toggleProjectGroupCollapse(group.groupName)}
                            >
                                <div className="project-group-header-left">
                                    <span className="project-group-toggle-icon">
                                        {collapsedProjectGroups.has(group.groupName) ? <RightOutlined /> : <DownOutlined />}
                                    </span>
                                    <span className="project-group-title">{group.groupName}</span>
                                    <span className="project-group-count">{group.projects.length} 个</span>
                                </div>
                                {group.groupName !== DEFAULT_PROJECT_GROUP && (
                                    <Dropdown
                                        trigger={['click']}
                                        menu={{
                                            items: [
                                                {
                                                    key: 'rename',
                                                    icon: <EditOutlined />,
                                                    label: '重命名分组',
                                                    onClick: () => {
                                                        openRenameProjectGroupModal(group.groupName);
                                                    },
                                                },
                                                {
                                                    key: 'delete',
                                                    icon: <FolderOutlined />,
                                                    label: '删除分组',
                                                    danger: true,
                                                    onClick: () => {
                                                        handleDeleteProjectGroup(group.groupName);
                                                    },
                                                },
                                            ],
                                        }}
                                    >
                                        <button
                                            className="project-group-action-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreOutlined />
                                        </button>
                                    </Dropdown>
                                )}
                            </div>

                            {!collapsedProjectGroups.has(group.groupName) && (
                                <>
                                    {group.projects.length > 0 && (
                                        <Row gutter={[16, 16]} style={{ padding: '12px 20px 20px' }} className="project-group-cards">
                                            {group.projects.map(project => (
                                                <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                                                    <Card
                                                        hoverable
                                                        draggable
                                                        className="project-card"
                                                        onDragStart={(e) => {
                                                            e.stopPropagation();
                                                            setDraggingProjectId(project.id);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                        }}
                                                        onDragEnd={() => {
                                                            setDraggingProjectId(null);
                                                            setProjectDropTargetGroup(null);
                                                        }}
                                                        onClick={() => openProject(project)}
                                                    >
                                                        <Dropdown
                                                            trigger={['click']}
                                                            menu={{
                                                                items: [
                                                                    {
                                                                        key: 'rename',
                                                                        icon: <EditOutlined />,
                                                                        label: '重命名',
                                                                        onClick: ({ domEvent }) => {
                                                                            domEvent.stopPropagation();
                                                                            openRenameProjectModal(project);
                                                                        }
                                                                    },
                                                                    {
                                                                        key: 'delete',
                                                                        icon: <CloseOutlined />,
                                                                        label: '删除',
                                                                        danger: true,
                                                                        onClick: ({ domEvent }) => {
                                                                            domEvent.stopPropagation();
                                                                            handleDeleteProject(project.id);
                                                                        }
                                                                    },
                                                                ]
                                                            }}
                                                        >
                                                            <button className="project-card-menu-btn" onClick={(e) => e.stopPropagation()}>
                                                                <MoreOutlined />
                                                            </button>
                                                        </Dropdown>
                                                        <Card.Meta
                                                            avatar={<ProjectOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                                                            title={project.name}
                                                            description="点击打开项目"
                                                        />
                                                        <div className="project-group-select-row" onClick={(e) => e.stopPropagation()}>
                                                            <span className="project-group-select-label">分组</span>
                                                            <Select
                                                                size="small"
                                                                value={projectGroupAssignments[project.id] || DEFAULT_PROJECT_GROUP}
                                                                onChange={(value) => handleAssignProjectGroup(project.id, value)}
                                                                options={[
                                                                    { label: DEFAULT_PROJECT_GROUP, value: DEFAULT_PROJECT_GROUP },
                                                                    ...projectGroups.map(groupName => ({ label: groupName, value: groupName })),
                                                                ]}
                                                                style={{ width: 140 }}
                                                            />
                                                        </div>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    )}
                                    {group.projects.length === 0 && (
                                        <div className="project-group-empty-drop-zone">
                                            暂无项目，可将项目卡片拖拽到此分组
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <CreateProjectModal
                visible={createProjectModal}
                onClose={() => setCreateProjectModal(false)}
                onConfirm={createProjectWithName}
            />

            <CreateGroupModal
                visible={createGroupModal}
                onClose={() => setCreateGroupModal(false)}
                onConfirm={createGroupWithName}
            />
        </div>
    );
};
