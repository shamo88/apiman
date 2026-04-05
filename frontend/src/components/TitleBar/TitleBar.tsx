import React, { useState } from 'react';
import { AppstoreOutlined, CloseOutlined, MinusOutlined, SettingOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../../wailsjs/runtime/runtime';
import { SettingsModal } from './SettingsModal';
import { LoadAppConfig } from '../../../wailsjs/go/main/App';

interface TitleBarProps {
  title?: string;
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onTabEdit?: (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => void;
  tabItems?: any[];
  onListAnimationChange?: (enabled: boolean) => void;
  onThemeChange?: (theme: string) => void;
  theme?: string;
  onSettingsSave?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  title = 'Apiman',
  activeTab,
  onTabChange,
  onTabEdit,
  tabItems,
  onListAnimationChange,
  onThemeChange,
  theme = 'light',
  onSettingsSave,
}) => {
  const [settingsVisible, setSettingsVisible] = useState(false);

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

  const handleOpenSettings = async () => {
    try {
      const config = await LoadAppConfig();
      // Settings modal will load its own form data
      setSettingsVisible(true);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const homeTabItem = tabItems?.find((item: any) => item?.key === 'home');
  const projectTabItems = (tabItems || []).filter((item: any) => item?.key !== 'home');
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

          {tabItems && onTabChange && (
            <div className="title-bar-tabs-wrap">
              {homeTabItem && (
                <div
                  className={`title-bar-home-tab${activeTab === 'home' ? ' active' : ''}`}
                  onClick={() => onTabChange('home')}
                  style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
                >
                  {homeTabItem.label}
                </div>
              )}
              <Tabs
                activeKey={projectTabsActiveKey}
                onChange={onTabChange}
                type="editable-card"
                hideAdd
                onEdit={onTabEdit}
                items={projectTabItems}
                size="small"
                className="title-bar-tabs"
              />
            </div>
          )}
        </div>

        <div className="title-bar-controls">
          <button
            className="title-bar-button settings"
            onClick={handleOpenSettings}
            title="设置"
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          >
            <SettingOutlined />
          </button>
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
        theme={theme}
        onClose={() => setSettingsVisible(false)}
        onSettingsSave={onSettingsSave}
        onListAnimationChange={onListAnimationChange}
        onThemeChange={onThemeChange}
      />
    </>
  );
};
