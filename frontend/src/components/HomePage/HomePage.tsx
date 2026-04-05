import React, { useState, useEffect } from 'react';
import { Button, Card, Empty, Input, message, Modal, Spin, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, FolderOutlined, DeleteOutlined, EditOutlined, MoreOutlined, HomeOutlined } from '@ant-design/icons';
import { useProjectStore, Project } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { CreateProject, DeleteProject, RenameProject, LoadProjectGroupsState, SaveProjectGroupsState } from '../../../wailsjs/go/main/App';
import './HomePage.css';

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
  } = useProjectStore();

  const { openCreateProjectModal, closeCreateProjectModal, createProjectModal } = useUIStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [renameProject, setRenameProject] = useState<{ id: string; name: string } | null>(null);
  const [renameGroupModal, setRenameGroupModal] = useState(false);
  const [renameGroupValue, setRenameGroupValue] = useState('');
  const [editingGroupName, setEditingGroupName] = useState('');

  useEffect(() => {
    loadProjectGroups();
  }, []);

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
    setLoading(true);
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
      setLoading(false);
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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearchKeyword.toLowerCase())
  );

  const ungroupedProjects = filteredProjects.filter(
    (p) => !projectGroupAssignments[p.id]
  );

  const groupedProjects = (groupName: string) =>
    filteredProjects.filter((p) => projectGroupAssignments[p.id] === groupName);

  const renderProjectCard = (project: Project) => (
    <Card
      key={project.id}
      className="project-card"
      size="small"
      onClick={() => onProjectOpen(project)}
    >
      <div className="project-card-content">
        <div className="project-card-icon">
          <FolderOutlined />
        </div>
        <div className="project-card-info">
          <div className="project-card-name">{project.name}</div>
        </div>
        <div className="project-card-actions">
          <Tooltip title="重命名">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setRenameProject({ id: project.id, name: project.name });
                setRenameModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProject(project.id);
              }}
            />
          </Tooltip>
        </div>
      </div>
    </Card>
  );

  const renderGroup = (groupName: string) => {
    const isCollapsed = collapsedProjectGroups.has(groupName);
    const projectsInGroup = groupedProjects(groupName);

    return (
      <div key={groupName} className="project-group">
        <div
          className="project-group-header"
          onClick={() => toggleProjectGroupCollapse(groupName)}
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
              onClick={() => openRenameGroupModal(groupName)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGroup(groupName)}
            />
          </div>
        </div>
        {!isCollapsed && (
          <div className="project-group-content">
            {projectsInGroup.map(renderProjectCard)}
          </div>
        )}
      </div>
    );
  };

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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateProjectModal()}
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

      <div className="home-content">
        {filteredProjects.length === 0 ? (
          <Empty description="暂无项目" style={{ marginTop: 100 }}>
            <Button type="primary" onClick={() => openCreateProjectModal()}>
              创建第一个项目
            </Button>
          </Empty>
        ) : (
          <>
            {projectGroups.map(renderGroup)}
            {ungroupedProjects.length > 0 && (
              <div className="project-group">
                <div className="project-group-header">
                  <span className="group-name">未分组</span>
                  <span className="group-count">({ungroupedProjects.length})</span>
                </div>
                <div className="project-group-content">
                  {ungroupedProjects.map(renderProjectCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        title="新建项目"
        open={createProjectModal}
        onCancel={closeCreateProjectModal}
        onOk={handleCreateProject}
        confirmLoading={loading}
      >
        <Input
          placeholder="项目名称"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onPressEnter={handleCreateProject}
        />
      </Modal>

      {/* Create Group Modal */}
      <Modal
        title="新建分组"
        open={createGroupModal}
        onCancel={() => {
          setCreateGroupModal(false);
          setNewGroupName('');
        }}
        onOk={handleCreateGroup}
      >
        <Input
          placeholder="分组名称"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onPressEnter={handleCreateGroup}
        />
      </Modal>

      {/* Rename Project Modal */}
      <Modal
        title="重命名项目"
        open={renameModal}
        onCancel={() => {
          setRenameModal(false);
          setRenameProject(null);
        }}
        onOk={handleRenameProject}
      >
        {renameProject && (
          <Input
            placeholder="项目名称"
            value={renameProject.name}
            onChange={(e) =>
              setRenameProject({ ...renameProject, name: e.target.value })
            }
            onPressEnter={handleRenameProject}
          />
        )}
      </Modal>

      {/* Rename Group Modal */}
      <Modal
        title="重命名分组"
        open={renameGroupModal}
        onCancel={() => {
          setRenameGroupModal(false);
          setEditingGroupName('');
          setRenameGroupValue('');
        }}
        onOk={handleRenameGroup}
      >
        <Input
          placeholder="分组名称"
          value={renameGroupValue}
          onChange={(e) => setRenameGroupValue(e.target.value)}
          onPressEnter={handleRenameGroup}
        />
      </Modal>
    </div>
  );
};
