import { useCallback } from 'react';
import { message } from 'antd';
import { useEnvironmentStore, Environment } from '../store';
import {
  LoadEnvironments,
  CreateEnvironment,
  UpdateEnvironment,
  DeleteEnvironment,
} from '../../wailsjs/go/main/App';

export type EnvironmentMarkValue = '' | 'dev' | 'test' | 'pre' | 'prod';

export function useEnvironments() {
  const {
    environments,
    setEnvironments,
    setLoading,
    loading,
  } = useEnvironmentStore();

  const loadEnvironments = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const envs = await LoadEnvironments(projectId);
      setEnvironments(envs || []);
    } catch (error) {
      console.error('Failed to load environments:', error);
      message.error('加载环境失败');
    } finally {
      setLoading(false);
    }
  }, [setEnvironments, setLoading]);

  const createEnvironment = useCallback(async (projectId: string, name: string, variables: Record<string, string>, mark: EnvironmentMarkValue) => {
    try {
      const created = await CreateEnvironment(projectId, name, variables, mark);
      await loadEnvironments(projectId);
      message.success('环境已创建');
      return created;
    } catch (error: any) {
      message.error(`创建失败: ${error?.message || error}`);
      throw error;
    }
  }, [loadEnvironments]);

  const updateEnvironment = useCallback(async (projectId: string, envId: string, name: string, variables: Record<string, string>, mark: EnvironmentMarkValue) => {
    try {
      await UpdateEnvironment(projectId, envId, name, variables, mark);
      message.success('环境已保存');
    } catch (error: any) {
      message.error(`保存失败: ${error?.message || error}`);
      throw error;
    }
  }, []);

  const deleteEnvironment = useCallback(async (projectId: string, envId: string) => {
    try {
      await DeleteEnvironment(projectId, envId);
      await loadEnvironments(projectId);
      message.success('环境已删除');
    } catch (error: any) {
      message.error(`删除失败: ${error?.message || error}`);
      throw error;
    }
  }, [loadEnvironments]);

  return {
    environments,
    loading,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  };
}
