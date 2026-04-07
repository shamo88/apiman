import { useCallback, useEffect } from 'react';
import { message } from 'antd';
import { useProjects } from './useProjects';
import { useRequest } from './useRequest';
import { GetRequest, GetProjectTree } from '../../wailsjs/go/main/App';
import { useWorkspaceStore, createEmptyWorkspaceState } from '../store/useWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';
import type { CurlRequest } from '../constants/defaults';
import type { ProjectTree } from '../store';
import { apiConfigFromRequest, apiConfigFromHttpSpec, hydrateRequestEditor } from '../utils';
import { models } from '../../wailsjs/go/models';

export const useWorkspace = (projectId: string) => {
  const workspaceStore = useWorkspaceStore();
  const projectStore = useProjectStore();

  const workspace = workspaceStore.workspaceStates[projectId] || createEmptyWorkspaceState();
  const projectTree = projectStore.projectTrees[projectId] || null;

  return {
    workspace,
    projectTree,
  };
};

export const useWorkspaceHandlers = (projectId: string) => {
  const {
    saveRequest,
    addCase,
    duplicateCase,
    deleteCase,
    renameCase,
    deleteRequest,
    copyRequest,
    moveRequest,
    moveFolder,
    deleteFolder,
    renameFolder,
    renameRequest,
    createFolder,
  } = useProjects();

  const { executeRequest, executing } = useRequest();
  const workspaceStore = useWorkspaceStore();
  const projectStore = useProjectStore();

  const project = projectStore.projectTabs.find(t => t.id === projectId)?.project;
  const workspace = workspaceStore.workspaceStates[projectId] || createEmptyWorkspaceState();

  // Load project tree when projectId changes
  useEffect(() => {
    if (projectId && !projectStore.projectTrees[projectId]) {
      GetProjectTree(projectId).then(tree => {
        projectStore.setProjectTree(projectId, tree as ProjectTree);
      }).catch(console.error);
    }
  }, [projectId]);

  const handleTreeItemClick = useCallback(async (treeNode: ProjectTree) => {
    if (treeNode.type !== 'request' || !treeNode.path) return;

    try {
      const request = await GetRequest(treeNode.path);
      // Use request path as tab ID to avoid creating duplicate tabs for the same request
      const tab = {
        id: treeNode.path,
        title: request.name || treeNode.name,
        path: treeNode.path,
      };
      workspaceStore.openRequestTab(projectId, tab);
      workspaceStore.setCurrentRequest(projectId, request as CurlRequest);
      // Clear case selection when clicking on a request
      workspaceStore.setSidebarHighlightedCasePath(projectId, '');

      const cfg = apiConfigFromRequest(request as CurlRequest, request.name || '');
      // When switching to interface, preserve current editor state
      // and load interface from server
      workspaceStore.setWorkspaceState(projectId, {
        interfaceApiConfig: { ...workspace.apiConfig },
        requestEditorSurface: 'interface',
      });
      workspaceStore.setApiConfig(projectId, {
        ...cfg,
        preScripts: request.pre_scripts || [],
        postScripts: request.post_scripts || [],
      });
    } catch (error) {
      console.error('Failed to load request:', error);
      message.error('加载请求失败');
    }
  }, [projectId, workspaceStore, workspace.apiConfig]);

  const handleCaseClick = useCallback(async (caseNode: ProjectTree) => {
    if (!caseNode.path) return;
    const parts = caseNode.path.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    const [, requestId, caseId] = parts;
    const reqPath = `request|${projectId}|${requestId}`;

    try {
      const request = await GetRequest(reqPath);
      workspaceStore.setSidebarHighlightedCasePath(projectId, caseNode.path);

      const reqCases = request.cases as models.HttpRequestCase[] | undefined;
      if (reqCases && reqCases.length > 0) {
        // Check if requestCases already exists for this request - if so, preserve it (switching within same request)
        const existingCases = workspace.requestCases;
        const isSameRequest = existingCases.length > 0 &&
          existingCases[0].config.name === request.name;

        if (isSameRequest) {
          // Switching cases within same request - only update activeCaseId and apiConfig
          const activeCase = reqCases.find(c => c.id === caseId);
          if (activeCase) {
            const caseConfig = apiConfigFromHttpSpec(activeCase.spec, activeCase.name);
            // Preserve current apiConfig (may contain unsaved interface changes)
            workspaceStore.setWorkspaceState(projectId, {
              activeCaseId: caseId,
              interfaceApiConfig: { ...workspace.apiConfig },
            });
            workspaceStore.setApiConfig(projectId, { ...caseConfig, name: request.name || '' });
          }
        } else {
          // First time loading cases for this request - load from server and preserve interface
          const rows = reqCases.map(c => ({
            id: c.id,
            name: c.name,
            config: apiConfigFromHttpSpec(c.spec, c.name),
          }));
          const ifaceCfg = apiConfigFromHttpSpec(
            request.interface_spec || models.HttpRequestSpec.createFrom({}),
            request.name || ''
          );
          workspaceStore.setWorkspaceState(projectId, {
            requestCases: rows,
            activeCaseId: caseId,
            interfaceApiConfig: ifaceCfg,
          });
          const activeCase = rows.find(r => r.id === caseId);
          if (activeCase) {
            workspaceStore.setApiConfig(projectId, { ...activeCase.config, name: request.name || '' });
          }
        }
        workspaceStore.setRequestEditorSurface(projectId, 'case');
      }
    } catch (error) {
      console.error('Failed to load case:', error);
      message.error('加载用例失败');
    }
  }, [projectId, workspaceStore, workspace.apiConfig, workspace.requestCases]);

  const handleExecuteRequest = useCallback(async () => {
    if (!project) return;
    const envId = workspace.selectedEnvironmentId;
    try {
      await executeRequest(
        project.id,
        envId,
        workspace.apiConfig,
        workspace.apiConfig.preScripts,
        workspace.apiConfig.postScripts,
        workspace.currentRequest?.name || '',
        workspace.currentRequest?.path || ''
      );
    } catch (error) {
      // Error handled in hook
    }
  }, [project, workspace, executeRequest]);

  const handleSaveRequest = useCallback(async () => {
    if (!project || !workspace.currentRequest?.path) return;
    try {
      // Preserve existing cases by passing current requestCases
      await saveRequest(
        project.id,
        workspace.currentRequest.path,
        workspace.apiConfig,
        workspace.requestCases.map(c => ({ id: c.id, name: c.name, config: c.config })),
        workspace.activeCaseId
      );
    } catch (error) {
      // Error handled in hook
    }
  }, [project, workspace, saveRequest]);

  // Save only the active case, preserving interface and other cases
  const handleSaveCase = useCallback(async () => {
    if (!project || !workspace.currentRequest?.path || !workspace.activeCaseId) return;
    try {
      // Replace only the active case in the cases array
      const updatedCases = workspace.requestCases.map(c =>
        c.id === workspace.activeCaseId
          ? { id: c.id, name: c.name, config: workspace.apiConfig }
          : c
      );
      // Use interfaceApiConfig for the interface spec to preserve original interface
      await saveRequest(
        project.id,
        workspace.currentRequest.path,
        workspace.interfaceApiConfig,
        updatedCases.map(c => ({ id: c.id, name: c.name, config: c.config })),
        workspace.activeCaseId
      );
    } catch (error) {
      // Error handled in hook
    }
  }, [project, workspace, saveRequest]);

  const handleDeleteRequest = useCallback(async (path: string) => {
    try {
      await deleteRequest(projectId, path);
      const tab = workspace.requestTabs.find(t => t.path === path);
      if (tab) {
        workspaceStore.closeRequestTab(projectId, tab.id);
      }
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, workspace, deleteRequest, workspaceStore]);

  const handleCopyRequest = useCallback(async (path: string) => {
    try {
      await copyRequest(projectId, path);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, copyRequest]);

  const handleRename = useCallback(async (type: 'request' | 'folder', path: string, newName: string) => {
    try {
      if (type === 'request') {
        await renameRequest(projectId, path, newName);
      } else {
        await renameFolder(projectId, path, newName);
      }
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, renameRequest, renameFolder]);

  const handleDeleteFolder = useCallback(async (path: string) => {
    try {
      await deleteFolder(projectId, path);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, deleteFolder]);

  const handleMoveRequest = useCallback(async (requestPath: string, targetPath: string) => {
    try {
      await moveRequest(projectId, requestPath, targetPath);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, moveRequest]);

  const handleMoveFolder = useCallback(async (folderPath: string, targetPath: string) => {
    try {
      await moveFolder(projectId, folderPath, targetPath);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, moveFolder]);

  const handleAddCase = useCallback(async (requestPath: string, name: string) => {
    try {
      await addCase(projectId, requestPath, name);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, addCase]);

  const handleDuplicateCase = useCallback(async (casePath: string) => {
    const parts = casePath.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    try {
      await duplicateCase(projectId, parts[1], parts[2]);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, duplicateCase]);

  const handleDeleteCase = useCallback(async (casePath: string) => {
    const parts = casePath.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    try {
      await deleteCase(projectId, parts[1], parts[2]);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, deleteCase]);

  const handleRenameCase = useCallback(async (casePath: string, newName: string) => {
    const parts = casePath.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    try {
      await renameCase(projectId, parts[1], parts[2], newName);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, renameCase]);

  const loadRequestContent = useCallback(async (path: string) => {
    if (!projectId) return;

    try {
      workspaceStore.setSidebarHighlightedCasePath(projectId, '');
      const request = await GetRequest(path);
      workspaceStore.setCurrentRequest(projectId, request as CurlRequest);
      hydrateRequestEditor(request as CurlRequest, projectId, workspaceStore, null);
    } catch (error) {
      console.error('Failed to load request:', error);
    }
  }, [projectId, workspaceStore]);

  const handleRequestTabChange = useCallback((tabId: string) => {
    workspaceStore.setActiveRequestTab(projectId, tabId);
    const tab = workspace.requestTabs.find(t => t.id === tabId);
    if (tab) {
      loadRequestContent(tab.path);
    }
  }, [projectId, workspace, workspaceStore, loadRequestContent]);

  const handleCloseRequestTab = useCallback((tabId: string) => {
    workspaceStore.closeRequestTab(projectId, tabId);
  }, [projectId, workspaceStore]);

  const handleCreateFolder = useCallback(async (name: string, parentPath: string) => {
    if (!project) return;
    try {
      await createFolder(project.id, parentPath, name);
    } catch (error) {
      // Error handled in hook
    }
  }, [project, createFolder]);

  const handleToggleFolder = useCallback((folderPath: string) => {
    projectStore.toggleFolderCollapse(folderPath);
  }, [projectStore]);

  const handleToggleRequestCases = useCallback((requestPath: string) => {
    const expanded = new Set(workspace.expandedRequestPaths);
    if (expanded.has(requestPath)) {
      expanded.delete(requestPath);
    } else {
      expanded.add(requestPath);
    }
    workspaceStore.setWorkspaceState(projectId, { expandedRequestPaths: expanded });
  }, [projectId, workspace, workspaceStore]);

  return {
    // State
    workspace,
    executing,
    // Handlers
    handleTreeItemClick,
    handleCaseClick,
    handleExecuteRequest,
    handleSaveRequest,
    handleSaveCase,
    handleDeleteRequest,
    handleCopyRequest,
    handleRename,
    handleDeleteFolder,
    handleMoveRequest,
    handleMoveFolder,
    handleAddCase,
    handleDuplicateCase,
    handleDeleteCase,
    handleRenameCase,
    handleRequestTabChange,
    handleCloseRequestTab,
    handleCreateFolder,
    handleToggleFolder,
    handleToggleRequestCases,
    loadRequestContent,
  };
};
