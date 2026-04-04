import { useState, useCallback } from 'react';
import { ListHistory, GetHistoryEntry, ClearHistory, SearchHistory } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

export interface UseHistoryReturn {
    // Data
    historyList: models.RequestHistory[];
    historyDetail: models.RequestHistory | null;
    historyLoading: boolean;

    // Search params
    searchParams: {
        project?: string;
        name?: string;
        url?: string;
        method?: string;
        status?: number;
        source?: string;
    };
    setSearchProject: (value: string) => void;
    setSearchName: (value: string) => void;
    setSearchURL: (value: string) => void;
    setSearchMethod: (value: string) => void;
    setSearchStatus: (value: string) => void;
    setSearchSource: (value: string) => void;

    // Actions
    loadHistoryList: () => Promise<void>;
    loadHistoryDetail: (id: string) => Promise<void>;
    clearDetail: () => void;
    searchHistory: () => Promise<void>;
    clearSearch: () => void;
    clearAllHistory: () => Promise<void>;
}

export const useHistory = (): UseHistoryReturn => {
    const [historyList, setHistoryList] = useState<models.RequestHistory[]>([]);
    const [historyDetail, setHistoryDetail] = useState<models.RequestHistory | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Search params - managed by hook
    const [searchParams, setSearchParams] = useState<{
        project?: string;
        name?: string;
        url?: string;
        method?: string;
        status?: number;
        source?: string;
    }>({});

    const setSearchProject = useCallback((value: string) => {
        setSearchParams(prev => ({ ...prev, project: value || undefined }));
    }, []);

    const setSearchName = useCallback((value: string) => {
        setSearchParams(prev => ({ ...prev, name: value || undefined }));
    }, []);

    const setSearchURL = useCallback((value: string) => {
        setSearchParams(prev => ({ ...prev, url: value || undefined }));
    }, []);

    const setSearchMethod = useCallback((value: string) => {
        setSearchParams(prev => ({ ...prev, method: value || undefined }));
    }, []);

    const setSearchStatus = useCallback((value: string) => {
        setSearchParams(prev => ({
            ...prev,
            status: value ? parseInt(value, 10) || undefined : undefined
        }));
    }, []);

    const setSearchSource = useCallback((value: string) => {
        setSearchParams(prev => ({ ...prev, source: value || undefined }));
    }, []);

    const loadHistoryList = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const list = await ListHistory(100);
            setHistoryList((list || []) as unknown as models.RequestHistory[]);
        } catch (e) {
            console.error('Failed to load history:', e);
            setHistoryList([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadHistoryDetail = useCallback(async (id: string) => {
        if (!id) {
            setHistoryDetail(null);
            return;
        }
        setHistoryLoading(true);
        try {
            const detail = await GetHistoryEntry(id);
            setHistoryDetail(detail as unknown as models.RequestHistory);
        } catch (e) {
            console.error('Failed to load history detail:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const clearDetail = useCallback(() => {
        setHistoryDetail(null);
    }, []);

    const searchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const wailsParams = models.HistorySearchParams.createFrom(searchParams);
            const result = await SearchHistory(wailsParams, 100);
            setHistoryList((result || []) as unknown as models.RequestHistory[]);
        } catch (e) {
            console.error('Failed to search history:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, [searchParams]);

    const clearSearch = useCallback(() => {
        setSearchParams({});
        loadHistoryList();
    }, [loadHistoryList]);

    const clearAllHistory = useCallback(async () => {
        try {
            await ClearHistory();
            setHistoryList([]);
        } catch (e) {
            console.error('Failed to clear history:', e);
        }
    }, []);

    return {
        // Data
        historyList,
        historyDetail,
        historyLoading,

        // Search params
        searchParams,
        setSearchProject,
        setSearchName,
        setSearchURL,
        setSearchMethod,
        setSearchStatus,
        setSearchSource,

        // Actions
        loadHistoryList,
        loadHistoryDetail,
        clearDetail,
        searchHistory,
        clearSearch,
        clearAllHistory,
    };
};
