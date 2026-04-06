import React, { useState } from 'react';
import { Form, Col, Divider, Modal, Row } from 'antd';
import { SettingOutlined, GlobalOutlined, GithubOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { GeneralSettings } from './GeneralSettings';
import { ProxySettings } from './ProxySettings';
import { GitSyncSettings } from './GitSyncSettings';
import { AboutSettings } from './AboutSettings';
import { config as wailsConfig } from '../../../wailsjs/go/models';
import { LoadAppConfig, SaveAppConfig, DisableGitSync, EnableGitSync, InitProjectsDir, ListProjects } from '../../../wailsjs/go/main/App';
import { useUIStore, useProjectStore } from '../../store';

export interface GeneralSettingsProps {
  form: ReturnType<typeof Form.useForm>[0];
  theme: string;
  onSave: () => void;
  onCancel: () => void;
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const parsePort = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const intPort = Math.trunc(parsed);
  if (intPort < 1 || intPort > 65535) {
    return undefined;
  }
  return intPort;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const uiStore = useUIStore();
  const projectStore = useProjectStore();
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [form] = Form.useForm();

  const theme = uiStore.appTheme;

  const handleGitSyncChange = async (enabled: boolean) => {
    const { ListProjects } = await import('../../../wailsjs/go/main/App');
    try {
      const list = await ListProjects();
      projectStore.setProjects(list || []);
    } catch (error) {
      console.error('Failed to reload projects after Git Sync change:', error);
    }
  };

  const settingsMenuItems = [
    { key: 'general', label: '通用', icon: <SettingOutlined /> },
    { key: 'proxy', label: '网络代理', icon: <GlobalOutlined /> },
    { key: 'git', label: 'Git 同步', icon: <GithubOutlined /> },
  ];

  const handleSave = async () => {
    try {
      const currentConfig = await LoadAppConfig();
      const wasGitSyncEnabled = currentConfig?.gitSync?.enabled && !!currentConfig?.gitSync?.remoteUrl;

      let fieldsToValidate: string[] = [];
      if (activeSettingsTab === 'general') {
        fieldsToValidate = ['ui'];
      } else if (activeSettingsTab === 'proxy') {
        fieldsToValidate = ['proxy'];
      } else if (activeSettingsTab === 'git') {
        fieldsToValidate = ['gitSync'];
      }

      const values = await form.validateFields(fieldsToValidate);

      const configToSave = new wailsConfig.AppConfig({
        proxy: activeSettingsTab === 'proxy' ? {
          enabled: Boolean(values?.proxy?.enabled),
          httpHost: values?.proxy?.httpHost || '',
          httpPort: parsePort(values?.proxy?.httpPort),
          httpsHost: values?.proxy?.httpsHost || '',
          httpsPort: parsePort(values?.proxy?.httpsPort),
          socks5Host: values?.proxy?.socks5Host || '',
          socks5Port: parsePort(values?.proxy?.socks5Port),
        } : {
          enabled: currentConfig?.proxy?.enabled ?? false,
          httpHost: currentConfig?.proxy?.httpHost || '',
          httpPort: parsePort(currentConfig?.proxy?.httpPort),
          httpsHost: currentConfig?.proxy?.httpsHost || '',
          httpsPort: parsePort(currentConfig?.proxy?.httpsPort),
          socks5Host: currentConfig?.proxy?.socks5Host || '',
          socks5Port: parsePort(currentConfig?.proxy?.socks5Port),
        },
        ui: activeSettingsTab === 'general' ? {
          enableListAnimation: Boolean(values?.ui?.enableListAnimation),
          theme: values?.ui?.theme || 'light',
        } : {
          enableListAnimation: currentConfig?.ui?.enableListAnimation ?? false,
          theme: currentConfig?.ui?.theme || 'light',
        },
        gitSync: activeSettingsTab === 'git' ? {
          enabled: Boolean(values?.gitSync?.enabled),
          remoteUrl: values?.gitSync?.remoteUrl || '',
          branch: values?.gitSync?.branch || 'main',
          password: values?.gitSync?.password || '',
        } : {
          enabled: currentConfig?.gitSync?.enabled ?? false,
          remoteUrl: currentConfig?.gitSync?.remoteUrl || '',
          branch: currentConfig?.gitSync?.branch || 'main',
          password: currentConfig?.gitSync?.password || '',
        },
      });

      const newGitSyncEnabled = configToSave.gitSync.enabled && !!configToSave.gitSync.remoteUrl;

      await SaveAppConfig(configToSave);

      if (!wasGitSyncEnabled && newGitSyncEnabled) {
        await EnableGitSync(values?.gitSync?.remoteUrl || '', values?.gitSync?.branch || 'main', values?.gitSync?.password || '');
      } else if (wasGitSyncEnabled && !newGitSyncEnabled) {
        await DisableGitSync();
      }

      // Handle Git Sync state change
      if (wasGitSyncEnabled !== newGitSyncEnabled) {
        handleGitSyncChange(newGitSyncEnabled);
      }

      // Update app state directly
      uiStore.setAnimationEnabled(configToSave.ui.enableListAnimation);
      uiStore.setAppTheme(configToSave.ui.theme as 'light' | 'dark');

      await InitProjectsDir();

      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
      const errorMsg = (error as Error)?.message || String(error) || '未知错误';
      alert('保存失败: ' + errorMsg);
    }
  };

  const renderContent = () => {
    const props = { form, theme, onSave: handleSave, onCancel: onClose };
    switch (activeSettingsTab) {
      case 'general':
        return <GeneralSettings {...props} />;
      case 'proxy':
        return <ProxySettings {...props} />;
      case 'git':
        return <GitSyncSettings {...props} />;
      case 'about':
        return <AboutSettings theme={theme} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      title="设置"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className={`settings-modal ${theme === 'dark' ? 'theme-dark' : ''}`}
    >
      <div className={theme === 'dark' ? 'theme-dark' : ''} style={{ background: 'var(--bg-secondary)', minHeight: 400 }}>
        <Row gutter={0} style={{ minHeight: 400 }}>
          <Col span={6} style={{ borderRight: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}`, paddingRight: 16 }}>
            {settingsMenuItems.map(item => (
              <div
                key={item.key}
                onClick={() => setActiveSettingsTab(item.key)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  cursor: 'pointer',
                  borderRadius: 6,
                  background: activeSettingsTab === item.key ? (theme === 'dark' ? 'rgba(99,102,241,0.2)' : '#e6f7ff') : 'transparent',
                  color: activeSettingsTab === item.key ? (theme === 'dark' ? '#818cf8' : '#1890ff') : (theme === 'dark' ? '#e8e8e8' : '#333'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}

            <Divider style={{ margin: '16px 0' }} />

            <div
              onClick={() => setActiveSettingsTab('about')}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: activeSettingsTab === 'about' ? (theme === 'dark' ? '#818cf8' : '#1890ff') : (theme === 'dark' ? '#e8e8e8' : '#333'),
                background: activeSettingsTab === 'about' ? (theme === 'dark' ? 'rgba(99,102,241,0.2)' : '#e6f7ff') : 'transparent',
              }}
            >
              <InfoCircleOutlined />
              <span>关于</span>
            </div>
          </Col>

          <Col span={18} style={{ paddingLeft: 24 }}>
            {renderContent()}
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
