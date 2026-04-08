import React, { useState } from 'react';
import { AppstoreOutlined, CloseOutlined, MinusOutlined, SearchOutlined, SettingOutlined, KeyOutlined } from '@ant-design/icons';
import { Select, Tabs } from 'antd';
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../../wailsjs/runtime/runtime';
import { SettingsModal } from './SettingsModal';
import { useEnvironmentStore, useProjectStore, useUIStore, useWorkspaceStore } from '../../store';

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

  const handleClose = async () => {
    try {
      await Quit();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
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
      projectStore.closeProjectTab(targetKey as string);
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
              className={`title-bar-environment-select${uiStore.appTheme === 'dark' ? ' title-bar-environment-select-dark' : ''}`}
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
              title="快捷键 (Ctrl+Shift+?)"
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
