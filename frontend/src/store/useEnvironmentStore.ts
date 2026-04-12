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

interface EnvironmentStore {
  environments: Environment[];
  selectedEnvironmentId: string;
  environmentsInitiallyLoaded: boolean;
  editingEnvironmentId: string;
  environmentFormName: string;
  environmentFormVariables: EnvironmentVariableRow[];
  loading: boolean;
  saving: boolean;

  // Actions
  setEnvironments: (environments: Environment[]) => void;
  setSelectedEnvironmentId: (id: string) => void;
  setEnvironmentsInitiallyLoaded: (loaded: boolean) => void;
  setEditingEnvironmentId: (id: string) => void;
  setEnvironmentFormName: (name: string) => void;
  setEnvironmentFormVariables: (variables: EnvironmentVariableRow[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  openEnvironmentEditor: (env: Environment) => void;
  openCreateEnvironmentEditor: (projectEnvCount: number) => void;
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
    (set) => ({
      environments: [],
      selectedEnvironmentId: '',
      environmentsInitiallyLoaded: false,
      editingEnvironmentId: '',
      environmentFormName: '',
      environmentFormVariables: [createEnvironmentVariableRow()],
      loading: false,
      saving: false,

      setEnvironments: (environments) => set({ environments }),
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
      setEnvironmentsInitiallyLoaded: (loaded) => set({ environmentsInitiallyLoaded: loaded }),
      setEditingEnvironmentId: (id) => set({ editingEnvironmentId: id }),
      setEnvironmentFormName: (name) => set({ environmentFormName: name }),
      setEnvironmentFormVariables: (variables) => set({ environmentFormVariables: variables }),
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),

      openEnvironmentEditor: (env) => set({
        editingEnvironmentId: env.id,
        environmentFormName: env.name,
        environmentFormVariables: environmentToRows(env.variables),
      }),

      openCreateEnvironmentEditor: (projectEnvCount) => set({
        editingEnvironmentId: '',
        environmentFormName: `环境${projectEnvCount + 1}`,
        environmentFormVariables: [createEnvironmentVariableRow()],
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

// Helper function for useEnvironmentStore
function environmentToRows(variables: Record<string, string>): EnvironmentVariableRow[] {
  const rows = Object.entries(variables || {}).map(([key, value]) => createEnvironmentVariableRow(key, value));
  return rows.length > 0 ? rows : [createEnvironmentVariableRow()];
}