import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ApiConfig, createDefaultApiConfig, RequestEditorSurface, RequestCaseState, RequestTab, CurlRequest } from '../constants/defaults';

interface WorkspaceState {
  requestTabs: RequestTab[];
  activeRequestTab: string;
  currentRequest: CurlRequest | null;
  response: any;
  selectedKeys: string[];
  apiConfig: ApiConfig;
  selectedEnvironmentId: string;
  requestCases: RequestCaseState[];
  activeCaseId: string;
  interfaceApiConfig: ApiConfig;
  requestEditorSurface: RequestEditorSurface;
  sidebarHighlightedCasePath: string;
  expandedRequestPaths: Set<string>;
  requestResponseRatio: number;
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
}

export const createEmptyWorkspaceState = (): WorkspaceState => ({
  requestTabs: [],
  activeRequestTab: '',
  currentRequest: null,
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
          return {
            workspaceStates: {
              ...prev.workspaceStates,
              [projectId]: { ...workspace, activeRequestTab: tab.id }
            }
          };
        }
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: {
              ...workspace,
              requestTabs: [...workspace.requestTabs, tab],
              activeRequestTab: tab.id,
            }
          }
        };
      }),

      closeRequestTab: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        const newTabs = workspace.requestTabs.filter((t) => t.id !== tabId);
        let newActiveTab = workspace.activeRequestTab;
        if (workspace.activeRequestTab === tabId) {
          const closedIndex = workspace.requestTabs.findIndex((t) => t.id === tabId);
          newActiveTab = newTabs[closedIndex - 1]?.id || newTabs[0]?.id || '';
        }
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, requestTabs: newTabs, activeRequestTab: newActiveTab }
          }
        };
      }),

      setActiveRequestTab: (projectId, tabId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, activeRequestTab: tabId }
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
        return {
          workspaceStates: {
            ...prev.workspaceStates,
            [projectId]: { ...workspace, response }
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
      setActiveProjectId: (id) => set({ activeProjectId: id }),

      setSelectedEnvironmentId: (projectId, envId) => set((prev) => {
        const workspace = prev.workspaceStates[projectId];
        if (!workspace) return prev;
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
    }),
    { name: 'WorkspaceStore' }
  )
);
