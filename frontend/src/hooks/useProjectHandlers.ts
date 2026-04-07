import { useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { GetProjectTree } from '../../wailsjs/go/main/App';
import type { Project, ProjectTree } from '../store';

export const useProjectHandlers = () => {
  const {
    openProjectTab,
    setProjectTree,
    setLoading,
  } = useProjectStore();

  const workspaceStore = useWorkspaceStore();

  const handleOpenProject = useCallback(async (project: Project) => {
    openProjectTab(project);
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

  return {
    handleOpenProject,
  };
};
