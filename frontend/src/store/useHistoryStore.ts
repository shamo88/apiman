import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface HistoryEntry {
  id: string;
  source: string;
  source_tool?: string;
  project_name: string;
  request_name: string;
  method: string;
  url: string;
  created_at: string;
  spec?: unknown;
  response?: {
    status_code?: number;
    duration?: number;
  };
}

interface HistoryFilters {
  project: string;
  name: string;
  url: string;
  method: string;
  status: string;
  source: string;
}

interface HistoryStore {
  historyList: HistoryEntry[];
  historyDetail: HistoryEntry | null;
  historyLoading: boolean;
  filters: HistoryFilters;

  // Actions
  setHistoryList: (list: HistoryEntry[]) => void;
  setHistoryDetail: (detail: HistoryEntry | null) => void;
  setHistoryLoading: (loading: boolean) => void;
  setFilter: (field: keyof HistoryFilters, value: string) => void;
  clearFilters: () => void;
  buildSearchParams: () => Record<string, string | number>;
}

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    (set, get) => ({
      historyList: [],
      historyDetail: null,
      historyLoading: false,
      filters: {
        project: '',
        name: '',
        url: '',
        method: '',
        status: '',
        source: '',
      },

      setHistoryList: (list) => set({ historyList: list }),
      setHistoryDetail: (detail) => set({ historyDetail: detail }),
      setHistoryLoading: (loading) => set({ historyLoading: loading }),
      setFilter: (field, value) => set((state) => ({
        filters: { ...state.filters, [field]: value }
      })),
      clearFilters: () => set({
        filters: {
          project: '',
          name: '',
          url: '',
          method: '',
          status: '',
          source: '',
        }
      }),
      buildSearchParams: () => {
        const { filters } = get();
        const params: Record<string, string | number> = {};
        if (filters.project) params.project = filters.project;
        if (filters.name) params.name = filters.name;
        if (filters.url) params.url = filters.url;
        if (filters.method) params.method = filters.method.toUpperCase();
        if (filters.status) params.status = parseInt(filters.status, 10) || 0;
        if (filters.source) params.source = filters.source.toUpperCase();
        return params;
      },
    }),
    { name: 'HistoryStore' }
  )
);
