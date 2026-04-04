import { useState, useCallback, useEffect } from 'react';
import { message, Modal } from 'antd';
import { Environment, EnvironmentVariableRow, EnvironmentEditorTab, createEnvironmentVariableRow, ProjectTab } from '../types';
import { LoadEnvironments, CreateEnvironment, UpdateEnvironment, DeleteEnvironment } from '../../wailsjs/go/main/App';

export interface UseEnvironmentState {
    environments: Environment[];
    selectedEnvironmentId: string;
    environmentsInitiallyLoaded: boolean;
    editingEnvironmentId: string;
    environmentFormName: string;
    environmentFormVariables: EnvironmentVariableRow[];
    envLoading: boolean;
    envSaving: boolean;
    environmentTabs: EnvironmentEditorTab[];
    activeEnvironmentTab: string;
}

export interface UseEnvironmentActions {
    // Data loading
    loadEnvironmentsData: (projectId: string) => Promise<void>;
    // Tab management
    openEnvironmentEditor: (env: Environment) => void;
    openCreateEnvironmentTab: (projectTabs: ProjectTab[], activeTab: string) => void;
    closeEnvironmentTab: (tabKey: string) => void;
    setActiveEnvironmentTab: (tabKey: string) => void;
    setSelectedEnvironmentId: (id: string) => void;
    // Editor state
    resetEnvironmentEditor: () => void;
    updateEnvironmentName: (name: string) => void;
    addVariable: () => void;
    removeVariable: (id: string) => void;
    updateVariable: (id: string, field: 'key' | 'value', value: string) => void;
    // CRUD operations
    saveEnvironment: (projectId: string) => Promise<void>;
    deleteEnvironment: (projectId: string) => Promise<void>;
}

export type UseEnvironment = UseEnvironmentState & UseEnvironmentActions;

export function useEnvironment(): UseEnvironment {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [environmentsInitiallyLoaded, setEnvironmentsInitiallyLoaded] = useState(false);
    const [editingEnvironmentId, setEditingEnvironmentId] = useState<string>('');
    const [environmentFormName, setEnvironmentFormName] = useState('');
    const [environmentFormVariables, setEnvironmentFormVariables] = useState<EnvironmentVariableRow[]>([createEnvironmentVariableRow()]);
    const [envLoading, setEnvLoading] = useState(false);
    const [envSaving, setEnvSaving] = useState(false);
    const [environmentTabs, setEnvironmentTabs] = useState<EnvironmentEditorTab[]>([]);
    const [activeEnvironmentTab, setActiveEnvironmentTab] = useState<string>('');

    const environmentToRows = useCallback((variables: Record<string, string>): EnvironmentVariableRow[] => {
        const rows = Object.entries(variables || {}).map(([key, value]) => createEnvironmentVariableRow(key, value));
        return rows.length > 0 ? rows : [createEnvironmentVariableRow()];
    }, []);

    const rowsToEnvironmentVariables = useCallback((rows: EnvironmentVariableRow[]): Record<string, string> => {
        return rows.reduce((acc, item) => {
            const key = item.key.trim();
            if (!key) return acc;
            acc[key] = item.value;
            return acc;
        }, {} as Record<string, string>);
    }, []);

    const resetEnvironmentEditor = useCallback(() => {
        setEditingEnvironmentId('');
        setEnvironmentFormName('');
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
    }, []);

    const loadEnvironmentsData = useCallback(async (projectId: string) => {
        setEnvLoading(true);
        setEnvironmentsInitiallyLoaded(false);
        try {
            const envs = await LoadEnvironments(projectId);
            setEnvironments(envs || []);
        } catch (error: any) {
            console.error('Failed to load environments:', error);
            message.error(`加载环境失败: ${error?.message || error}`);
            setEnvironments([]);
        } finally {
            setEnvLoading(false);
        }
    }, []);

    const openEnvironmentEditor = useCallback((env: Environment) => {
        const tabKey = `env-${env.id}`;
        setEnvironmentTabs(prev => {
            if (prev.some(tab => tab.key === tabKey)) return prev;
            return [...prev, { key: tabKey, title: env.name, environmentId: env.id }];
        });
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    }, [environmentToRows]);

    const openCreateEnvironmentTab = useCallback((projectTabs: ProjectTab[], activeTab: string) => {
        const p = projectTabs.find(t => t.id === activeTab)?.project;
        if (!p?.id) {
            message.warning('请先打开项目');
            return;
        }
        const tabKey = `new-env-${Date.now()}`;
        setEnvironmentTabs(prev => [...prev, { key: tabKey, title: '新建环境', isNew: true }]);
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId('');
        setEnvironmentFormName(`环境${environments.length + 1}`);
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
    }, [environments.length]);

    const closeEnvironmentTab = useCallback((tabKey: string) => {
        setEnvironmentTabs(prev => {
            const next = prev.filter(tab => tab.key !== tabKey);
            if (activeEnvironmentTab === tabKey) {
                setActiveEnvironmentTab(next[0]?.key || '');
                if (next.length === 0) {
                    resetEnvironmentEditor();
                }
            }
            return next;
        });
    }, [activeEnvironmentTab, resetEnvironmentEditor]);

    // Editor state actions
    const updateEnvironmentName = useCallback((name: string) => {
        setEnvironmentFormName(name);
    }, []);

    const addVariable = useCallback(() => {
        setEnvironmentFormVariables(prev => [...prev, createEnvironmentVariableRow()]);
    }, []);

    const removeVariable = useCallback((id: string) => {
        setEnvironmentFormVariables(prev => {
            const next = prev.filter(row => row.id !== id);
            return next.length > 0 ? next : [createEnvironmentVariableRow()];
        });
    }, []);

    const updateVariable = useCallback((id: string, field: 'key' | 'value', value: string) => {
        setEnvironmentFormVariables(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    }, []);

    const saveEnvironment = useCallback(async (projectId: string) => {
        if (!projectId) {
            message.warning('请先打开项目');
            return;
        }
        const name = environmentFormName.trim();
        if (!name) {
            message.warning('请输入环境名称');
            return;
        }

        const variables = rowsToEnvironmentVariables(environmentFormVariables);
        setEnvSaving(true);
        try {
            if (editingEnvironmentId) {
                await UpdateEnvironment(projectId, editingEnvironmentId, name, variables);
                message.success('环境已更新');
            } else {
                const created = await CreateEnvironment(projectId, name, variables);
                message.success('环境已创建');
                setSelectedEnvironmentId(created.id);
                setEnvironmentTabs(prev => prev.map(tab => tab.key === activeEnvironmentTab
                    ? { key: `env-${created.id}`, title: created.name, environmentId: created.id }
                    : tab));
                setActiveEnvironmentTab(`env-${created.id}`);
                setEditingEnvironmentId(created.id);
            }
            await loadEnvironmentsData(projectId);
        } catch (error: any) {
            message.error(`保存环境失败: ${error?.message || error}`);
        } finally {
            setEnvSaving(false);
        }
    }, [environmentFormName, environmentFormVariables, editingEnvironmentId, activeEnvironmentTab, rowsToEnvironmentVariables, loadEnvironmentsData]);

    const deleteEnvironment = useCallback(async (projectId: string) => {
        if (!projectId || !editingEnvironmentId) return;
        Modal.confirm({
            title: '删除环境',
            content: '确定删除当前环境吗？删除后无法恢复。',
            onOk: async () => {
                try {
                    await DeleteEnvironment(projectId, editingEnvironmentId);
                    message.success('环境已删除');
                    await loadEnvironmentsData(projectId);
                    setEnvironmentTabs(prev => prev.filter(tab => tab.environmentId !== editingEnvironmentId));
                    resetEnvironmentEditor();
                } catch (error: any) {
                    message.error(`删除环境失败: ${error?.message || error}`);
                }
            }
        });
    }, [editingEnvironmentId, loadEnvironmentsData, resetEnvironmentEditor]);

    // Sync environment tabs when environments change
    useEffect(() => {
        setEnvironmentTabs(prev => prev
            .filter(tab => tab.isNew || (tab.environmentId && environments.some(env => env.id === tab.environmentId)))
            .map(tab => {
                if (tab.isNew || !tab.environmentId) return tab;
                const env = environments.find(item => item.id === tab.environmentId);
                return env ? { ...tab, title: env.name } : tab;
            }));
    }, [environments]);

    // Sync editor state when active environment tab changes
    useEffect(() => {
        if (!activeEnvironmentTab) return;
        const activeTab = environmentTabs.find(tab => tab.key === activeEnvironmentTab);
        if (!activeTab) return;
        if (activeTab.isNew) {
            setEditingEnvironmentId('');
            setEnvironmentFormName(prev => prev || `环境${environments.length + 1}`);
            setEnvironmentFormVariables(prev => prev.length ? prev : [createEnvironmentVariableRow()]);
            return;
        }
        if (!activeTab.environmentId) return;
        const env = environments.find(item => item.id === activeTab.environmentId);
        if (!env) return;
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    }, [activeEnvironmentTab, environmentTabs, environments, environmentToRows]);

    // Handle environment deletion or selection changes
    useEffect(() => {
        if (environments.length === 0) {
            if (selectedEnvironmentId) {
                setSelectedEnvironmentId('');
            }
            if (editingEnvironmentId) {
                resetEnvironmentEditor();
            }
            return;
        }

        // Auto-select first environment only on initial load, not on subsequent changes
        // This preserves user's explicit selection of "不使用环境"
        if (!environmentsInitiallyLoaded) {
            if (!selectedEnvironmentId) {
                setSelectedEnvironmentId(environments[0].id);
            }
            setEnvironmentsInitiallyLoaded(true);
        }

        if (editingEnvironmentId && !environments.some(env => env.id === editingEnvironmentId)) {
            resetEnvironmentEditor();
        }
    }, [environments, selectedEnvironmentId, editingEnvironmentId, environmentsInitiallyLoaded, resetEnvironmentEditor]);

    return {
        // State
        environments,
        selectedEnvironmentId,
        environmentsInitiallyLoaded,
        editingEnvironmentId,
        environmentFormName,
        environmentFormVariables,
        envLoading,
        envSaving,
        environmentTabs,
        activeEnvironmentTab,
        // Actions
        loadEnvironmentsData,
        openEnvironmentEditor,
        openCreateEnvironmentTab,
        closeEnvironmentTab,
        resetEnvironmentEditor,
        updateEnvironmentName,
        addVariable,
        removeVariable,
        updateVariable,
        saveEnvironment,
        deleteEnvironment,
        setActiveEnvironmentTab,
        setSelectedEnvironmentId,
    };
}
