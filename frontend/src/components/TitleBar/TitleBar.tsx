import React, { useState } from 'react';
import { AppstoreOutlined, CloseOutlined, MinusOutlined, SearchOutlined, SettingOutlined, KeyOutlined, GlobalOutlined } from '@ant-design/icons';
import { Select, Tabs, message } from 'antd';
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../../wailsjs/runtime/runtime';
import { SettingsModal } from './SettingsModal';
import { MCPRuntimeStatus } from '../MCPRuntimeStatus';
import { useEnvironmentStore, useProjectStore, useUIStore, useWorkspaceStore } from '../../store';
import { confirmDirtyCloseAll } from '../../hooks/useWorkspaceHandlers';
import { UpdateRequest, UpdateRequestScripts } from '../../../wailsjs/go/main/App';
import { toWailsHttpSpec } from '../../utils/curlUtils';

interface TitleBarProps {
  onOpenShortcutsHelp?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenShortcutsHelp }) => {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const workspaceStore = useWorkspaceStore();
  const environmentStore = useEnvironmentStore();

  const [settingsVisible, setSettingsVisible] = useState(false);

  const activeWorkspace = workspaceStore.getActiveWorkspace();
  const selectedEnvId = activeWorkspace.selectedEnvironmentId || '__none__';
  const environments = environmentStore.environments;

  const activeTab = projectStore.activeTab;
  const projectTabs = projectStore.projectTabs;

  const handleMinimize = async () => {
    try {
      await WindowMinimise();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await WindowToggleMaximise();
    } catch (error) {
      console.error('Failed to maximize/unmaximize window:', error);
    }
  };

  // —— 脏数据保护工具 ——

  /** 获取指定项目下所有 dirty tabId 列表 */
  const getProjectDirtyTabIds = (projectId: string): string[] => {
    const ws = workspaceStore.workspaceStates[projectId];
    if (!ws) return [];
    return Array.from(ws.dirtyTabs);
  };

  /** 获取所有项目中 dirty tab 的总数（用于退出 app 时的全局检查） */
  const getTotalDirtyCount = (): number => {
    let count = 0;
    for (const projectId of Object.keys(workspaceStore.workspaceStates)) {
      count += workspaceStore.workspaceStates[projectId].dirtyTabs.size;
    }
    return count;
  };

  /** 丢弃指定项目下所有 dirty tab 的草稿 */
  const discardProjectDirtyTabs = (projectId: string) => {
    const ws = workspaceStore.workspaceStates[projectId];
    if (!ws) return;
    const dirtyIds: string[] = [];
    ws.dirtyTabs.forEach((id) => dirtyIds.push(id));
    dirtyIds.forEach((tabId) => workspaceStore.clearTabContent(projectId, tabId));
  };

  /**
   * 保存指定项目下所有 dirty tabs
   * 返回是否全部成功（任一失败立刻停止并返回 false）
   */
  const saveProjectDirtyTabs = async (projectId: string): Promise<boolean> => {
    const ws = workspaceStore.workspaceStates[projectId];
    if (!ws) return true;
    const dirtyIds: string[] = [];
    ws.dirtyTabs.forEach((id) => dirtyIds.push(id));
    if (dirtyIds.length === 0) return true;

    for (const tabId of dirtyIds) {
      const tab = ws.requestTabs.find((t) => t.id === tabId);
      const draft = ws.tabDrafts[tabId];
      if (!tab || !draft) continue;
      try {
        // 直接调 Wails API（不依赖 useProjects hook，因为这里是 TitleBar 上下文）
        await UpdateRequest(
          tab.path,
          toWailsHttpSpec({ ...draft, name: '' }),
          [],
          '',
        );
        await UpdateRequestScripts(tab.path, draft.preScripts, draft.postScripts);
        workspaceStore.markTabSaved(projectId, tabId);
      } catch (e: any) {
        message.error(`保存失败：${e?.message || String(e)}`);
        return false;
      }
    }
    return true;
  };

  /** 关闭项目 tab（带 dirty 拦截） */
  const handleCloseProject = async (projectId: string) => {
    const dirtyIds = getProjectDirtyTabIds(projectId);
    const projectName = projectStore.projectTabs.find((t) => t.id === projectId)?.title || '项目';

    if (dirtyIds.length > 0) {
      const choice = await confirmDirtyCloseAll(`关闭项目 "${projectName}"`, dirtyIds.length);
      if (choice === 'cancel') return;
      if (choice === 'save-all') {
        const ok = await saveProjectDirtyTabs(projectId);
        if (!ok) return; // 保存失败保留 dirty tabs，不关闭
      } else {
        discardProjectDirtyTabs(projectId);
      }
    }

    projectStore.closeProjectTab(projectId);
    workspaceStore.resetWorkspaceState(projectId);
  };

  /** 退出 app（带全局 dirty 拦截） */
  const handleQuit = async () => {
    const totalDirty = getTotalDirtyCount();
    if (totalDirty > 0) {
      const choice = await confirmDirtyCloseAll('退出 Apiman', totalDirty);
      if (choice === 'cancel') return;
      if (choice === 'save-all') {
        const projectIds = Object.keys(workspaceStore.workspaceStates)
          .filter((pid) => workspaceStore.workspaceStates[pid].dirtyTabs.size > 0);
        for (const pid of projectIds) {
          const ok = await saveProjectDirtyTabs(pid);
          if (!ok) {
            message.error('部分保存失败，已中止退出');
            return;
          }
        }
      } else {
        for (const pid of Object.keys(workspaceStore.workspaceStates)) {
          discardProjectDirtyTabs(pid);
        }
      }
    }
    try {
      await Quit();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  const handleClose = async () => {
    await handleQuit();
  };

  const handleOpenSettings = () => {
    setSettingsVisible(true);
  };

  const handleTabChange = (key: string) => {
    if (key === '__home__') {
      switchProjectTab('home');
    } else {
      switchProjectTab(key);
    }
  };

  const handleTabEdit = (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
    if (action === 'remove' && targetKey !== 'home') {
      const closingProjectId = targetKey as string;
      // 关闭项目 tab 前检查 dirty tabs，弹 Modal 让用户选择保存/放弃/取消
      handleCloseProject(closingProjectId);
    }
  };

  const switchProjectTab = (tabId: string) => {
    if (projectStore.activeTab !== 'home' && tabId !== 'home') {
      const workspaceStore = useWorkspaceStore.getState();
      const currentWorkspace = workspaceStore.getActiveWorkspace();
      workspaceStore.setWorkspaceState(projectStore.activeTab, currentWorkspace);
    }
    projectStore.setActiveTab(tabId);
    if (tabId !== 'home') {
      useWorkspaceStore.getState().setActiveProjectId(tabId);
    }
  };

  const homeTabItem = { key: 'home', label: '主页', closable: false };
  const projectTabItems = projectTabs.map(tab => ({ key: tab.id, label: tab.title }));
  const projectTabsActiveKey = activeTab === 'home' ? '__home__' : activeTab;

  return (
    <>
      <div className="title-bar">
        <div className="title-bar-left">
          <img
            src="/logo.png"
            alt="Apiman"
            className="title-bar-logo-img"
          />

          <div className="title-bar-tabs-wrap">
            <div
              className={`title-bar-home-tab${activeTab === 'home' ? ' active' : ''}`}
              onClick={() => handleTabChange('home')}
              style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
            >
              主页
            </div>
            <Tabs
              activeKey={projectTabsActiveKey}
              onChange={handleTabChange}
              type="editable-card"
              hideAdd
              onEdit={handleTabEdit}
              items={projectTabItems}
              size="small"
              className="title-bar-tabs"
            />
          </div>
        </div>

        <div className="title-bar-controls">
          {projectStore.activeTab !== 'home' && (
            <Select
              className="title-bar-environment-select"
              size="small"
              value={selectedEnvId}
              onChange={(value) => {
                const envId = value === '__none__' ? '' : value;
                workspaceStore.setSelectedEnvironmentId(projectStore.activeTab, envId);
              }}
              options={[
                { label: '无环境', value: '__none__' },
                ...environments.map(env => ({ label: env.name, value: env.id }))
              ]}
              style={{ width: 120, marginRight: 8 }}
            />
          )}
          <MCPRuntimeStatus />
          <button
            className="title-bar-button settings"
            onClick={handleOpenSettings}
            title="设置"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <SettingOutlined />
          </button>
          <button
            className="title-bar-button settings"
            onClick={() => uiStore.openGlobalVariablesModal()}
            title="全局变量"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <GlobalOutlined />
          </button>
          <button
            className="title-bar-button settings"
            onClick={() => uiStore.openGlobalSearch()}
            title="全局搜索 (Ctrl+F)"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <SearchOutlined />
          </button>
          {onOpenShortcutsHelp && (
            <button
              className="title-bar-button settings"
              onClick={onOpenShortcutsHelp}
              title="快捷键"
              style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
            >
              <KeyOutlined />
            </button>
          )}
          <button
            className="title-bar-button minimize"
            onClick={handleMinimize}
            title="最小化"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <MinusOutlined />
          </button>
          <button
            className="title-bar-button maximize"
            onClick={handleMaximize}
            title="最大化"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <AppstoreOutlined />
          </button>
          <button
            className="title-bar-button close"
            onClick={handleClose}
            title="关闭"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </>
  );
};
