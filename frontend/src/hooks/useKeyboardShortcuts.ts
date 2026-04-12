import { useEffect, useCallback, useRef, useState } from 'react';
import { message } from 'antd';
import { useUIStore, useProjectStore, useWorkspaceStore, useEnvironmentStore } from '../store';
import { toWailsHttpSpec } from '../utils/curlUtils';

export interface ShortcutDefinition {
  id: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  key: string;
  description: string;
}

export const SHORTCUTS_LIST: ShortcutDefinition[] = [
  { id: 'send-request', modifiers: ['ctrl'], key: 'Enter', description: '发送请求' },
  { id: 'new-request', modifiers: ['ctrl'], key: 'N', description: '新建请求' },
  { id: 'save', modifiers: ['ctrl'], key: 'S', description: '保存' },
  { id: 'new-folder', modifiers: ['ctrl', 'shift'], key: 'N', description: '新建文件夹' },
  { id: 'environment', modifiers: ['ctrl'], key: 'E', description: '切换环境' },
  { id: 'search', modifiers: ['ctrl'], key: 'F', description: '全局搜索' },
  { id: 'tab-switch', modifiers: ['ctrl'], key: 'Tab', description: '切换请求标签' },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const getModifierKey = () => isMac ? '⌘' : 'Ctrl';

export const formatShortcut = (modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[], key: string): string => {
  const modifierKeyMap: Record<string, string> = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
    meta: isMac ? '⌘' : 'Cmd',
  };
  const parts = modifiers.map(mod => modifierKeyMap[mod]);
  const displayKey = key.length === 1 ? key.toUpperCase() : key;
  return [...parts, displayKey].join(isMac ? '' : '+');
};

export const useKeyboardShortcuts = () => {
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const uiStoreRef = useRef(useUIStore.getState());
  const projectStoreRef = useRef(useProjectStore.getState());
  const workspaceStoreRef = useRef(useWorkspaceStore.getState());
  const environmentStoreRef = useRef(useEnvironmentStore.getState());

  useEffect(() => {
    uiStoreRef.current = useUIStore.getState();
    projectStoreRef.current = useProjectStore.getState();
    workspaceStoreRef.current = useWorkspaceStore.getState();
    environmentStoreRef.current = useEnvironmentStore.getState();
  });

  const showShortcutFeedback = useCallback((shortcutId: string) => {
    setActiveShortcut(shortcutId);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setActiveShortcut(null);
    }, 300);
  }, []);

  const isModalOpen = useCallback(() => {
    const state = uiStoreRef.current;
    return (
      state.createProjectModal ||
      state.createFolderModal ||
      state.createRequestModal ||
      state.renameModal ||
      state.cookieModalVisible ||
      state.historyModalVisible ||
      state.mcpModalVisible ||
      state.scriptHelpVisible ||
      state.addCaseModalOpen ||
      state.caseRenameModalOpen ||
      state.createGroupModal ||
      state.renameProjectModal ||
      state.renameGroupModal ||
      state.globalSearchVisible
    );
  }, []);

  const isInWorkspace = useCallback(() => {
    return projectStoreRef.current.activeTab !== 'home';
  }, []);

  const handleSendRequest = useCallback(async () => {
    if (!isInWorkspace() || isModalOpen()) return;

    const workspaceState = workspaceStoreRef.current.getActiveWorkspace();
    const projectStore = projectStoreRef.current;
    const workspaceStore = workspaceStoreRef.current;

    if (workspaceState.requestTabs.length === 0) {
      message.warning('请先选择一个请求');
      return;
    }

    const project = projectStore.projectTabs.find(t => t.id === projectStore.activeTab)?.project;
    if (!project) return;

    showShortcutFeedback('send-request');
    workspaceStore.setExecuting(true);

    try {
      const { ExecuteHTTPRequestWithScripts } = await import('../../wailsjs/go/main/App');
      const spec = toWailsHttpSpec(workspaceState.apiConfig);
      // Always use ExecuteHTTPRequestWithScripts to ensure environment variables and globals are substituted
      const response = await ExecuteHTTPRequestWithScripts(
        project.id,
        workspaceState.currentRequest?.name || 'api',
        workspaceState.currentRequest?.name || 'request',
        workspaceState.currentRequest?.path || '',
        workspaceState.selectedEnvironmentId,
        spec,
        workspaceState.apiConfig.preScripts,
        workspaceState.apiConfig.postScripts
      );

      workspaceStore.setResponse(project.id, response);

      if (response?.body) {
        try {
          const json = JSON.parse(response.body);
          workspaceStore.setFormattedResponse(JSON.stringify(json, null, 2));
        } catch {
          workspaceStore.setFormattedResponse(response.body);
        }
      }
    } catch (error: any) {
      message.error(`请求失败: ${error?.message || error}`);
    } finally {
      workspaceStore.setExecuting(false);
    }
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  const handleNewRequest = useCallback(() => {
    if (!isInWorkspace() || isModalOpen()) return;
    showShortcutFeedback('new-request');
    uiStoreRef.current.openCreateRequestModal('');
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  const handleSave = useCallback(async () => {
    if (!isInWorkspace() || isModalOpen()) return;

    const workspaceState = workspaceStoreRef.current.getActiveWorkspace();
    const projectStore = projectStoreRef.current;
    const workspaceStore = workspaceStoreRef.current;

    if (!workspaceState.currentRequest?.path) {
      message.warning('没有需要保存的请求');
      return;
    }

    const project = projectStore.projectTabs.find(t => t.id === projectStore.activeTab)?.project;
    if (!project) return;

    showShortcutFeedback('save');

    try {
      const { UpdateRequest, UpdateRequestScripts, GetProjectTree } = await import('../../wailsjs/go/main/App');
      const { models } = await import('../../wailsjs/go/models');

      const wailsCases = workspaceState.requestCases.map(c =>
        models.HttpRequestCase.createFrom({
          id: c.id,
          name: (c.name || '').trim() || '未命名',
          spec: models.HttpRequestSpec.createFrom(toWailsHttpSpec({ ...c.config, name: '' })),
        })
      );

      await UpdateRequest(
        workspaceState.currentRequest.path,
        toWailsHttpSpec({ ...workspaceState.apiConfig, name: '' }),
        wailsCases,
        workspaceState.activeCaseId
      );

      await UpdateRequestScripts(
        workspaceState.currentRequest.path,
        workspaceState.apiConfig.preScripts,
        workspaceState.apiConfig.postScripts
      );

      const tree = await GetProjectTree(project.id);
      projectStore.setProjectTree(project.id, tree);

      message.success('请求已保存');
    } catch (error: any) {
      message.error(`保存失败: ${error?.message || error}`);
    }
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  const handleNewFolder = useCallback(() => {
    if (!isInWorkspace() || isModalOpen()) return;
    showShortcutFeedback('new-folder');
    uiStoreRef.current.openCreateFolderModal('');
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  const handleEnvironmentSwitch = useCallback(() => {
    if (!isInWorkspace() || isModalOpen()) return;

    const workspaceState = workspaceStoreRef.current.getActiveWorkspace();
    const environmentStore = environmentStoreRef.current;
    const workspaceStore = workspaceStoreRef.current;
    const projectStore = projectStoreRef.current;

    const environments = environmentStore.environments;
    if (environments.length === 0) {
      message.info('暂无环境，请先创建环境');
      return;
    }

    showShortcutFeedback('environment');

    const currentIndex = environments.findIndex(e => e.id === workspaceState.selectedEnvironmentId);
    const nextIndex = (currentIndex + 1) % (environments.length + 1);

    if (nextIndex === environments.length) {
      workspaceStore.setWorkspaceState(projectStore.activeTab, { selectedEnvironmentId: '' });
      message.info('已切换到: 不使用环境');
    } else {
      workspaceStore.setWorkspaceState(projectStore.activeTab, { selectedEnvironmentId: environments[nextIndex].id });
      message.info(`已切换到: ${environments[nextIndex]?.name}`);
    }
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  const handleGlobalSearch = useCallback(() => {
    if (isModalOpen()) return;
    showShortcutFeedback('search');
    uiStoreRef.current.openGlobalSearch();
  }, [isModalOpen, showShortcutFeedback]);

  const handleTabSwitch = useCallback(() => {
    if (!isInWorkspace() || isModalOpen()) return;

    const workspaceState = workspaceStoreRef.current.getActiveWorkspace();
    const workspaceStore = workspaceStoreRef.current;
    const projectStore = projectStoreRef.current;

    const tabs = workspaceState.requestTabs;
    if (tabs.length <= 1) return;

    showShortcutFeedback('tab-switch');

    const currentIndex = tabs.findIndex(t => t.id === workspaceState.activeRequestTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    workspaceStore.setActiveRequestTab(projectStore.activeTab, tabs[nextIndex].id);
  }, [isInWorkspace, isModalOpen, showShortcutFeedback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isModalOpen() || !isInWorkspace()) return;

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isMacPlatform = isMac;
      const modifierKey = isMacPlatform ? metaKey : ctrlKey;

      if (modifierKey && key === 'Enter') {
        event.preventDefault();
        handleSendRequest();
        return;
      }

      if (modifierKey && !shiftKey && key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNewRequest();
        return;
      }

      if (modifierKey && key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
        return;
      }

      if (modifierKey && shiftKey && key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNewFolder();
        return;
      }

      if (modifierKey && key.toLowerCase() === 'e') {
        event.preventDefault();
        handleEnvironmentSwitch();
        return;
      }

      if (modifierKey && key.toLowerCase() === 'f') {
        event.preventDefault();
        handleGlobalSearch();
        return;
      }

      if (modifierKey && key === 'Tab') {
        event.preventDefault();
        handleTabSwitch();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isInWorkspace, handleSendRequest, handleNewRequest, handleSave, handleNewFolder, handleEnvironmentSwitch, handleGlobalSearch, handleTabSwitch]);

  return {
    activeShortcut,
    isMac,
    getModifierKey,
    formatShortcut,
  };
};
