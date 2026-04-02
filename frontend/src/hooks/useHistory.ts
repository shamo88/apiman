import { useState, useCallback } from 'react';
import { ListHistory, GetHistoryEntry, DeleteHistory, ClearHistory, SearchHistory } from '../../wailsjs/go/main/App';

interface UseHistorySearch {
    project: string;
    name: string;
    url: string;
    method: string;
    status: string;
    source: string;
}

interface UseHistoryReturn {
    historyList: any[];
    historyDetail: any | null;
    historyLoading: boolean;
    historySearch: UseHistorySearch;
    setHistoryList: React.Dispatch<React.SetStateAction<any[]>>;
    setHistoryDetail: (detail: any | null) => void;
    setHistoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setHistorySearch: (search: UseHistorySearch) => void;
    loadHistoryList: () => Promise<void>;
    loadHistoryDetail: (id: string) => Promise<void>;
    handleSearch: () => Promise<void>;
    handleClearSearch: () => void;
    handleClearHistory: () => Promise<void>;
}

export const useHistory = (): UseHistoryReturn => {
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historyDetail, setHistoryDetail] = useState<any | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState<UseHistorySearch>({
        project: '',
        name: '',
        url: '',
        method: '',
        status: '',
        source: '',
    });

    const loadHistoryList = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const list = await ListHistory(100);
            setHistoryList(list || []);
        } catch (e) {
            console.error('Failed to load history:', e);
            setHistoryList([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadHistoryDetail = useCallback(async (id: string) => {
        setHistoryLoading(true);
        try {
            const detail = await GetHistoryEntry(id);
            setHistoryDetail(detail);
        } catch (e) {
            console.error('Failed to load history detail:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const handleSearch = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const params: any = {};
            if (historySearch.project) params.project = historySearch.project;
            if (historySearch.name) params.name = historySearch.name;
            if (historySearch.url) params.url = historySearch.url;
            if (historySearch.method) params.method = historySearch.method.toUpperCase();
            if (historySearch.status) params.status = parseInt(historySearch.status, 10) || 0;
            if (historySearch.source) params.source = historySearch.source.toUpperCase();
            const result = await SearchHistory(params, 100);
            setHistoryList(result || []);
        } catch (e) {
            console.error('Failed to search history:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, [historySearch]);

    const handleClearSearch = useCallback(() => {
        setHistorySearch({
            project: '',
            name: '',
            url: '',
            method: '',
            status: '',
            source: '',
        });
        loadHistoryList();
    }, [loadHistoryList]);

    const handleClearHistory = useCallback(async () => {
        try {
            await ClearHistory();
            setHistoryList([]);
        } catch (e) {
            console.error('Failed to clear history:', e);
        }
    }, []);

    return {
        historyList,
        historyDetail,
        historyLoading,
        historySearch,
        setHistoryList,
        setHistoryDetail,
        setHistoryLoading,
        setHistorySearch,
        loadHistoryList,
        loadHistoryDetail,
        handleSearch,
        handleClearSearch,
        handleClearHistory,
    };
};
