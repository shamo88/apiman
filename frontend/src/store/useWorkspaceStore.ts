import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ApiConfig, createDefaultApiConfig, RequestEditorSurface, RequestCaseState, RequestTab, CurlRequest } from '../constants/defaults';

interface WorkspaceState {
  requestTabs: RequestTab[];
  activeRequestTab: string;
  currentRequest: CurlRequest | null;
  // 每个 tab 独立的 response 数据，key 为 tabId
  tabResponses: Record<string, any>;
  response: any; // 兼容：当前激活 tab 的 response
  selectedKeys: string[];
  // [Legacy] 兼容旧逻辑，新代码请用 tabDrafts/tabBaselines
  apiConfig: ApiConfig;
  selectedEnvironmentId: string;
  requestCases: RequestCaseState[];
  activeCaseId: string;
  interfaceApiConfig: ApiConfig;
  requestEditorSurface: RequestEditorSurface;
  sidebarHighlightedCasePath: string;
  expandedRequestPaths: Set<string>;
  requestResponseRatio: number;
  // —— 多 tab 草稿隔离 ——
  // 每个 tab 当前正在编辑的内容（含未保存改动）
  tabDrafts: Record<string, ApiConfig>;
  // 每个 tab 最近一次与服务端一致的内容（用于 dirty 检测）
  tabBaselines: Record<string, ApiConfig>;
  // 标记有未保存改动的 tabId 集合
  dirtyTabs: Set<string>;
  // —— 多 tab case 隔离（key 为 tabId）——
  // 每个 tab 独立的用例列表
  tabCases: Record<string, RequestCaseState[]>;
  // 每个 tab 独立的激活用例 id
  tabActiveCaseIds: Record<string, string>;
  // 每个 tab 独立的接口定义（case 模式下编辑"接口定义"时的草稿）
  tabInterfaceConfigs: Record<string, ApiConfig>;
}

export interface WorkspaceStore {
  workspaceStates: Record<string, WorkspaceState>;
  executing: boolean;
  formattedResponse: string;
  responseBodyHeight: number;
  scriptResultsHeight: number;
  scriptLogsExpanded: boolean;
  testResultsExpanded: boolean;
  activeProjectId: string;
  requestResponseRatio: number;

  // Actions
  getActiveWorkspace: () => WorkspaceState;
  setWorkspaceState: (projectId: string, state: Partial<WorkspaceState>) => void;
  openRequestTab: (projectId: string, tab: RequestTab) => void;
  closeRequestTab: (projectId: string, tabId: string) => void;
  setActiveRequestTab: (projectId: string, tabId: string) => void;
  setCurrentRequest: (projectId: string, request: CurlRequest | null) => void;
  setApiConfig: (projectId: string, config: ApiConfig) => void;
  updateApiConfig: (projectId: string, updater: (prev: ApiConfig) => ApiConfig) => void;
  setResponse: (projectId: string, response: any) => void;
  setFormattedResponse: (response: string) => void;
  setActiveCase: (projectId: string, caseId: string) => void;
  addCase: (projectId: string, newCase: RequestCaseState) => void;
  updateCase: (projectId: string, caseId: string, updates: Partial<RequestCaseState>) => void;
  deleteCase: (projectId: string, caseId: string) => void;
  renameCase: (projectId: string, oldPath: string, newName: string) => void;
  setExecuting: (executing: boolean) => void;
  setResponseBodyHeight: (height: number) => void;
  setScriptResultsHeight: (height: number) => void;
  setScriptLogsExpanded: (expanded: boolean) => void;
  setTestResultsExpanded: (expanded: boolean) => void;
  setActiveProjectId: (id: string) => void;
  setSelectedEnvironmentId: (projectId: string, envId: string) => void;
  setRequestEditorSurface: (projectId: string, surface: RequestEditorSurface) => void;
  setSidebarHighlightedCasePath: (projectId: string, path: string) => void;
  resetWorkspaceState: (projectId: string) => void;
  switchProjectTab: (projectId: string, targetTab: string, skipSaveCurrent?: boolean) => void;
  setRequestResponseRatio: (ratio: number) => void;
  // —— 多 tab 草稿隔离 actions ——
  /** 初始化 tab 内容（首次打开接口/新建接口时调用，同时写 baseline + draft，清除 dirty） */
  initTabContent: (projectId: string, tabId: string, config: ApiConfig) => void;
  /** 更新 tab 当前正在编辑的草稿（用户每次编辑都应调用，自动重算 dirty） */
  setTabDraft: (projectId: string, tabId: string, config: ApiConfig) => void;
  /** 标记 tab 已保存（保存成功后调用，把 draft 提升为 baseline，清除 dirty） */
  markTabSaved: (projectId: string, tabId: string) => void;
  /** 清除 tab 内容（关闭 tab 或放弃修改时调用） */
  clearTabContent: (projectId: string, tabId: string) => void;
  /** 判断 tab 是否有未保存改动 */
  isTabDirty: (projectId: string, tabId: string) => boolean;
  /** 取得当前激活 tab 的最新草稿（无草稿时回退到 workspace.apiConfig 兼容旧逻辑） */
  getCurrentApiConfig: (projectId: string) => ApiConfig;
  // —— 多 tab case 隔离 actions ——
  /** 初始化 tab 的 case 数据（首次进入 case 模式或打开含 case 的接口时调用） */
  initTabCases: (projectId: string, tabId: string, cases: RequestCaseState[], activeCaseId: string, interfaceConfig: ApiConfig) => void;
  /** 取得 tab 的 case 数据（按 tabId），缺失时回退到 workspace.requestCases 等旧字段 */
  getTabCases: (projectId: string, tabId: string) => { cases: RequestCaseState[]; activeCaseId: string; interfaceConfig: ApiConfig };
  /** 清除 tab 的 case 数据（关闭 tab 或放弃修改时调用） */
  clearTabCases: (projectId: string, tabId: string) => void;
  /**
   * 切到目标 tab 时，把全局共享字段（requestCases/activeCaseId/interfaceApiConfig/requestEditorSurface）
   * 恢复为该 tab 的快照。实现"切 tab 时 case 状态跟着切"的多 tab 隔离。
   * 如果目标 tab 没有 tabCases 记录（普通接口或兼容旧数据），保持当前全局状态。
   */
  restoreTabCasesToActive: (projectId: string, tabId: string) => void;
}

export const createEmptyWorkspaceState = (): WorkspaceState => ({
  requestTabs: [],
  activeRequestTab: '',
  currentRequest: null,
  tabResponses: {},
  response: null,
  selectedKeys: [],
  apiConfig: createDefaultApiConfig(),
  selectedEnvironmentId: '',
  requestCases: [],
  activeCaseId: '',
  interfaceApiConfig: createDefaultApiConfig(),
  requestEditorSurface: 'plain',
  sidebarHighlightedCasePath: '',
  expandedRequestPaths: new Set(),
  requestResponseRatio: 0.5,
  tabDrafts: {},
  tabBaselines: {},
  dirtyTabs: new Set(),
  tabCases: {},
  tabActiveCaseIds: {},
  tabInterfaceConfigs: {},
});

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    (set, get) => ({
      workspaceStates: {},
      executing: false,
      formattedResponse: '',
      responseBodyHeight: 200,
      scriptResultsHeight: 200,
      scriptLogsExpanded: true,
      testResultsExpanded: true,
      activeProjectId: '',
      requestResponseRatio: 0.5,

      getActiveWorkspace: () => {
        const { activeProjectId, workspaceStates } = get();
        return workspaceStates[activeProjectId] || createEmptyWorkspaceState();
      },

      setWorkspaceState: (projectId, state) => set((prev) => ({
        workspaceStates: {
          ...prev.workspaceStates,
          [projectId]: {
            ...prev.workspaceStates[projectId] || createEmptyWorkspaceState(),
            ...state,
          }
        }
      })),

      openRequestTab: (projectId, tab) => set((prev) => {
        const workspace = prev.workspaceStates[projectId] || createEmptyWorkspaceState();
        const existing = workspace.requestTabs.find((t) => t.id === tab.id);
        if (existing) {
          // 切换到已有 tab 时，恢复该 tab 保存的 response
          return {
            workspaceStates: {
              ...prev.workspaceStates,
              [projectId]: { 
                ...workspace, 
                activeRequestTab: tab.id,
                response: workspace.tabResponses[tab.id] || null,
              }
            }
          };
        }
        // 新建 tab，初始化该 tab 的 response 为 null
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestTabs: [...workspace.requestTabs, tab],
              activeRequestTab: tab.id,
              tabResponses: { ...workspace.tabResponses, [tab.id]: null },
              response: null,
            }
          }
        };
      }),

      closeRequestTab: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const newTabs = workspace.requestTabs.filter((t) => t.id !== tabId);
        let newActiveTab = workspace.activeRequestTab;
        let newResponse = workspace.response;
        let newTabResponses = { ...workspace.tabResponses };
        
        // 删除关闭 tab 的 response
        delete newTabResponses[tabId];
        
        if (workspace.activeRequestTab === tabId) {
          const closedIndex = workspace.requestTabs.findIndex((t) => t.id === tabId);
          newActiveTab = newTabs[closedIndex - 1]?.id || newTabs[0]?.id || '';
          // 切换到新 tab 时，恢复该 tab 保存的 response
          newResponse = newTabResponses[newActiveTab] || null;
        }
        
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { 
              ...workspace, 
              requestTabs: newTabs, 
              activeRequestTab: newActiveTab,
              tabResponses: newTabResponses,
              response: newResponse,
            }
          }
        };
      }),

      setActiveRequestTab: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        // 切换 tab 时，恢复该 tab 保存的 response
        const tabResponse = workspace.tabResponses[tabId] || null;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { 
              ...workspace, 
              activeRequestTab: tabId,
              response: tabResponse,
            }
          }
        };
      }),

      setCurrentRequest: (projectId, request) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, currentRequest: request }
          }
        };
      }),

      setApiConfig: (projectId, config) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, apiConfig: config }
          }
        };
      }),

      updateApiConfig: (projectId, updater) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, apiConfig: updater(workspace.apiConfig) }
          }
        };
      }),

      setResponse: (projectId, response) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        // 同时更新当前 tab 独立的 response 存储
        const newTabResponses = {
          ...workspace.tabResponses,
          [workspace.activeRequestTab]: response,
        };
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, response, tabResponses: newTabResponses }
          }
        };
      }),

      setFormattedResponse: (response) => set({ formattedResponse: response }),

      setActiveCase: (projectId, caseId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, activeCaseId: caseId }
          }
        };
      }),

      addCase: (projectId, newCase) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, requestCases: [...workspace.requestCases, newCase] }
          }
        };
      }),

      updateCase: (projectId, caseId, updates) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestCases: workspace.requestCases.map((c) =>
                c.id === caseId ? { ...c, ...updates } : c
              )
            }
          }
        };
      }),

      deleteCase: (projectId, caseId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestCases: workspace.requestCases.filter((c) => c.id !== caseId)
            }
          }
        };
      }),

      renameCase: (projectId, oldPath, newName) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestCases: workspace.requestCases.map((c) =>
                c.id === oldPath ? { ...c, name: newName } : c
              )
            }
          }
        };
      }),

      setExecuting: (executing) => set({ executing }),
      setResponseBodyHeight: (height) => set({ responseBodyHeight: height }),
      setScriptResultsHeight: (height) => set({ scriptResultsHeight: height }),
      setScriptLogsExpanded: (expanded) => set({ scriptLogsExpanded: expanded }),
      setTestResultsExpanded: (expanded) => set({ testResultsExpanded: expanded }),
      setActiveProjectId: (id) => set((prev) => {
        // 尝试从 localStorage 加载保存的环境选择
        const savedEnvId = localStorage.getItem(`apiman-env-${id}`);
        const workspace = prev.workspaceStates[id];
        // 只有在 workspace 已存在且 localStorage 中有保存的环境选择时才更新
        if (workspace && savedEnvId !== null) {
          return {
            activeProjectId: id,
            workspaceStates: {
              ...prev.workspaceStates,
              [id]: { ...workspace, selectedEnvironmentId: savedEnvId }
            }
          };
        }
        return { activeProjectId: id };
      }),

      setSelectedEnvironmentId: (projectId, envId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        // 同时持久化到 localStorage
        localStorage.setItem(`apiman-env-${projectId}`, envId);
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, selectedEnvironmentId: envId }
          }
        };
      }),

      setRequestEditorSurface: (projectId, surface) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, requestEditorSurface: surface }
          }
        };
      }),

      setSidebarHighlightedCasePath: (projectId, path) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, sidebarHighlightedCasePath: path }
          }
        };
      }),

      resetWorkspaceState: (projectId) => set((prev) => ({
        workspaceStates: {
          ...prev.workspaceStates,
          [projectId]: createEmptyWorkspaceState()
        }
      })),

      switchProjectTab: (projectId, targetTab, skipSaveCurrent = false) => {
        const { activeProjectId, workspaceStates } = get();
        if (!skipSaveCurrent && activeProjectId !== 'home' && activeProjectId !== targetTab) {
          // Save current state would be handled by caller
        }
        set({ activeProjectId: targetTab });
      },

      setRequestResponseRatio: (ratio) => set({ requestResponseRatio: ratio }),

      // —— 多 tab 草稿隔离实现 ——
      initTabContent: (projectId, tabId, config) => set((prev) => {
        const workspace = prev.workspaceStates[projectId] || createEmptyWorkspaceState();
        const nextDirty = new Set(workspace.dirtyTabs);
        nextDirty.delete(tabId);
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabDrafts: { ...workspace.tabDrafts, [tabId]: config },
              tabBaselines: { ...workspace.tabBaselines, [tabId]: config },
              dirtyTabs: nextDirty,
              // 同步给兼容字段，保持单一数据源
              apiConfig: workspace.activeRequestTab === tabId ? config : workspace.apiConfig,
            },
          },
        };
      }),

      setTabDraft: (projectId, tabId, config) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const nextDirty = new Set(workspace.dirtyTabs);
        // 任何编辑（包括修改、新增、删除、撤销重做等）都标记为 dirty
        // 这是用户期望的行为：UI 上任何改动 → tab 显示未保存状态
        // dirty 由 markTabSaved / initTabContent / clearTabContent 清掉
        nextDirty.add(tabId);
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabDrafts: { ...workspace.tabDrafts, [tabId]: config },
              dirtyTabs: nextDirty,
              apiConfig: workspace.activeRequestTab === tabId ? config : workspace.apiConfig,
            },
          },
        };
      }),

      markTabSaved: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const draft = workspace.tabDrafts[tabId];
        if (!draft) return prev;
        const nextDirty = new Set(workspace.dirtyTabs);
        nextDirty.delete(tabId);
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabBaselines: { ...workspace.tabBaselines, [tabId]: draft },
              dirtyTabs: nextDirty,
            },
          },
        };
      }),

      clearTabContent: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const newDrafts = { ...workspace.tabDrafts };
        const newBaselines = { ...workspace.tabBaselines };
        const newCases = { ...workspace.tabCases };
        const newIds = { ...workspace.tabActiveCaseIds };
        const newIfaces = { ...workspace.tabInterfaceConfigs };
        delete newDrafts[tabId];
        delete newBaselines[tabId];
        delete newCases[tabId];
        delete newIds[tabId];
        delete newIfaces[tabId];
        const nextDirty = new Set(workspace.dirtyTabs);
        nextDirty.delete(tabId);
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabDrafts: newDrafts,
              tabBaselines: newBaselines,
              tabCases: newCases,
              tabActiveCaseIds: newIds,
              tabInterfaceConfigs: newIfaces,
              dirtyTabs: nextDirty,
            },
          },
        };
      }),

      isTabDirty: (projectId, tabId) => {
        const workspace = get().workspaceStates[projectId];
        return workspace ? workspace.dirtyTabs.has(tabId) : false;
      },

      getCurrentApiConfig: (projectId) => {
        const workspace = get().workspaceStates[projectId];
        if (!workspace) return createDefaultApiConfig();
        const draft = workspace.tabDrafts[workspace.activeRequestTab];
        if (draft) return draft;
        // 兜底：没有 draft（极端情况下，比如 tab 刚被打开但还没 init），回退到旧 apiConfig
        return workspace.apiConfig;
      },

      // —— 多 tab case 隔离实现 ——
      initTabCases: (projectId, tabId, cases, activeCaseId, interfaceConfig) => set((prev) => {
        const workspace = prev.workspaceStates[projectId] || createEmptyWorkspaceState();
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabCases: { ...workspace.tabCases, [tabId]: cases },
              tabActiveCaseIds: { ...workspace.tabActiveCaseIds, [tabId]: activeCaseId },
              tabInterfaceConfigs: { ...workspace.tabInterfaceConfigs, [tabId]: interfaceConfig },
            },
          },
        };
      }),

      getTabCases: (projectId, tabId) => {
        const workspace = get().workspaceStates[projectId];
        if (!workspace) return { cases: [], activeCaseId: '', interfaceConfig: createDefaultApiConfig() };
        // 优先按 tabId 取（多 tab 隔离路径）
        const cases = workspace.tabCases[tabId];
        if (cases !== undefined) {
          return {
            cases,
            activeCaseId: workspace.tabActiveCaseIds[tabId] || '',
            interfaceConfig: workspace.tabInterfaceConfigs[tabId] || createDefaultApiConfig(),
          };
        }
        // 兜底：兼容旧逻辑（该 tab 在本次会话未触发 initTabCases，例如未进入 case 模式）
        // 回退到 workspace 级别的共享字段
        return {
          cases: workspace.requestCases,
          activeCaseId: workspace.activeCaseId,
          interfaceConfig: workspace.interfaceApiConfig,
        };
      },

      clearTabCases: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const newCases = { ...workspace.tabCases };
        const newIds = { ...workspace.tabActiveCaseIds };
        const newIfaces = { ...workspace.tabInterfaceConfigs };
        delete newCases[tabId];
        delete newIds[tabId];
        delete newIfaces[tabId];
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              tabCases: newCases,
              tabActiveCaseIds: newIds,
              tabInterfaceConfigs: newIfaces,
            },
          },
        };
      }),

      restoreTabCasesToActive: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        // 仅当目标 tab 有独立的 case 记录时，才覆盖全局字段
        if (workspace.tabCases[tabId] === undefined) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestCases: workspace.tabCases[tabId],
              activeCaseId: workspace.tabActiveCaseIds[tabId] || '',
              interfaceApiConfig: workspace.tabInterfaceConfigs[tabId] || workspace.interfaceApiConfig,
              requestEditorSurface: workspace.tabCases[tabId].length > 0 ? 'case' : 'interface',
            },
          },
        };
      }),
    }),
    { name: 'WorkspaceStore' }
  )
);
