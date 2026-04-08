import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { models } from '../../wailsjs/go/models';

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
  buildSearchParams: () => models.HistorySearchParams;
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
        const params = new models.HistorySearchParams();
        params.project = filters.project;
        params.name = filters.name;
        params.url = filters.url;
        params.method = filters.method.toUpperCase();
        params.status = parseInt(filters.status, 10) || 0;
        params.source = filters.source.toUpperCase();
        params.tool = '';
        params.from = '';
        params.to = '';
        params.keyword = '';
        return params;
      },
    }),
    { name: 'HistoryStore' }
  )
);
