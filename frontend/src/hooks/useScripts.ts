import { useCallback } from 'react';
import { message } from 'antd';
import { useScriptStore, ProjectScript } from '../store';
import {
  ListProjectScripts,
  CreateProjectScript,
  UpdateProjectScript,
  DeleteProjectScript,
} from '../../wailsjs/go/main/App';

export function useScripts() {
  const {
    scripts,
    setScripts,
    setLoading,
    loading,
    setSaving,
  } = useScriptStore();

  const loadScripts = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const list = await ListProjectScripts(projectId);
      setScripts(list || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
      message.error('加载脚本失败');
    } finally {
      setLoading(false);
    }
  }, [setScripts, setLoading]);

  const createScript = useCallback(async (projectId: string, name: string, description: string, content: string) => {
    setSaving(true);
    try {
      const created = await CreateProjectScript(projectId, name, description, content);
      await loadScripts(projectId);
      message.success('脚本已创建');
      return created;
    } catch (error: any) {
      message.error(`创建失败: ${error?.message || error}`);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [loadScripts, setSaving]);

  const updateScript = useCallback(async (projectId: string, scriptId: string, name: string, description: string, content: string) => {
    setSaving(true);
    try {
      await UpdateProjectScript(projectId, scriptId, name, description, content);
      await loadScripts(projectId);
      message.success('脚本已保存');
    } catch (error: any) {
      message.error(`保存失败: ${error?.message || error}`);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [loadScripts, setSaving]);

  const deleteScript = useCallback(async (projectId: string, scriptId: string) => {
    try {
      await DeleteProjectScript(projectId, scriptId);
      await loadScripts(projectId);
      message.success('脚本已删除');
    } catch (error: any) {
      message.error(`删除失败: ${error?.message || error}`);
      throw error;
    }
  }, [loadScripts]);

  return {
    scripts,
    loading,
    loadScripts,
    createScript,
    updateScript,
    deleteScript,
  };
}
