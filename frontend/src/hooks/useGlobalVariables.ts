import { useCallback, useState } from 'react';
import { message } from 'antd';
import { GetGlobalVariables, SaveGlobalVariables } from '../../wailsjs/go/main/App';

export function useGlobalVariables() {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await GetGlobalVariables();
      setVariables(result || {});
    } catch (error: unknown) {
      console.error('Failed to load global variables:', error);
      message.error('加载全局变量失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback(
    async (next: Record<string, string>) => {
      const previous = variables;
      // Optimistic update first
      setVariables(next);
      try {
        await SaveGlobalVariables(next);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        message.error(`保存失败: ${errMsg}`);
        // Revert on failure
        setVariables(previous);
        throw error;
      }
    },
    [variables]
  );

  const set = useCallback(
    async (key: string, value: string) => {
      if (!key) {
        message.warning('变量名不能为空');
        return;
      }
      const next = { ...variables, [key]: value };
      try {
        await persist(next);
      } catch {
        // Error already surfaced via message + state reverted
      }
    },
    [variables, persist]
  );

  const unset = useCallback(
    async (key: string) => {
      if (!(key in variables)) return;
      const next = { ...variables };
      delete next[key];
      try {
        await persist(next);
      } catch {
        // Error already surfaced
      }
    },
    [variables, persist]
  );

  const renameKey = useCallback(
    async (oldKey: string, newKey: string) => {
      if (oldKey === newKey) return;
      if (!newKey) {
        message.warning('变量名不能为空');
        return;
      }
      if (!(oldKey in variables)) return;
      if (newKey in variables && newKey !== oldKey) {
        message.error(`变量名 "${newKey}" 已存在`);
        return;
      }
      const value = variables[oldKey];
      const next: Record<string, string> = { ...variables };
      delete next[oldKey];
      next[newKey] = value;
      try {
        await persist(next);
      } catch {
        // Error already surfaced
      }
    },
    [variables, persist]
  );

  const saveAll = useCallback(
    async (next: Record<string, string>) => {
      try {
        await persist(next);
        message.success('全局变量已保存');
      } catch {
        // Error already surfaced
      }
    },
    [persist]
  );

  return {
    variables,
    loading,
    load,
    set,
    unset,
    renameKey,
    saveAll,
  };
}