import { useCallback } from 'react';
import { message } from 'antd';
import { useProjectStore, Project } from '../store';
import { ApiConfig } from '../constants/defaults';
import { toWailsHttpSpec } from '../utils/curlUtils';
import {
  ListProjects,
  CreateProject,
  DeleteProject,
  RenameProject,
  GetProjectTree,
  CreateFolder,
  DeleteFolder,
  RenameFolder,
  MoveFolder,
  MoveRequest,
  CopyRequest,
  CreateRequest,
  DeleteRequest,
  RenameRequest,
  GetRequest,
  UpdateRequest,
  UpdateRequestScripts,
  AddRequestCase,
  DuplicateRequestCase,
  DeleteRequestCase,
  RenameRequestCase,
  LoadProjectGroupsState,
} from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

/**
 * 从错误对象中提取错误消息字符串
 * 用于将 unknown 类型的 error 转换为可显示的字符串
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useProjects() {
  const {
    projects,
    projectTrees,
    setProjects,
    setProjectTree,
    addProject,
    removeProject,
    setLoading,
    loading,
    setProjectGroups,
  } = useProjectStore();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ListProjects();
      setProjects(list || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      message.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  }, [setProjects, setLoading]);

  const createProject = useCallback(async (name: string) => {
    try {
      const created = await CreateProject(name);
      addProject(created);
      message.success('项目已创建');
      return created;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`创建失败: ${errMsg}`);
      throw error;
    }
  }, [addProject]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await DeleteProject(id);
      removeProject(id);
      message.success('项目已删除');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`删除失败: ${errMsg}`);
      throw error;
    }
  }, [removeProject]);

  const renameProject = useCallback(async (id: string, name: string) => {
    try {
      await RenameProject(id, name);
      message.success('项目已重命名');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`重命名失败: ${errMsg}`);
      throw error;
    }
  }, []);

  const loadProjectTree = useCallback(async (projectId: string) => {
    try {
      const tree = await GetProjectTree(projectId);
      setProjectTree(projectId, tree);
      return tree;
    } catch (error) {
      console.error('Failed to load project tree:', error);
      return null;
    }
  }, [setProjectTree]);

  const createFolder = useCallback(async (projectId: string, parentPath: string, name: string) => {
    try {
      await CreateFolder(projectId, parentPath, name);
      await loadProjectTree(projectId);
      message.success('文件夹已创建');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`创建失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const deleteFolder = useCallback(async (projectId: string, folderPath: string) => {
    try {
      await DeleteFolder(folderPath);
      await loadProjectTree(projectId);
      message.success('文件夹已删除');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`删除失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const renameFolder = useCallback(async (projectId: string, folderPath: string, newName: string) => {
    try {
      await RenameFolder(folderPath, newName);
      await loadProjectTree(projectId);
      message.success('文件夹已重命名');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`重命名失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const moveFolder = useCallback(async (projectId: string, folderPath: string, targetPath: string) => {
    try {
      await MoveFolder(projectId, folderPath, targetPath);
      await loadProjectTree(projectId);
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`移动失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const moveRequest = useCallback(async (projectId: string, requestPath: string, targetPath: string) => {
    try {
      await MoveRequest(projectId, requestPath, targetPath);
      await loadProjectTree(projectId);
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`移动失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const copyRequest = useCallback(async (projectId: string, requestPath: string) => {
    try {
      await CopyRequest(requestPath);
      await loadProjectTree(projectId);
      message.success('请求已复制');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`复制失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const createRequest = useCallback(async (projectId: string, parentPath: string, name: string, apiConfig: ApiConfig) => {
    try {
      await CreateRequest(projectId, parentPath, name, toWailsHttpSpec(apiConfig));
      await loadProjectTree(projectId);
      message.success('请求已创建');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`创建失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const getRequest = useCallback(async (path: string) => {
    try {
      return await GetRequest(path);
    } catch (error) {
      console.error('Failed to get request:', error);
      return null;
    }
  }, []);

  const deleteRequest = useCallback(async (projectId: string, path: string) => {
    try {
      await DeleteRequest(path);
      await loadProjectTree(projectId);
      message.success('请求已删除');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`删除失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const renameRequest = useCallback(async (projectId: string, path: string, newName: string) => {
    try {
      await RenameRequest(path, newName);
      await loadProjectTree(projectId);
      message.success('请求已重命名');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`重命名失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const addCase = useCallback(async (projectId: string, requestPath: string, name: string) => {
    try {
      await AddRequestCase(requestPath, name);
      await loadProjectTree(projectId);
      message.success('用例已添加');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`添加失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const duplicateCase = useCallback(async (projectId: string, requestId: string, caseId: string) => {
    try {
      await DuplicateRequestCase(`request|${projectId}|${requestId}`, caseId);
      await loadProjectTree(projectId);
      message.success('用例已复制');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`复制失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const deleteCase = useCallback(async (projectId: string, requestId: string, caseId: string) => {
    try {
      await DeleteRequestCase(`request|${projectId}|${requestId}`, caseId);
      await loadProjectTree(projectId);
      message.success('用例已删除');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`删除失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const renameCase = useCallback(async (projectId: string, requestId: string, caseId: string, name: string) => {
    try {
      await RenameRequestCase(`request|${projectId}|${requestId}`, caseId, name);
      await loadProjectTree(projectId);
      message.success('用例已重命名');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`重命名失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const saveRequest = useCallback(async (
    projectId: string,
    requestPath: string,
    apiConfig: ApiConfig,
    cases: Array<{ id: string; name: string; config: ApiConfig }>,
    activeCaseId: string
  ) => {
    try {
      if (cases.length === 0) {
        // cases 为空时传入空数组而非 null，符合 API 期望的类型
        await UpdateRequest(
          requestPath,
          toWailsHttpSpec({ ...apiConfig, name: '' }),
          [],
          ''
        );
      } else {
        const wailsCases = cases.map((c) =>
          models.HttpRequestCase.createFrom({
            id: c.id,
            name: (c.name || '').trim() || '未命名',
            spec: models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...c.config, name: '' })),
          })
        );
        await UpdateRequest(
          requestPath,
          toWailsHttpSpec({ ...apiConfig, name: '' }),
          wailsCases,
          activeCaseId
        );
      }
      await UpdateRequestScripts(requestPath, apiConfig.preScripts, apiConfig.postScripts);
      await loadProjectTree(projectId);
      message.success('请求已保存');
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      message.error(`保存失败: ${errMsg}`);
      throw error;
    }
  }, [loadProjectTree]);

  const loadProjectGroups = useCallback(async () => {
    try {
      const state = await LoadProjectGroupsState();
      setProjectGroups(state.groups || [], state.assignments || {});
    } catch (error) {
      console.error('Failed to load project groups:', error);
    }
  }, [setProjectGroups]);

  const createProjectGroup = useCallback(async (groupName: string) => {
    try {
      const state = await LoadProjectGroupsState();
      state.groups = [...(state.groups || []), groupName];
      setProjectGroups(state.groups, state.assignments || {});
    } catch (error) {
      console.error('Failed to create project group:', error);
      message.error('创建分组失败');
    }
  }, [setProjectGroups]);

  const renameProjectGroup = useCallback(async (oldName: string, newName: string) => {
    try {
      const state = await LoadProjectGroupsState();
      state.groups = (state.groups || []).map(g => g === oldName ? newName : g);
      const newAssignments = { ...state.assignments };
      for (const [projId, group] of Object.entries(newAssignments)) {
        if (group === oldName) {
          newAssignments[projId] = newName;
        }
      }
      setProjectGroups(state.groups, newAssignments);
    } catch (error) {
      console.error('Failed to rename project group:', error);
      message.error('重命名分组失败');
    }
  }, [setProjectGroups]);

  return {
    projects,
    projectTrees,
    loading,
    loadProjects,
    createProject,
    deleteProject,
    renameProject,
    loadProjectTree,
    createFolder,
    deleteFolder,
    renameFolder,
    moveFolder,
    moveRequest,
    copyRequest,
    createRequest,
    getRequest,
    deleteRequest,
    renameRequest,
    addCase,
    duplicateCase,
    deleteCase,
    renameCase,
    saveRequest,
    loadProjectGroups,
    createProjectGroup,
    renameProjectGroup,
  };
}
