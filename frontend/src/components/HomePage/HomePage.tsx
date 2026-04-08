import React, { useState, useEffect, DragEvent } from 'react';
import { Button, Empty, Input, message, Modal, Spin, Tooltip, Upload, Menu } from 'antd';
import type { UploadProps } from 'antd';
import { PlusOutlined, SearchOutlined, FolderOutlined, DeleteOutlined, EditOutlined, HomeOutlined, ImportOutlined, ClockCircleOutlined, ApiOutlined } from '@ant-design/icons';
import { useProjectStore, Project } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { CreateProject, DeleteProject, RenameProject, LoadProjectGroupsState, SaveProjectGroupsState, ListProjects, ImportPostmanCollection, ParseOpenAPICollection, ImportOpenAPICollection } from '../../../wailsjs/go/main/App';
import { ProjectCard } from './ProjectCard';
import { ProjectGroup } from './ProjectGroup';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { RenameProjectModal } from '../modals/RenameProjectModal';
import { RenameGroupModal } from '../modals/RenameGroupModal';
import { ImportOpenAPIModal } from '../modals/ImportOpenAPIModal';
import './HomePage.css';

interface CollectionItem {
  id: string;
  name: string;
  item?: CollectionItem[];
  request?: {
    method: string;
    url?: { raw: string };
  };
}

interface HomePageProps {
  onProjectOpen: (project: Project) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onProjectOpen }) => {
  const {
    projects,
    projectGroups,
    projectGroupAssignments,
    collapsedProjectGroups,
    setProjects,
    setProjectGroups,
    assignProjectGroup,
    removeProjectFromGroup,
    renameGroup,
    deleteGroup,
    toggleProjectGroupCollapse,
    setProjectSearchKeyword,
    projectSearchKeyword,
    setProjectGroupsLoaded,
    setLoading: setStoreLoading,
    recentProjects,
    addToRecentProjects,
    removeFromRecentProjects,
  } = useProjectStore();

  const { openCreateProjectModal, closeCreateProjectModal, createProjectModal, setDraggingProjectId, draggingProjectId: uiDraggingProjectId } = useUIStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [renameProject, setRenameProject] = useState<{ id: string; name: string } | null>(null);
  const [renameGroupModal, setRenameGroupModal] = useState(false);
  const [renameGroupValue, setRenameGroupValue] = useState('');
  const [editingGroupName, setEditingGroupName] = useState('');
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [openapiModal, setOpenapiModal] = useState(false);
  const [openapiProjectName, setOpenapiProjectName] = useState('');
  const [openapiItems, setOpenapiItems] = useState<CollectionItem[]>([]);
  const [openapiFileData, setOpenapiFileData] = useState<string>('');

  const handleImportPostman: UploadProps['beforeUpload'] = async (file) => {
    setImporting(true);
    try {
      const text = await file.text();
      await ImportPostmanCollection(text);
      message.success('导入成功');
      window.location.reload();
    } catch (error: any) {
      message.error(`导入失败: ${error?.message || error}`);
    } finally {
      setImporting(false);
    }
    return false;
  };

  const handleOpenAPIFile = async (file: File) => {
    try {
      const text = await file.text();
      const jsonResult = await ParseOpenAPICollection(text);
      const result = JSON.parse(jsonResult);
      setOpenapiProjectName(result.projectName);
      setOpenapiItems(result.items as CollectionItem[]);
      setOpenapiFileData(text);
      setOpenapiModal(true);
    } catch (error: any) {
      message.error(`解析失败: ${error?.message || error}`);
    }
    return false;
  };

  const handleConfirmOpenAPIImport = async () => {
    setImporting(true);
    try {
      await ImportOpenAPICollection(openapiFileData);
      message.success('导入成功');
      setOpenapiModal(false);
      window.location.reload();
    } catch (error: any) {
      message.error(`导入失败: ${error?.message || error}`);
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadProjectGroups();
  }, []);

  const loadProjects = async () => {
    setStoreLoading(true);
    try {
      const list = await ListProjects();
      setProjects(list || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setStoreLoading(false);
    }
  };

  const loadProjectGroups = async () => {
    try {
      const state = await LoadProjectGroupsState();
      setProjectGroups(state.groups || [], state.assignments || {});
      setProjectGroupsLoaded(true);
    } catch (error) {
      console.error('Failed to load project groups:', error);
    }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      message.warning('请输入项目名称');
      return;
    }
    setLocalLoading(true);
    try {
      await CreateProject(name);
      message.success('项目已创建');
      setNewProjectName('');
      closeCreateProjectModal();
      // Reload projects
      window.location.reload();
    } catch (error: any) {
      message.error(`创建失败: ${error?.message || error}`);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    Modal.confirm({
      title: '删除项目',
      content: '确定删除该项目吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await DeleteProject(projectId);
          message.success('项目已删除');
          window.location.reload();
        } catch (error: any) {
          message.error(`删除失败: ${error?.message || error}`);
        }
      },
    });
  };

  const handleRenameProject = async () => {
    if (!renameProject) return;
    const name = renameProject.name.trim();
    if (!name) {
      message.warning('请输入项目名称');
      return;
    }
    try {
      await RenameProject(renameProject.id, name);
      message.success('项目已重命名');
      setRenameModal(false);
      window.location.reload();
    } catch (error: any) {
      message.error(`重命名失败: ${error?.message || error}`);
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      message.warning('请输入分组名称');
      return;
    }
    try {
      const state = await LoadProjectGroupsState();
      state.groups = [...(state.groups || []), name];
      await SaveProjectGroupsState(state);
      message.success('分组已创建');
      setNewGroupName('');
      setCreateGroupModal(false);
      loadProjectGroups();
    } catch (error: any) {
      message.error(`创建失败: ${error?.message || error}`);
    }
  };

  const handleDeleteGroup = async (groupName: string) => {
    Modal.confirm({
      title: '删除分组',
      content: '确定删除该分组吗？分组内的项目将移至"未分组"。',
      onOk: async () => {
        try {
          const state = await LoadProjectGroupsState();
          state.groups = (state.groups || []).filter(g => g !== groupName);
          const newAssignments = { ...state.assignments };
          for (const [projId, group] of Object.entries(newAssignments)) {
            if (group === groupName) {
              delete newAssignments[projId];
            }
          }
          state.assignments = newAssignments;
          await SaveProjectGroupsState(state);
          message.success('分组已删除');
          loadProjectGroups();
        } catch (error: any) {
          message.error(`删除失败: ${error?.message || error}`);
        }
      },
    });
  };

  const handleRenameGroup = async () => {
    if (!editingGroupName || !renameGroupValue.trim()) return;
    try {
      const state = await LoadProjectGroupsState();
      state.groups = (state.groups || []).map(g => g === editingGroupName ? renameGroupValue.trim() : g);
      const newAssignments = { ...state.assignments };
      for (const [projId, group] of Object.entries(newAssignments)) {
        if (group === editingGroupName) {
          newAssignments[projId] = renameGroupValue.trim();
        }
      }
      state.assignments = newAssignments;
      await SaveProjectGroupsState(state);
      message.success('分组已重命名');
      setRenameGroupModal(false);
      loadProjectGroups();
    } catch (error: any) {
      message.error(`重命名失败: ${error?.message || error}`);
    }
  };

  const openRenameGroupModal = (groupName: string) => {
    setEditingGroupName(groupName);
    setRenameGroupValue(groupName);
    setRenameGroupModal(true);
  };

  const handleDragStart = (e: DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    setDraggingProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, groupName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupName);
  };

  const handleDragLeave = () => {
    setDragOverGroup(null);
  };

  const handleDrop = async (e: DragEvent, groupName: string) => {
    e.preventDefault();
    setDragOverGroup(null);
    const currentDraggedId = draggedProjectId || uiDraggingProjectId;
    if (currentDraggedId) {
      try {
        const state = await LoadProjectGroupsState();
        if (groupName === 'ungrouped') {
          delete state.assignments[currentDraggedId];
          removeProjectFromGroup(currentDraggedId);
          message.success('已移至未分组');
        } else {
          state.assignments = { ...state.assignments, [currentDraggedId]: groupName };
          assignProjectGroup(currentDraggedId, groupName);
          message.success(`已移动到分组「${groupName}」`);
        }
        await SaveProjectGroupsState(state);
      } catch (error: any) {
        message.error(`移动失败: ${error?.message || error}`);
      }
    }
    setDraggedProjectId(null);
    setDraggingProjectId(null);
  };

  const handleRemoveFromGroup = async (projectId: string) => {
    try {
      const state = await LoadProjectGroupsState();
      delete state.assignments[projectId];
      await SaveProjectGroupsState(state);
      removeProjectFromGroup(projectId);
      message.success('已从分组中移除');
    } catch (error: any) {
      message.error(`移除失败: ${error?.message || error}`);
    }
  };

  const handleOpenProject = (project: Project) => {
    addToRecentProjects(project);
    onProjectOpen(project);
  };

  const handleAssignGroup = async (projectId: string, groupName: string) => {
    try {
      const state = await LoadProjectGroupsState();
      state.assignments = { ...state.assignments, [projectId]: groupName };
      await SaveProjectGroupsState(state);
      assignProjectGroup(projectId, groupName);
      message.success(`已添加到分组「${groupName}」`);
    } catch (error: any) {
      message.error(`添加失败: ${error?.message || error}`);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearchKeyword.toLowerCase())
  );

  const ungroupedProjects = filteredProjects.filter(
    (p) => !projectGroupAssignments[p.id]
  );

  const groupedProjects = (groupName: string) =>
    filteredProjects.filter((p) => projectGroupAssignments[p.id] === groupName);

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-title">
          <HomeOutlined />
          <span>我的项目</span>
        </div>
        <div className="home-actions">
          <Input
            placeholder="搜索项目"
            prefix={<SearchOutlined />}
            value={projectSearchKeyword}
            onChange={(e) => setProjectSearchKeyword(e.target.value)}
            style={{ width: 200, marginRight: 12 }}
          />
          <Upload accept=".json" showUploadList={false} beforeUpload={handleImportPostman}>
            <Button icon={<ImportOutlined />} loading={importing}>
              导入 Postman
            </Button>
          </Upload>
          <Upload accept=".json,.yaml,.yml" showUploadList={false} beforeUpload={handleOpenAPIFile}>
            <Button icon={<ImportOutlined />} loading={importing} style={{ marginLeft: 8 }}>
              导入 OpenAPI
            </Button>
          </Upload>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateProjectModal()}
            style={{ marginLeft: 8 }}
          >
            新建项目
          </Button>
          <Button
            icon={<FolderOutlined />}
            onClick={() => setCreateGroupModal(true)}
            style={{ marginLeft: 8 }}
          >
            新建分组
          </Button>
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div className="recent-projects">
          <div className="recent-projects-header">
            <ClockCircleOutlined />
            <span className="recent-projects-title">最近访问</span>
          </div>
          <div className="recent-projects-list">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="recent-project-item"
                onClick={() => handleOpenProject(project)}
              >
                <ApiOutlined className="recent-project-icon" />
                <span className="recent-project-name">{project.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="home-content">
        {filteredProjects.length === 0 ? (
          <Empty description="暂无项目" style={{ marginTop: 100 }}>
            <Button type="primary" onClick={() => openCreateProjectModal()}>
              创建第一个项目
            </Button>
          </Empty>
        ) : (
          <>
            {projectGroups.map((groupName) => (
            <ProjectGroup
              key={groupName}
              groupName={groupName}
              isCollapsed={collapsedProjectGroups.has(groupName)}
              projectsInGroup={groupedProjects(groupName)}
              isDragOver={dragOverGroup === groupName}
              onToggleCollapse={() => toggleProjectGroupCollapse(groupName)}
              onOpenRenameModal={() => openRenameGroupModal(groupName)}
              onDeleteGroup={() => handleDeleteGroup(groupName)}
              onDragOver={(e) => handleDragOver(e, groupName)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, groupName)}
              onProjectOpen={handleOpenProject}
              setRenameProject={setRenameProject}
              setRenameModal={setRenameModal}
              handleDeleteProject={handleDeleteProject}
              handleDragStart={handleDragStart}
              handleAssignGroup={handleAssignGroup}
              handleRemoveFromGroup={handleRemoveFromGroup}
            />
          ))}
            {ungroupedProjects.length > 0 && (
              <div className={`project-group ${uiDraggingProjectId ? 'has-dragging-item' : ''}`}>
                <div
                  className="project-group-header"
                  onClick={() => toggleProjectGroupCollapse('ungrouped')}
                >
                  <span className={`group-toggle ${collapsedProjectGroups.has('ungrouped') ? 'collapsed' : ''}`}>
                    {collapsedProjectGroups.has('ungrouped') ? '▶' : '▼'}
                  </span>
                  <span className="group-name">未分组</span>
                  <span className="group-count">({ungroupedProjects.length})</span>
                </div>
                {!collapsedProjectGroups.has('ungrouped') && (
                  <div
                    className={`project-group-content ${dragOverGroup === 'ungrouped' ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, 'ungrouped')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'ungrouped')}
                  >
                    {ungroupedProjects.length === 0 ? (
                      <div className="project-group-empty-drop-zone">
                        拖动项目到此处
                      </div>
                    ) : (
                      ungroupedProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onProjectOpen={handleOpenProject}
                          setRenameProject={setRenameProject}
                          setRenameModal={setRenameModal}
                          handleDeleteProject={handleDeleteProject}
                          handleDragStart={handleDragStart}
                          handleAssignGroup={handleAssignGroup}
                          handleRemoveFromGroup={handleRemoveFromGroup}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CreateProjectModal
        open={createProjectModal}
        onClose={closeCreateProjectModal}
        onCreate={handleCreateProject}
        projectName={newProjectName}
        onNameChange={setNewProjectName}
        loading={localLoading}
      />

      <CreateGroupModal
        open={createGroupModal}
        onClose={() => {
          setCreateGroupModal(false);
          setNewGroupName('');
        }}
        onCreate={handleCreateGroup}
        groupName={newGroupName}
        onNameChange={setNewGroupName}
      />

      <RenameProjectModal
        open={renameModal}
        onClose={() => {
          setRenameModal(false);
          setRenameProject(null);
        }}
        onRename={handleRenameProject}
        project={renameProject}
        onNameChange={setRenameProject}
      />

      <RenameGroupModal
        open={renameGroupModal}
        onClose={() => {
          setRenameGroupModal(false);
          setEditingGroupName('');
          setRenameGroupValue('');
        }}
        onRename={handleRenameGroup}
        groupName={renameGroupValue}
        onNameChange={setRenameGroupValue}
      />

      <ImportOpenAPIModal
        open={openapiModal}
        onClose={() => setOpenapiModal(false)}
        onImport={handleConfirmOpenAPIImport}
        projectName={openapiProjectName}
        items={openapiItems}
        loading={importing}
      />
    </div>
  );
};
