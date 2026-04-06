import { useCallback } from 'react';
import { useEnvironments } from './useEnvironments';
import { useProjectStore } from '../store/useProjectStore';

export const useEnvironmentHandlers = () => {
  const {
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  } = useEnvironments();

  const projectStore = useProjectStore();
  const currentProject = projectStore.projectTabs.find(
    t => t.id === projectStore.activeTab
  )?.project;

  const handleCreateEnvironment = useCallback(async (name: string, variables: Record<string, string>) => {
    if (!currentProject) return;
    try {
      await createEnvironment(currentProject.id, name, variables);
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, createEnvironment]);

  const handleUpdateEnvironment = useCallback(async (envId: string, name: string, variables: Record<string, string>) => {
    if (!currentProject) return;
    try {
      await updateEnvironment(currentProject.id, envId, name, variables);
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, updateEnvironment]);

  const handleDeleteEnvironment = useCallback(async (envId: string) => {
    if (!currentProject) return;
    try {
      await deleteEnvironment(currentProject.id, envId);
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, deleteEnvironment]);

  return {
    handleCreateEnvironment,
    handleUpdateEnvironment,
    handleDeleteEnvironment,
  };
};
