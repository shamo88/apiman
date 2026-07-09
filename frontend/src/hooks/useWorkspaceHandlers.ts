import { useCallback, useEffect } from 'react';
import React from 'react';
import { message, Modal, Button, Space } from 'antd';
import { useProjects } from './useProjects';
import { useRequest } from './useRequest';
import { GetRequest, GetProjectTree, UpdateRequest, UpdateRequestScripts } from '../../wailsjs/go/main/App';
import { useWorkspaceStore, createEmptyWorkspaceState } from '../store/useWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import type { CurlRequest } from '../constants/defaults';
import type { ProjectTree } from '../store';
import { apiConfigFromRequest, apiConfigFromHttpSpec, hydrateRequestEditor } from '../utils';
import { toWailsHttpSpec } from '../utils/curlUtils';
import { models } from '../../wailsjs/go/models';

export const useWorkspace = (projectId: string) => {
  const workspaceStore = useWorkspaceStore();
  const projectStore = useProjectStore();

  const existingWorkspace = workspaceStore.workspaceStates[projectId];
  // 如果 workspace 不存在，创建时加载保存的环境选择
  const workspace = existingWorkspace || {
    ...createEmptyWorkspaceState(),
    selectedEnvironmentId: localStorage.getItem(`apiman-env-${projectId}`) || '',
  };
  const projectTree = projectStore.projectTrees[projectId] || null;

  return {
    workspace,
    projectTree,
  };
};

export const useWorkspaceHandlers = (projectId: string) => {
  const {
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

  const { executeRequest, cancelRequest, executing } = useRequest();
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

    // 检查是否是新建 tab
    const isNewTab = !workspace.requestTabs.find(t => t.id === treeNode.path);

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

      // 新建 tab 时清空 response（openRequestTab 已经处理了 tabResponses 中的初始化）
      // 切换到已有 tab 时，openRequestTab 会自动恢复该 tab 的 response
      if (isNewTab) {
        workspaceStore.setResponse(projectId, null);
      }

      const cfg = apiConfigFromRequest(request as CurlRequest, request.name || '');
      // When switching to interface: load cases from request to avoid clearing them on save
      const reqItemCases = request.cases as models.HttpRequestCase[] | undefined;
      const hasCases = reqItemCases && reqItemCases.length > 0;
      if (hasCases) {
        const reqRows = reqItemCases!.map((c: any) => ({
          id: c.id,
          name: c.name,
          config: apiConfigFromHttpSpec(c.spec, c.name),
        }));
        const ifaceCfg = apiConfigFromHttpSpec(
          request.interface_spec || models.HttpRequestSpec.createFrom({}),
          request.name || ''
        );
        // 多 tab 隔离：按 tabId 存 cases
        workspaceStore.initTabCases(projectId, tab.id, reqRows, '', ifaceCfg);
        // 同步给旧字段（保持兼容）
        workspaceStore.setWorkspaceState(projectId, {
          requestCases: reqRows,
          activeCaseId: '',
          interfaceApiConfig: ifaceCfg,
          requestEditorSurface: 'interface',
        });
      } else {
        // 多 tab 隔离：按 tabId 存空 cases
        workspaceStore.initTabCases(projectId, tab.id, [], '', { ...cfg });
        workspaceStore.setWorkspaceState(projectId, {
          requestCases: [],
          activeCaseId: '',
          interfaceApiConfig: { ...cfg },
          requestEditorSurface: 'interface',
        });
      }
      workspaceStore.initTabContent(projectId, tab.id, {
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
    // Skip if renaming case modal is open - prevent activeCaseId from being changed
    const uiState = useUIStore.getState();
    if (uiState.renamingCaseId) return;

    if (!caseNode.path) return;
    const parts = caseNode.path.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    const [, requestId, caseId] = parts;
    const reqPath = `request|${projectId}|${requestId}`;

    try {
      const request = await GetRequest(reqPath);

      // 确保请求已经在 tab 中打开
      const existingTab = workspace.requestTabs.find(t => t.path === reqPath);
      if (existingTab) {
        // tab 已存在，切换到它
        workspaceStore.setActiveRequestTab(projectId, existingTab.id);
      } else {
        // 创建新 tab
        const tab = {
          id: reqPath,
          title: request.name || caseNode.name,
          path: reqPath,
        };
        workspaceStore.openRequestTab(projectId, tab);
      }

      workspaceStore.setSidebarHighlightedCasePath(projectId, caseNode.path);

      // 设置 currentRequest，这是保存时需要的
      workspaceStore.setCurrentRequest(projectId, request as CurlRequest);

      const reqCases = request.cases as models.HttpRequestCase[] | undefined;
      if (reqCases && reqCases.length > 0) {
        // Check if requestCases already exists for this request - if so, preserve it (switching within same request)
        const existingCases = workspace.requestCases;
        const isSameRequest = existingCases.length > 0 &&
          existingCases[0].config.name === request.name;

        if (isSameRequest) {
          // Switching cases within same request - update activeCaseId, apiConfig, and requestCases
          const activeCase = reqCases.find(c => c.id === caseId);
          if (activeCase) {
            const caseConfig = apiConfigFromHttpSpec(activeCase.spec, activeCase.name);
            // Update requestCases with latest data from server
            const rows = reqCases.map(c => ({
              id: c.id,
              name: c.name,
              config: apiConfigFromHttpSpec(c.spec, c.name),
            }));
            // Preserve interface spec from server (not from current editor state)
            const ifaceCfg = apiConfigFromHttpSpec(
              request.interface_spec || models.HttpRequestSpec.createFrom({}),
              request.name || ''
            );
            // 多 tab 隔离：按 reqPath 存 cases
            workspaceStore.initTabCases(projectId, reqPath, rows, caseId, ifaceCfg);
            // 同步给旧字段
            workspaceStore.setWorkspaceState(projectId, {
              requestCases: rows,
              activeCaseId: caseId,
              interfaceApiConfig: ifaceCfg,
            });
            workspaceStore.initTabContent(projectId, reqPath, { ...caseConfig, name: request.name || '' });
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
          // 多 tab 隔离：按 reqPath 存 cases
          workspaceStore.initTabCases(projectId, reqPath, rows, caseId, ifaceCfg);
          workspaceStore.setWorkspaceState(projectId, {
            requestCases: rows,
            activeCaseId: caseId,
            interfaceApiConfig: ifaceCfg,
          });
          const activeCase = rows.find(r => r.id === caseId);
          if (activeCase) {
            workspaceStore.initTabContent(projectId, reqPath, { ...activeCase.config, name: request.name || '' });
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
      // 多 tab 隔离：使用当前激活 tab 的草稿（避免用错其他 tab 的配置）
      const latestWs = workspaceStore.workspaceStates[projectId];
      const currentConfig = latestWs?.tabDrafts[latestWs.activeRequestTab] || latestWs?.apiConfig;
      await executeRequest(
        project.id,
        envId,
        currentConfig!,
        currentConfig!.preScripts,
        currentConfig!.postScripts,
        latestWs?.currentRequest?.name || '',
        latestWs?.currentRequest?.path || ''
      );
    } catch (error) {
      // Error handled in hook
    }
  }, [project, executeRequest, workspaceStore, projectId]);

  const handleSaveRequest = useCallback(async () => {
    // 关键：从 store 同步拿最新 workspace，避免 useCallback 闭包 stale 导致保存错 tab
    const latestWs = workspaceStore.workspaceStates[projectId];
    const activeTabId = latestWs?.activeRequestTab;
    // 优先用 requestTabs 里的 path（按 active tab 取），不依赖 currentRequest（可能滞后）
    const activeTab = latestWs?.requestTabs.find(t => t.id === activeTabId);
    const requestPath = activeTab?.path || latestWs?.currentRequest?.path;
    if (!project || !requestPath || !activeTabId) {
      message.error('请先在左侧选择一个请求，或创建新请求');
      return false;
    }
    try {
      const currentConfig = latestWs!.tabDrafts[activeTabId] || latestWs!.apiConfig;
      // 多 tab 隔离：按 activeTabId 拿 cases
      const { cases, activeCaseId } = workspaceStore.getTabCases(projectId, activeTabId);
      // 关键修复：直接调 UpdateRequest + UpdateRequestScripts，不走 useProjects.saveRequest
      // 原因：saveRequest 不区分 case 模式 / 普通模式，会无条件用 draft 作为接口 spec，
      // 并且会用 interfaceConfig（preScripts=[]）调 UpdateRequestScripts 清空接口的 pre/post scripts
      const wailsSpec = models.HttpRequestSpec.createFrom(
        toWailsHttpSpec({ ...currentConfig, name: '' }),
      );
      const wailsCases = cases.map((c) =>
        models.HttpRequestCase.createFrom({
          id: c.id,
          name: (c.name || '').trim() || '未命名',
          spec: models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...c.config, name: '' })),
        })
      );
      await UpdateRequest(requestPath, wailsSpec, wailsCases, activeCaseId);
      // pre/post scripts 是接口级，case 模式下不应被覆盖
      if (cases.length === 0) {
        await UpdateRequestScripts(requestPath, currentConfig.preScripts, currentConfig.postScripts);
      }
      // 保存成功：把当前 tab 的 draft 提升为 baseline，清除 dirty
      workspaceStore.markTabSaved(projectId, activeTabId);
      return true;
    } catch (error) {
      // Error handled in hook
      return false;
    }
  }, [project, workspaceStore, projectId]);

  // Save only the active case, preserving interface and other cases
  const handleSaveCase = useCallback(async () => {
    // 关键：从 store 同步拿最新 workspace，避免闭包 stale 问题
    const latestWs = workspaceStore.workspaceStates[projectId];
    const activeTabId = latestWs?.activeRequestTab;
    const activeTab = latestWs?.requestTabs.find(t => t.id === activeTabId);
    const requestPath = activeTab?.path || latestWs?.currentRequest?.path;
    if (!project || !requestPath || !activeTabId) {
      message.error('请先选择一个请求和用例');
      return false;
    }
    // 多 tab 隔离：按 activeTabId 拿 cases
    const { cases, activeCaseId, interfaceConfig } = workspaceStore.getTabCases(projectId, activeTabId);
    if (!activeCaseId) {
      message.error('请先选择一个用例');
      return false;
    }
    try {
      const currentConfig = latestWs.tabDrafts[activeTabId] || latestWs.apiConfig;
      // 关键修复：直接调 UpdateRequest，不走 useProjects.saveRequest
      // 原因：saveRequest 内部会调 UpdateRequestScripts(path, apiConfig.preScripts, ...)，
      // apiConfig 用的是 interfaceConfig（接口定义），preScripts 是 []，
      // 这会清空接口本身的 pre/post scripts（pre-existing bug）
      // spec 用 interfaceConfig（保持接口定义不变），cases 中 active case 替换为 currentConfig
      const updatedCases = cases.map(c =>
        c.id === activeCaseId
          ? { id: c.id, name: c.name, config: currentConfig }
          : c
      );
      const wailsSpec = models.HttpRequestSpec.createFrom(
        toWailsHttpSpec({ ...interfaceConfig, name: '' }),
      );
      const wailsCases = updatedCases.map((c) =>
        models.HttpRequestCase.createFrom({
          id: c.id,
          name: (c.name || '').trim() || '未命名',
          spec: models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...c.config, name: '' })),
        })
      );
      await UpdateRequest(requestPath, wailsSpec, wailsCases, activeCaseId);
      // case 模式下不调 UpdateRequestScripts（pre/post 是接口级，不是 case 级）
      // 保存成功：把当前 tab 的 draft 提升为 baseline，清除 dirty
      workspaceStore.markTabSaved(projectId, activeTabId);
      return true;
    } catch (error) {
      // Error handled in hook
      return false;
    }
  }, [project, workspaceStore, projectId]);

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

  const handleRename = useCallback(async (type: 'request' | 'folder', path: string, currentName: string) => {
    // Open the rename modal, do not call API directly
    const uiStore = useUIStore.getState();
    uiStore.openRenameModal(type, path, currentName);
  }, []);

  const handleDeleteFolder = useCallback(async (path: string) => {
    try {
      await deleteFolder(projectId, path);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, deleteFolder]);

  const handleMoveRequest = useCallback(async (requestPath: string, targetPath: string, beforeId?: string) => {
    try {
      await moveRequest(projectId, requestPath, targetPath, beforeId);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, moveRequest]);

  const handleMoveFolder = useCallback(async (folderPath: string, targetPath: string, beforeId?: string) => {
    try {
      await moveFolder(projectId, folderPath, targetPath, beforeId);
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
    // casePath format: requestCase|projectId|requestId|caseId
    const parts = casePath.replace('requestCase|', '').split('|');
    if (parts.length !== 3) return;
    try {
      await renameCase(parts[0], parts[1], parts[2], newName);
    } catch (error) {
      // Error handled in hook
    }
  }, [renameCase]);

  const loadRequestContent = useCallback(async (path: string) => {
    if (!projectId) return;

    try {
      workspaceStore.setSidebarHighlightedCasePath(projectId, '');
      const request = await GetRequest(path);
      workspaceStore.setCurrentRequest(projectId, request as CurlRequest);

      // Update apiConfig when switching tabs (matching handleTreeItemClick behavior)
      const cfg = apiConfigFromRequest(request as CurlRequest, request.name || '');
      workspaceStore.initTabContent(projectId, path, {
        ...cfg,
        preScripts: request.pre_scripts || [],
        postScripts: request.post_scripts || [],
      });

      // 加载请求的用例到 requestCases，避免接口保存时清空用例
      const reqCases = request.cases as models.HttpRequestCase[] | undefined;
      if (reqCases && reqCases.length > 0) {
        const rows = reqCases.map((c: any) => ({
          id: c.id,
          name: c.name,
          config: apiConfigFromHttpSpec(c.spec, c.name),
        }));
        const ifaceCfg = apiConfigFromHttpSpec(
          request.interface_spec || models.HttpRequestSpec.createFrom({}),
          request.name || ''
        );
        // 多 tab 隔离：按 path 存 cases
        workspaceStore.initTabCases(projectId, path, rows, '', ifaceCfg);
        workspaceStore.setWorkspaceState(projectId, {
          requestCases: rows,
          activeCaseId: '',
          interfaceApiConfig: ifaceCfg,
        });
      } else {
        // 多 tab 隔离：按 path 存空 cases
        workspaceStore.initTabCases(projectId, path, [], '', cfg);
        workspaceStore.setWorkspaceState(projectId, {
          requestCases: [],
          activeCaseId: '',
          interfaceApiConfig: cfg,
        });
      }
      // 不调用 hydrateRequestEditor，因为它会清空 response
      // 切换 tab 时保留原有的 response
    } catch (error) {
      console.error('Failed to load request:', error);
    }
  }, [projectId, workspaceStore]);

  const handleRequestTabChange = useCallback((tabId: string) => {
    // 切换 tab 时不再重新加载：草稿数据已在 store 中（多 tab 隔离设计），
    // 否则会覆盖用户在未保存状态下对其他 tab 的修改。
    workspaceStore.setActiveRequestTab(projectId, tabId);
    // 恢复目标 tab 的 case 快照到全局字段（cases/activeCaseId/interfaceApiConfig/surface）
    workspaceStore.restoreTabCasesToActive(projectId, tabId);
  }, [projectId, workspaceStore]);

  const handleCloseRequestTab = useCallback(async (tabId: string) => {
    // 关键修复：保存逻辑不再依赖 activeRequestTab，避免切换 tab 时的副作用与 stale 闭包
    // 直接从 store 按 tabId 取出 draft + path，调 Wails API 保存
    const saveTabById = async (targetTabId: string): Promise<boolean> => {
      const latestWs = workspaceStore.workspaceStates[projectId];
      const tab = latestWs?.requestTabs.find((t) => t.id === targetTabId);
      const draft = latestWs?.tabDrafts[targetTabId];
      if (!project || !tab || !draft) return false;
      try {
        // 多 tab 隔离：按目标 tabId 拿 cases（处理 case 模式编辑后关 tab 不丢数据）
        // getTabCases 会按 tabId 找；找不到时回退到 workspace 共享字段（兼容旧数据）
        let cases = workspaceStore.getTabCases(projectId, targetTabId).cases;
        const { activeCaseId: tabActiveCaseId, interfaceConfig: tabInterfaceConfig } =
          workspaceStore.getTabCases(projectId, targetTabId);
        // 如果目标 tab 没有任何 tabCases 记录（从未进入 case 模式或兼容旧数据），
        // 从后端拉最新数据防止误覆盖
        const hasTabCases = latestWs?.tabCases && latestWs.tabCases[targetTabId] !== undefined;
        if (!hasTabCases && (!cases || cases.length === 0)) {
          try {
            const freshReq = await GetRequest(tab.path);
            const freshCases = freshReq?.cases as models.HttpRequestCase[] | undefined;
            cases = (freshCases || []).map((c) => ({
              id: c.id,
              name: c.name,
              config: apiConfigFromHttpSpec(c.spec, c.name),
            }));
          } catch {
            cases = [];
          }
        }

        // 关键：判断 tab 是不是 case 模式
        // - case 模式（cases.length > 0）：spec 必须用 interfaceConfig（保持接口定义不变），
        //   cases 数组中 active case 的 config 替换为 draft
        // - 普通接口模式（cases.length === 0）：spec = draft，cases 保持
        const isCaseMode = cases.length > 0;

        let wailsSpec: models.HttpRequestSpec;
        let wailsCases: models.HttpRequestCase[] = [];
        let finalActiveCaseId = '';

        if (isCaseMode) {
          // case 模式：spec 用接口定义（tabInterfaceConfig）；保持接口 spec 不变
          wailsSpec = models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...tabInterfaceConfig, name: '' }));
          // 把 cases 数组中 active case 的 config 替换为 draft（用户编辑的 case 内容）
          const updatedCases = cases.map(c =>
            c.id === tabActiveCaseId
              ? { id: c.id, name: c.name, config: draft }
              : c
          );
          wailsCases = updatedCases.map((c) =>
            models.HttpRequestCase.createFrom({
              id: c.id,
              name: (c.name || '').trim() || '未命名',
              spec: models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...c.config, name: '' })),
            })
          );
          finalActiveCaseId = tabActiveCaseId;
        } else {
          // 普通接口模式：spec 用 draft（用户编辑的接口内容）
          wailsSpec = models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...draft, name: '' }));
          // cases 为空（普通接口无 case）
        }

        await UpdateRequest(
          tab.path,
          wailsSpec,
          wailsCases,
          finalActiveCaseId,
        );
        // UpdateRequestScripts 是接口级的，case 模式下不调（避免清空接口的 pre/post scripts）
        // 普通模式下才更新 pre/post scripts
        if (!isCaseMode) {
          await UpdateRequestScripts(tab.path, draft.preScripts, draft.postScripts);
        }
        workspaceStore.markTabSaved(projectId, targetTabId);
        return true;
      } catch (e: any) {
        console.error('[handleCloseRequestTab] save failed:', e);
        return false;
      }
    };

    const workspace = workspaceStore.workspaceStates[projectId];
    if (!workspace) return;

    const wasActiveTab = workspace.activeRequestTab === tabId;
    const tabs = workspace.requestTabs;
    const closedIndex = tabs.findIndex((t) => t.id === tabId);
    const isDirty = workspaceStore.isTabDirty(projectId, tabId);

    // 如果 tab 有未保存改动，弹 Modal 让用户选择
    if (isDirty) {
      const tab = tabs.find(t => t.id === tabId);
      const tabTitle = tab?.title || '该请求';
      const choice = await confirmDirtyClose(tabTitle);
      if (choice === 'cancel') return;

      if (choice === 'save') {
        // 直接按 tabId 保存，不切换 activeRequestTab（避免一切副作用）
        const ok = await saveTabById(tabId);
        if (!ok) {
          message.error('保存失败，请重试');
          return; // 不关闭 tab，保留 dirty 状态
        }
      } else {
        // choice === 'discard': 清除草稿
        workspaceStore.clearTabContent(projectId, tabId);
      }
    }

    workspaceStore.closeRequestTab(projectId, tabId);

    // 关闭激活 tab 后，切换到相邻 tab（不再 reload，草稿已在 store）
    if (wasActiveTab && tabs.length > 1) {
      const newActiveTab = tabs[closedIndex - 1] || tabs[0];
      if (newActiveTab && newActiveTab.id !== tabId) {
        workspaceStore.setActiveRequestTab(projectId, newActiveTab.id);
      }
    }
  }, [projectId, project, workspaceStore]);

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

  const handleRenameRequest = useCallback(async (requestPath: string, newName: string) => {
    try {
      await renameRequest(projectId, requestPath, newName);
    } catch (error) {
      // Error handled in hook
    }
  }, [projectId, renameRequest]);

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
    cancelRequest,
    handleRenameRequest,
  };
};

/**
 * 弹出三按钮确认框：保存 / 放弃 / 取消
 * 因为 useWorkspaceHandlers.ts 是 .ts 文件，用 React.createElement 替代 JSX。
 * 返回 Promise<'save' | 'discard' | 'cancel'>
 */
export const confirmDirtyClose = (tabTitle: string): Promise<'save' | 'discard' | 'cancel'> => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (choice: 'save' | 'discard' | 'cancel') => {
      if (resolved) return;
      resolved = true;
      Modal.destroyAll();
      resolve(choice);
    };
    const footer = React.createElement(
      Space,
      null,
      React.createElement(Button, { onClick: () => finish('cancel') }, '取消'),
      React.createElement(Button, { danger: true, onClick: () => finish('discard') }, '放弃修改'),
      React.createElement(Button, { type: 'primary', onClick: () => finish('save') }, '保存并关闭'),
    );
    Modal.confirm({
      title: `"${tabTitle}" 有未保存的修改`,
      content: '请选择如何处理当前 tab 的修改：',
      icon: null,
      footer,
      // 用户点 X 或 ESC 等价于"取消"
      onCancel: () => finish('cancel'),
    });
  });
};

/**
 * 批量未保存确认框（关项目 / 退出 app 时使用）
 * - title: 资源名（项目名或 "退出 Apiman"）
 * - count: 涉及的 dirty tab 数
 * 返回 Promise<'save-all' | 'discard-all' | 'cancel'>
 */
export const confirmDirtyCloseAll = (
  title: string,
  count: number,
): Promise<'save-all' | 'discard-all' | 'cancel'> => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (choice: 'save-all' | 'discard-all' | 'cancel') => {
      if (resolved) return;
      resolved = true;
      Modal.destroyAll();
      resolve(choice);
    };
    const footer = React.createElement(
      Space,
      null,
      React.createElement(Button, { onClick: () => finish('cancel') }, '取消'),
      React.createElement(
        Button,
        { danger: true, onClick: () => finish('discard-all') },
        count > 0 ? '放弃全部修改' : '确认',
      ),
      React.createElement(
        Button,
        { type: 'primary', onClick: () => finish('save-all') },
        count > 0 ? '保存全部并继续' : '确定',
      ),
    );
    const contentText = count > 0
      ? `共有 ${count} 个 tab 有未保存的修改。\n请选择如何处理：\n• 保存全部：将所有改动落盘后再继续\n• 放弃全部：丢弃所有改动\n• 取消：留在当前页面`
      : '确定要继续吗？';
    Modal.confirm({
      title,
      content: React.createElement('div', { style: { whiteSpace: 'pre-line' } }, contentText),
      icon: null,
      footer,
onCancel: () => finish('cancel'),
    });
  });
};