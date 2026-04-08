import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ProjectScript {
  id: string;
  project_id: string;
  name: string;
  description: string;
  path: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScriptStore {
  scripts: ProjectScript[];
  editingScriptId: string;
  scriptFormName: string;
  scriptFormDescription: string;
  scriptFormContent: string;
  loading: boolean;
  saving: boolean;

  // Actions
  setScripts: (scripts: ProjectScript[]) => void;
  setEditingScriptId: (id: string) => void;
  setScriptFormName: (name: string) => void;
  setScriptFormDescription: (description: string) => void;
  setScriptFormContent: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  openScriptEditor: (script: ProjectScript) => void;
  closeScriptEditor: () => void;
  selectScript: (script: ProjectScript) => void;
  resetScriptForm: () => void;
}

export const useScriptStore = create<ScriptStore>()(
  devtools(
    (set) => ({
      scripts: [],
      editingScriptId: '',
      scriptFormName: '',
      scriptFormDescription: '',
      scriptFormContent: '// 在这里编写 JavaScript 脚本\n',
      loading: false,
      saving: false,

      setScripts: (scripts) => set({ scripts }),
      setEditingScriptId: (id) => set({ editingScriptId: id }),
      setScriptFormName: (name) => set({ scriptFormName: name }),
      setScriptFormDescription: (description) => set({ scriptFormDescription: description }),
      setScriptFormContent: (content) => set({ scriptFormContent: content }),
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),

      openScriptEditor: (script) => set({
        editingScriptId: script.id,
        scriptFormName: script.name,
        scriptFormDescription: script.description || '',
        scriptFormContent: script.content || '',
      }),

      closeScriptEditor: () => set({
        editingScriptId: '',
        scriptFormName: '',
        scriptFormDescription: '',
        scriptFormContent: '// 在这里编写 JavaScript 脚本\n',
      }),

      selectScript: (script) => set({
        editingScriptId: script.id,
        scriptFormName: script.name,
        scriptFormDescription: script.description || '',
        scriptFormContent: script.content || '',
      }),

      resetScriptForm: () => set({
        editingScriptId: '',
        scriptFormName: '',
        scriptFormDescription: '',
        scriptFormContent: '// 在这里编写 JavaScript 脚本\n',
      }),
    }),
    { name: 'ScriptStore' }
  )
);
