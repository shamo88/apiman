import { useState, useCallback } from 'react';
import { ListHistory, GetHistoryEntry, DeleteHistory, ClearHistory, SearchHistory } from '../../wailsjs/go/main/App';

interface UseHistoryReturn {
    historyList: any[];
    historyDetail: any | null;
    historyLoading: boolean;
    historySearchProject: string;
    historySearchName: string;
    historySearchURL: string;
    historySearchMethod: string;
    historySearchStatus: string;
    historySearchSource: string;
    setHistoryList: React.Dispatch<React.SetStateAction<any[]>>;
    setHistoryDetail: (detail: any | null) => void;
    setHistoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setHistorySearchProject: (value: string) => void;
    setHistorySearchName: (value: string) => void;
    setHistorySearchURL: (value: string) => void;
    setHistorySearchMethod: (value: string) => void;
    setHistorySearchStatus: (value: string) => void;
    setHistorySearchSource: (value: string) => void;
    loadHistoryList: () => Promise<void>;
    loadHistoryDetail: (id: string) => Promise<void>;
    searchHistory: () => Promise<void>;
    clearHistorySearch: () => void;
    handleClearHistory: () => Promise<void>;
}

export const useHistory = (): UseHistoryReturn => {
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historyDetail, setHistoryDetail] = useState<any | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearchProject, setHistorySearchProject] = useState('');
    const [historySearchName, setHistorySearchName] = useState('');
    const [historySearchURL, setHistorySearchURL] = useState('');
    const [historySearchMethod, setHistorySearchMethod] = useState('');
    const [historySearchStatus, setHistorySearchStatus] = useState('');
    const [historySearchSource, setHistorySearchSource] = useState('');

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

    const searchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const params: any = {};
            if (historySearchProject) params.project = historySearchProject;
            if (historySearchName) params.name = historySearchName;
            if (historySearchURL) params.url = historySearchURL;
            if (historySearchMethod) params.method = historySearchMethod.toUpperCase();
            if (historySearchStatus) params.status = parseInt(historySearchStatus, 10) || 0;
            if (historySearchSource) params.source = historySearchSource.toUpperCase();
            const result = await SearchHistory(params, 100);
            setHistoryList(result || []);
        } catch (e) {
            console.error('Failed to search history:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, [historySearchProject, historySearchName, historySearchURL, historySearchMethod, historySearchStatus, historySearchSource]);

    const clearHistorySearch = useCallback(() => {
        setHistorySearchProject('');
        setHistorySearchName('');
        setHistorySearchURL('');
        setHistorySearchMethod('');
        setHistorySearchStatus('');
        setHistorySearchSource('');
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
        historySearchProject,
        historySearchName,
        historySearchURL,
        historySearchMethod,
        historySearchStatus,
        historySearchSource,
        setHistoryList,
        setHistoryDetail,
        setHistoryLoading,
        setHistorySearchProject,
        setHistorySearchName,
        setHistorySearchURL,
        setHistorySearchMethod,
        setHistorySearchStatus,
        setHistorySearchSource,
        loadHistoryList,
        loadHistoryDetail,
        searchHistory,
        clearHistorySearch,
        handleClearHistory,
    };
};
