import React from 'react';
import { Card, Col, Dropdown, Empty, Row, Select, Spin, message } from 'antd';
import {
    ApiOutlined, CloseOutlined, CopyOutlined, DownOutlined, EditOutlined, FolderOutlined,
    HomeOutlined, MoreOutlined, ProjectOutlined, RightOutlined
} from '@ant-design/icons';
import type { Project } from '../../types';
import { ProjectSearchBar } from './ProjectSearchBar';
import { EmptyState } from './EmptyState';

interface GroupedProject {
    groupName: string;
    projects: Project[];
}

interface HomePageProps {
    projects: Project[];
    loading: boolean;
    searchKeyword: string;
    projectGroups: string[];
    projectGroupAssignments: Record<string, string>;
    collapsedProjectGroups: Set<string>;
    draggingProjectId: string | null;
    projectDropTargetGroup: string | null;
    groupSortDropTarget: string | null;
    draggingGroupName: string | null;
    createGroupModal: boolean;
    createProjectModal: boolean;
    uploadProps: any;
    importing: boolean;
    DEFAULT_PROJECT_GROUP: string;
    onSearchChange: (keyword: string) => void;
    onCreateGroup: () => void;
    onCreateProject: () => void;
    onAssignProjectGroup: (projectId: string, groupName: string) => void;
    onToggleGroupCollapse: (groupName: string) => void;
    onGroupDragStart: (groupName: string, e: React.DragEvent) => void;
    onGroupDragOver: (groupName: string, e: React.DragEvent) => void;
    onGroupDrop: (groupName: string, e: React.DragEvent) => void;
    onDragEnd: () => void;
    onOpenProject: (project: Project) => void;
    onDeleteProject: (projectId: string, e?: React.MouseEvent) => void;
    onRenameProject: (project: Project, e?: React.MouseEvent) => void;
    onCreateGroupWithName: (name: string) => void;
    onDeleteGroup: (groupName: string) => void;
    onOpenRenameGroupModal: (groupName: string) => void;
    onSetDraggingProjectId: (id: string | null) => void;
    onSetProjectDropTargetGroup: (group: string | null) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
    projects,
    loading,
    searchKeyword,
    projectGroups,
    projectGroupAssignments,
    collapsedProjectGroups,
    draggingProjectId,
    projectDropTargetGroup,
    groupSortDropTarget,
    draggingGroupName,
    createGroupModal,
    createProjectModal,
    uploadProps,
    importing,
    DEFAULT_PROJECT_GROUP,
    onSearchChange,
    onCreateGroup,
    onCreateProject,
    onAssignProjectGroup,
    onToggleGroupCollapse,
    onGroupDragStart,
    onGroupDragOver,
    onGroupDrop,
    onDragEnd,
    onOpenProject,
    onDeleteProject,
    onRenameProject,
    onCreateGroupWithName,
    onDeleteGroup,
    onOpenRenameGroupModal,
    onSetDraggingProjectId,
    onSetProjectDropTargetGroup,
}) => {
    // Group projects
    const groupedProjects: GroupedProject[] = React.useMemo(() => {
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
    }, [projects, projectGroups, projectGroupAssignments, DEFAULT_PROJECT_GROUP]);

    // Filter by search keyword
    const filteredProjects = React.useMemo(() => {
        if (!searchKeyword) return groupedProjects;
        const keyword = searchKeyword.toLowerCase();
        return groupedProjects
            .map(group => ({
                ...group,
                projects: group.projects.filter(p =>
                    p.name.toLowerCase().includes(keyword)
                ),
            }))
            .filter(group => group.projects.length > 0 || group.groupName.toLowerCase().includes(keyword));
    }, [groupedProjects, searchKeyword]);

    return (
        <div className="home-page">
            <ProjectSearchBar
                searchKeyword={searchKeyword}
                onSearchChange={onSearchChange}
                onCreateGroup={onCreateGroup}
                onCreateProject={onCreateProject}
                uploadProps={uploadProps}
                importing={importing}
                onImport={() => {}}
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
                                onAssignProjectGroup(draggingProjectId, group.groupName);
                                message.success(`已移动到分组：${group.groupName}`);
                            }}
                        >
                            <div
                                className={`project-group-header${groupSortDropTarget === group.groupName ? ' sort-drop-target' : ''}`}
                                draggable={group.groupName !== DEFAULT_PROJECT_GROUP}
                                onDragStart={(e) => onGroupDragStart(group.groupName, e)}
                                onDragOver={(e) => onGroupDragOver(group.groupName, e)}
                                onDrop={(e) => onGroupDrop(group.groupName, e)}
                                onDragEnd={onDragEnd}
                                onClick={() => onToggleGroupCollapse(group.groupName)}
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
                                                        onOpenRenameGroupModal(group.groupName);
                                                    },
                                                },
                                                {
                                                    key: 'delete',
                                                    icon: <FolderOutlined />,
                                                    label: '删除分组',
                                                    danger: true,
                                                    onClick: () => {
                                                        onDeleteGroup(group.groupName);
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
                                                            onSetDraggingProjectId(project.id);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                        }}
                                                        onDragEnd={() => {
                                                            onSetDraggingProjectId(null);
                                                            onSetProjectDropTargetGroup(null);
                                                        }}
                                                        onClick={() => onOpenProject(project)}
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
                                                                            onRenameProject(project);
                                                                        }
                                                                    },
                                                                    {
                                                                        key: 'delete',
                                                                        icon: <CloseOutlined />,
                                                                        label: '删除',
                                                                        danger: true,
                                                                        onClick: ({ domEvent }) => {
                                                                            domEvent.stopPropagation();
                                                                            onDeleteProject(project.id);
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
                                                                onChange={(value) => onAssignProjectGroup(project.id, value)}
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
        </div>
    );
};
