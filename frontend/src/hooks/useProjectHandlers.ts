import { useCallback } from 'react';
import { message, Modal } from 'antd';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useProjects } from './useProjects';
import { GetProjectTree } from '../../wailsjs/go/main/App';
import type { Project, ProjectTree } from '../store';

export const useProjectHandlers = () => {
  const {
    openProjectTab,
    closeProjectTab,
    setProjectTree,
    setLoading,
    setProjects,
  } = useProjectStore();

  const workspaceStore = useWorkspaceStore();

  const {
    createProject,
    deleteProject,
    renameProject,
    loadProjectGroups,
  } = useProjects();

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      await createProject(name);
      window.location.reload();
    } catch (error) {
      // Error handled in hook
    }
  }, [createProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      window.location.reload();
    } catch (error) {
      // Error handled in hook
    }
  }, [deleteProject]);

  const handleRenameProject = useCallback(async (projectId: string, name: string) => {
    try {
      await renameProject(projectId, name);
    } catch (error) {
      // Error handled in hook
    }
  }, [renameProject]);

  const handleOpenProject = useCallback(async (project: Project) => {
    openProjectTab(project);
    // Set active project in workspace store
    workspaceStore.setActiveProjectId(project.id);
    setLoading(true);
    try {
      const tree = await GetProjectTree(project.id);
      setProjectTree(project.id, tree as ProjectTree);
    } catch (error) {
      console.error('Failed to load project tree:', error);
    } finally {
      setLoading(false);
    }
  }, [openProjectTab, setProjectTree, setLoading, workspaceStore]);

  const handleCloseProjectTab = useCallback((tabId: string) => {
    closeProjectTab(tabId);
  }, [closeProjectTab]);

  const handleGitSyncChange = useCallback(async () => {
    const { ListProjects } = await import('../../wailsjs/go/main/App');
    try {
      const list = await ListProjects();
      setProjects(list || []);
      await loadProjectGroups();
    } catch (error) {
      console.error('Failed to reload projects after Git Sync change:', error);
    }
  }, [setProjects, loadProjectGroups]);

  return {
    handleCreateProject,
    handleDeleteProject,
    handleRenameProject,
    handleOpenProject,
    handleCloseProjectTab,
    handleGitSyncChange,
  };
};
