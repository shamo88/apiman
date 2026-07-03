import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Environment {
  id: string;
  name: string;
  // `mark` is intentionally typed as `string | undefined` so the value
  // coming back from the wails-generated `models.Environment` (also
  // `string | undefined`) is directly assignable. The known set is
  // enumerated below; callers that care about a specific value should
  // use the EnvironmentMarkValue union.
  mark?: string;
  variables: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

// The known set of selectable marks, mirroring the backend's
// models.AllEnvironmentMarks. Order is significant — this drives the
// order of the mark selector dropdown.
export const ALL_ENVIRONMENT_MARKS = ['', 'dev', 'test', 'pre', 'prod'] as const;
export type EnvironmentMarkValue = (typeof ALL_ENVIRONMENT_MARKS)[number];

export const ENVIRONMENT_MARK_LABELS: Record<string, string> = {
  '': '未标记',
  dev: '开发',
  test: '测试',
  pre: '预发布',
  prod: '正式',
};

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
  environmentFormMark: EnvironmentMarkValue;
  environmentFormVariables: EnvironmentVariableRow[];
  loading: boolean;
  saving: boolean;

  // Actions
  setEnvironments: (environments: Environment[]) => void;
  setSelectedEnvironmentId: (id: string) => void;
  setEnvironmentsInitiallyLoaded: (loaded: boolean) => void;
  setEditingEnvironmentId: (id: string) => void;
  setEnvironmentFormName: (name: string) => void;
  setEnvironmentFormMark: (mark: EnvironmentMarkValue) => void;
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
      environmentFormMark: '',
      environmentFormVariables: [createEnvironmentVariableRow()],
      loading: false,
      saving: false,

      setEnvironments: (environments) => set({ environments }),
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
      setEnvironmentsInitiallyLoaded: (loaded) => set({ environmentsInitiallyLoaded: loaded }),
      setEditingEnvironmentId: (id) => set({ editingEnvironmentId: id }),
      setEnvironmentFormName: (name) => set({ environmentFormName: name }),
      setEnvironmentFormMark: (mark) => set({ environmentFormMark: mark }),
      setEnvironmentFormVariables: (variables) => set({ environmentFormVariables: variables }),
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),

      openEnvironmentEditor: (env) => set({
        editingEnvironmentId: env.id,
        environmentFormName: env.name,
        // env.mark is a free-form string from the wails-generated type;
        // the form state is a narrower union, so we validate here rather
        // than at the boundary to keep the form field type-safe.
        environmentFormMark: isKnownMark(env.mark) ? env.mark : '',
        environmentFormVariables: environmentToRows(env.variables),
      }),

      openCreateEnvironmentEditor: (projectEnvCount) => set({
        editingEnvironmentId: '',
        environmentFormName: `环境${projectEnvCount + 1}`,
        environmentFormMark: '',
        environmentFormVariables: [createEnvironmentVariableRow()],
      }),

      resetEnvironmentEditor: () => set({
        editingEnvironmentId: '',
        environmentFormName: '',
        environmentFormMark: '',
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

// isKnownMark narrows an arbitrary string (e.g. from the wails-generated
// Environment type) to the strict union used by the form / dropdown.
// Unrecognized values collapse to '' so they display as "未标记".
export function isKnownMark(s: string | undefined): s is EnvironmentMarkValue {
  return typeof s === 'string' && (ALL_ENVIRONMENT_MARKS as readonly string[]).includes(s);
}