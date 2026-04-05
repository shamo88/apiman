import { useCallback } from 'react';
import { message } from 'antd';
import { useHistoryStore } from '../store';
import {
  ListHistory,
  SearchHistory,
  GetHistoryEntry,
  DeleteHistory,
  ClearHistory,
} from '../../wailsjs/go/main/App';

export function useHistory() {
  const {
    historyList,
    historyDetail,
    historyLoading,
    filters,
    setHistoryList,
    setHistoryDetail,
    setHistoryLoading,
    setFilter,
    clearFilters,
    buildSearchParams,
  } = useHistoryStore();

  const loadHistory = useCallback(async (limit: number = 100) => {
    setHistoryLoading(true);
    try {
      const list = await ListHistory(limit);
      setHistoryList(list || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      message.error('加载历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [setHistoryList, setHistoryLoading]);

  const searchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = buildSearchParams();
      const list = await SearchHistory(params, 100);
      setHistoryList(list || []);
    } catch (error) {
      console.error('Failed to search history:', error);
      message.error('搜索历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [buildSearchParams, setHistoryList, setHistoryLoading]);

  const getHistoryEntry = useCallback(async (id: string) => {
    try {
      const entry = await GetHistoryEntry(id);
      setHistoryDetail(entry);
      return entry;
    } catch (error) {
      console.error('Failed to get history entry:', error);
      return null;
    }
  }, [setHistoryDetail]);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    try {
      await DeleteHistory(id);
      setHistoryList(historyList.filter((item: any) => item.id !== id));
      message.success('历史记录已删除');
    } catch (error: any) {
      message.error(`删除失败: ${error?.message || error}`);
    }
  }, [historyList, setHistoryList]);

  const clearAllHistory = useCallback(async () => {
    try {
      await ClearHistory();
      setHistoryList([]);
      message.success('历史记录已清空');
    } catch (error: any) {
      message.error(`清空失败: ${error?.message || error}`);
    }
  }, [setHistoryList]);

  return {
    historyList,
    historyDetail,
    historyLoading,
    filters,
    loadHistory,
    searchHistory,
    getHistoryEntry,
    deleteHistoryEntry,
    clearAllHistory,
    setFilter,
    clearFilters,
  };
}
