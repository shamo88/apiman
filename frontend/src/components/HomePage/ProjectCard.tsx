import React, { DragEvent, useCallback } from 'react';
import { Card, Button, Dropdown, Select } from 'antd';
import type { MenuProps } from 'antd';
import { ApiOutlined, EditOutlined, DeleteOutlined, EllipsisOutlined, CopyOutlined } from '@ant-design/icons';
import { useProjectStore, Project } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { ContextMenu, useContextMenu } from '../ContextMenu';
import './HomePage.css';

interface ProjectCardProps {
  project: Project;
  onProjectOpen: (project: Project) => void;
  setRenameProject: (val: { id: string; name: string } | null) => void;
  setRenameModal: (val: boolean) => void;
  handleDeleteProject: (projectId: string) => void;
  handleDragStart: (e: DragEvent, projectId: string) => void;
  handleAssignGroup: (projectId: string, groupName: string) => void;
  handleRemoveFromGroup: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onProjectOpen,
  setRenameProject,
  setRenameModal,
  handleDeleteProject,
  handleDragStart,
  handleAssignGroup,
  handleRemoveFromGroup,
}) => {
  const { projectGroups, projectGroupAssignments } = useProjectStore();
  const { draggingProjectId } = useUIStore();

  const currentGroup = projectGroupAssignments[project.id];
  const groupOptions = projectGroups.map(g => ({ label: g, value: g }));
  const isDragging = draggingProjectId === project.id;

  const actionMenu: MenuProps['items'] = [
    {
      key: 'rename',
      label: '重命名',
      icon: <EditOutlined />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        setRenameProject({ id: project.id, name: project.name });
        setRenameModal(true);
      },
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleDeleteProject(project.id);
      },
    },
  ];

  // Right-click context menu
  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'copy',
        icon: <CopyOutlined />,
        label: '复制项目',
        onClick: () => {
          // TODO: 实现复制功能
        },
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: () => {
          setRenameProject({ id: project.id, name: project.name });
          setRenameModal(true);
        },
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDeleteProject(project.id),
      },
    ],
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    contextMenuProps.onContextMenu(e);
  }, [contextMenuProps]);

  return (
    <>
      {contextMenu}
      <Card
        key={project.id}
        className={`project-card ${isDragging ? 'dragging' : ''}`}
        size="small"
        draggable
        onClick={() => onProjectOpen(project)}
        onDragStart={(e) => handleDragStart(e, project.id)}
        onContextMenu={handleContextMenu}
      >
      <div className="project-card-content">
        <div className="project-card-header">
          <div className="project-card-icon">
            <ApiOutlined />
          </div>
          <div className="project-card-info">
            <div className="project-card-name">{project.name}</div>
          </div>
          <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: actionMenu }} trigger={['click']} placement="bottomRight">
              <Button
                type="text"
                size="small"
                className="action-btn"
                icon={<EllipsisOutlined />}
              />
            </Dropdown>
          </div>
        </div>
        <div className="project-card-group" onClick={(e) => e.stopPropagation()}>
          <Select
            size="small"
            placeholder="选择分组"
            value={currentGroup}
            options={groupOptions}
            onChange={(value) => handleAssignGroup(project.id, value)}
            style={{ width: '100%' }}
            allowClear
            onClear={() => handleRemoveFromGroup(project.id)}
          />
        </div>
      </div>
    </Card>
    </>
  );
};
