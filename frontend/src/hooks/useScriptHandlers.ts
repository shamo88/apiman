import { useCallback } from 'react';
import { useScripts } from './useScripts';
import { useProjectStore } from '../store/useProjectStore';
import { useScriptStore } from '../store/useScriptStore';
import { useUIStore } from '../store/useUIStore';

export const useScriptHandlers = () => {
  const {
    scripts,
    createScript,
    updateScript,
    deleteScript,
  } = useScripts();

  const projectStore = useProjectStore();
  const scriptStore = useScriptStore();
  const uiStore = useUIStore();

  const currentProject = projectStore.projectTabs.find(
    t => t.id === projectStore.activeTab
  )?.project;

  const handleCreateScript = useCallback(async () => {
    if (!currentProject) return;
    try {
      const name = `脚本${scripts.length + 1}`;
      await createScript(currentProject.id, name, '', '// 在这里编写 JavaScript 脚本\n');
      uiStore.setSidebarMenu('scripts');
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, scripts.length, createScript, uiStore]);

  const handleSelectScript = useCallback((scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      scriptStore.selectScript(script);
    }
  }, [scripts, scriptStore]);

  const handleSaveScript = useCallback(async (name: string, description: string, content: string) => {
    if (!currentProject || !scriptStore.editingScriptId) return;
    try {
      await updateScript(currentProject.id, scriptStore.editingScriptId, name, description, content);
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, scriptStore.editingScriptId, updateScript]);

  const handleDeleteScript = useCallback(async () => {
    if (!currentProject || !scriptStore.editingScriptId) return;
    try {
      await deleteScript(currentProject.id, scriptStore.editingScriptId);
    } catch (error) {
      // Error handled in hook
    }
  }, [currentProject, scriptStore.editingScriptId, deleteScript]);

  return {
    handleCreateScript,
    handleSelectScript,
    handleSaveScript,
    handleDeleteScript,
  };
};
