import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentVariableRow {
  id: string;
  key: string;
  value: string;
}

export interface EnvironmentEditorTab {
  key: string;
  title: string;
  environmentId?: string;
  isNew?: boolean;
}

interface EnvironmentStore {
  environments: Environment[];
  selectedEnvironmentId: string;
  environmentsInitiallyLoaded: boolean;
  editingEnvironmentId: string;
  environmentFormName: string;
  environmentFormVariables: EnvironmentVariableRow[];
  environmentTabs: EnvironmentEditorTab[];
  activeEnvironmentTab: string;
  loading: boolean;
  saving: boolean;

  // Actions
  setEnvironments: (environments: Environment[]) => void;
  setSelectedEnvironmentId: (id: string) => void;
  setEnvironmentsInitiallyLoaded: (loaded: boolean) => void;
  setEditingEnvironmentId: (id: string) => void;
  setEnvironmentFormName: (name: string) => void;
  setEnvironmentFormVariables: (variables: EnvironmentVariableRow[]) => void;
  setEnvironmentTabs: (tabs: EnvironmentEditorTab[]) => void;
  setActiveEnvironmentTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  openEnvironmentTab: (env: Environment) => void;
  openCreateEnvironmentTab: (projectEnvCount: number) => void;
  closeEnvironmentTab: (tabKey: string) => void;
  resetEnvironmentEditor: () => void;
  environmentToRows: (variables: Record<string, string>) => EnvironmentVariableRow[];
  rowsToEnvironmentVariables: (rows: EnvironmentVariableRow[]) => Record<string, string>;
}

export const createEnvironmentVariableRow = (key: string = '', value: string = ''): EnvironmentVariableRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key,
  value,
});

export const useEnvironmentStore = create<EnvironmentStore>()(
  devtools(
    (set, get) => ({
      environments: [],
      selectedEnvironmentId: '',
      environmentsInitiallyLoaded: false,
      editingEnvironmentId: '',
      environmentFormName: '',
      environmentFormVariables: [createEnvironmentVariableRow()],
      environmentTabs: [],
      activeEnvironmentTab: '',
      loading: false,
      saving: false,

      setEnvironments: (environments) => set({ environments }),
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
      setEnvironmentsInitiallyLoaded: (loaded) => set({ environmentsInitiallyLoaded: loaded }),
      setEditingEnvironmentId: (id) => set({ editingEnvironmentId: id }),
      setEnvironmentFormName: (name) => set({ environmentFormName: name }),
      setEnvironmentFormVariables: (variables) => set({ environmentFormVariables: variables }),
      setEnvironmentTabs: (tabs) => set({ environmentTabs: tabs }),
      setActiveEnvironmentTab: (tab) => set({ activeEnvironmentTab: tab }),
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),

      openEnvironmentTab: (env) => set((state) => {
        const tabKey = `env-${env.id}`;
        if (state.environmentTabs.some((tab) => tab.key === tabKey)) {
          return { activeEnvironmentTab: tabKey };
        }
        return {
          environmentTabs: [...state.environmentTabs, { key: tabKey, title: env.name, environmentId: env.id }],
          activeEnvironmentTab: tabKey,
          editingEnvironmentId: env.id,
          environmentFormName: env.name,
          environmentFormVariables: get().environmentToRows(env.variables),
        };
      }),

      openCreateEnvironmentTab: (projectEnvCount) => set((state) => {
        const tabKey = `new-env-${Date.now()}`;
        return {
          environmentTabs: [...state.environmentTabs, { key: tabKey, title: '新建环境', isNew: true }],
          activeEnvironmentTab: tabKey,
          editingEnvironmentId: '',
          environmentFormName: `环境${projectEnvCount + 1}`,
          environmentFormVariables: [createEnvironmentVariableRow()],
        };
      }),

      closeEnvironmentTab: (tabKey) => set((state) => {
        const next = state.environmentTabs.filter((tab) => tab.key !== tabKey);
        if (state.activeEnvironmentTab === tabKey) {
          if (next.length === 0) {
            get().resetEnvironmentEditor();
          } else {
            return { environmentTabs: next, activeEnvironmentTab: next[0]?.key || '' };
          }
        }
        return { environmentTabs: next };
      }),

      resetEnvironmentEditor: () => set({
        editingEnvironmentId: '',
        environmentFormName: '',
        environmentFormVariables: [createEnvironmentVariableRow()],
      }),

      environmentToRows: (variables) => {
        const rows = Object.entries(variables || {}).map(([key, value]) => createEnvironmentVariableRow(key, value));
        return rows.length > 0 ? rows : [createEnvironmentVariableRow()];
      },

      rowsToEnvironmentVariables: (rows) => {
        return rows.reduce((acc, item) => {
          const key = item.key.trim();
          if (!key) return acc;
          acc[key] = item.value;
          return acc;
        }, {} as Record<string, string>);
      },
    }),
    { name: 'EnvironmentStore' }
  )
);
