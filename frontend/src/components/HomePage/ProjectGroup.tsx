import React, { DragEvent } from 'react';
import { Button } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Project } from '../../store';
import { ProjectCard } from './ProjectCard';

interface ProjectGroupProps {
  groupName: string;
  isCollapsed: boolean;
  projectsInGroup: Project[];
  isDragOver: boolean;
  onToggleCollapse: () => void;
  onOpenRenameModal: () => void;
  onDeleteGroup: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  // ProjectCard handlers
  onProjectOpen: (project: Project) => void;
  setRenameProject: (val: { id: string; name: string } | null) => void;
  setRenameModal: (val: boolean) => void;
  handleDeleteProject: (projectId: string) => void;
  handleDragStart: (e: DragEvent, projectId: string) => void;
  handleAssignGroup: (projectId: string, groupName: string) => void;
  handleRemoveFromGroup: (projectId: string) => void;
}

export const ProjectGroup: React.FC<ProjectGroupProps> = ({
  groupName,
  isCollapsed,
  projectsInGroup,
  isDragOver,
  onToggleCollapse,
  onOpenRenameModal,
  onDeleteGroup,
  onDragOver,
  onDragLeave,
  onDrop,
  onProjectOpen,
  setRenameProject,
  setRenameModal,
  handleDeleteProject,
  handleDragStart,
  handleAssignGroup,
  handleRemoveFromGroup,
}) => {
  return (
    <div key={groupName} className="project-group">
      <div
        className="project-group-header"
        onClick={onToggleCollapse}
      >
        <span className={`group-toggle ${isCollapsed ? 'collapsed' : ''}`}>
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span className="group-name">{groupName}</span>
        <span className="group-count">({projectsInGroup.length})</span>
        <div className="group-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={onOpenRenameModal}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={onDeleteGroup}
          />
        </div>
      </div>
      {!isCollapsed && (
        <div
          className={`project-group-content ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {projectsInGroup.length === 0 ? (
            <div className="project-group-empty-drop-zone">
              拖动项目到此处
            </div>
          ) : ""}
          {projectsInGroup.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectOpen={onProjectOpen}
              setRenameProject={setRenameProject}
              setRenameModal={setRenameModal}
              handleDeleteProject={handleDeleteProject}
              handleDragStart={handleDragStart}
              handleAssignGroup={handleAssignGroup}
              handleRemoveFromGroup={handleRemoveFromGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
};
