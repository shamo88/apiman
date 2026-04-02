import { AppstoreOutlined, CloseOutlined, GithubOutlined, GlobalOutlined, InfoCircleOutlined, MinusOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, InputNumber, message, Modal, Radio, Row, Select, Space, Switch, Tabs } from 'antd';
import React from 'react';
import { DisableGitSync, EnableGitSync, InitGitRepo, InitProjectsDir, LoadAppConfig, SaveAppConfig, SyncAllProjectsToGit } from '../../../wailsjs/go/main/App';
import { config as wailsConfig } from '../../../wailsjs/go/models';
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../../wailsjs/runtime/runtime';

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

export const TitleBar: React.FC<TitleBarProps> = ({
    title = 'Apiman',
    activeTab,
    onTabChange,
    onTabEdit,
    tabItems,
    onListAnimationChange,
    onThemeChange,
    theme = 'light',
    onSettingsSave
}) => {
    const [settingsVisible, setSettingsVisible] = React.useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('general');
    const [gitSyncing, setGitSyncing] = React.useState(false);
    const [form] = Form.useForm();

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
            form.setFieldsValue({
                proxy: {
                    enabled: config.proxy?.enabled || false,
                    httpHost: config.proxy?.httpHost || '',
                    httpPort: config.proxy?.httpPort || undefined,
                    httpsHost: config.proxy?.httpsHost || '',
                    httpsPort: config.proxy?.httpsPort || undefined,
                    socks5Host: config.proxy?.socks5Host || '',
                    socks5Port: config.proxy?.socks5Port || undefined,
                },
                ui: {
                    enableListAnimation: config.ui?.enableListAnimation ?? false,
                    theme: config.ui?.theme ?? 'light',
                },
                gitSync: {
                    enabled: config.gitSync?.enabled ?? false,
                    remoteUrl: config.gitSync?.remoteUrl || '',
                    branch: config.gitSync?.branch || 'main',
                    password: config.gitSync?.password || '',
                },
            });
            setSettingsVisible(true);
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    };

    const handleSaveSettings = async () => {
        try {
            // 获取当前配置
            const currentConfig = await LoadAppConfig();
            const wasGitSyncEnabled = currentConfig?.gitSync?.enabled && !!currentConfig?.gitSync?.remoteUrl;

            // 只验证当前激活的 Tab 的字段
            let fieldsToValidate: string[] = [];
            if (activeSettingsTab === 'general') {
                fieldsToValidate = ['ui'];
            } else if (activeSettingsTab === 'proxy') {
                fieldsToValidate = ['proxy'];
            } else if (activeSettingsTab === 'git') {
                fieldsToValidate = ['gitSync'];
            }

            const values = await form.validateFields(fieldsToValidate);

            // 以 currentConfig 为基础，只用表单值覆盖当前 Tab 的部分
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

            // 处理 git sync 状态切换
            if (!wasGitSyncEnabled && newGitSyncEnabled) {
                await EnableGitSync(
                    values?.gitSync?.remoteUrl || '',
                    values?.gitSync?.branch || 'main',
                    values?.gitSync?.password || ''
                );
            } else if (wasGitSyncEnabled && !newGitSyncEnabled) {
                await DisableGitSync();
            }

            await InitProjectsDir();

            onListAnimationChange?.(configToSave.ui.enableListAnimation);
            onThemeChange?.(configToSave.ui.theme);
            onSettingsSave?.();
            console.log('Config saved successfully');
            setSettingsVisible(false);
        } catch (error) {
            console.error('Failed to save config:', error);
            const errorMsg = (error as Error)?.message || String(error) || '未知错误';
            alert('保存失败: ' + errorMsg);
        }
    };

    const settingsMenuItems = [
        { key: 'general', label: '通用', icon: <SettingOutlined /> },
        { key: 'proxy', label: '网络代理', icon: <GlobalOutlined /> },
        { key: 'git', label: 'Git 同步', icon: <GithubOutlined /> },
    ];

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

            <Modal
                title="设置"
                open={settingsVisible}
                onCancel={() => setSettingsVisible(false)}
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
                            {activeSettingsTab === 'general' && (
                                <div>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        initialValues={{
                                            proxy: {
                                                enabled: false,
                                                httpHost: '',
                                                httpPort: undefined,
                                                httpsHost: '',
                                                httpsPort: undefined,
                                                socks5Host: '',
                                                socks5Port: undefined,
                                            },
                                            ui: {
                                                enableListAnimation: false,
                                            }
                                        }}
                                    >
                                        <Form.Item
                                            name={['ui', 'enableListAnimation']}
                                            valuePropName="checked"
                                            label="动画"
                                            style={{ marginTop: '16px' }}
                                        >
                                            <Switch />
                                        </Form.Item>

                                        <Form.Item
                                            name={['ui', 'theme']}
                                            label="主题"
                                            style={{ marginTop: '16px' }}
                                        >
                                            <Radio.Group style={{ textAlign: 'left' }}>
                                                <Radio value="light" style={{ marginRight: 16, color: theme === 'dark' ? 'var(--text-secondary)' : '#333' }}>浅色</Radio>
                                                <Radio value="dark" style={{ color: theme === 'dark' ? 'var(--text-secondary)' : '#333' }}>深色</Radio>
                                            </Radio.Group>
                                        </Form.Item>

                                        <Divider style={{ marginTop: 24, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                            <Button onClick={() => setSettingsVisible(false)} style={{ background: theme === 'dark' ? '#303030' : undefined, color: theme === 'dark' ? '#e8e8e8' : undefined, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : undefined }}>
                                                取消
                                            </Button>
                                            <Button type="primary" onClick={handleSaveSettings}>
                                                保存
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            )}

                            {activeSettingsTab === 'proxy' && (
                                <div>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        initialValues={{
                                            proxy: {
                                                enabled: false,
                                                httpHost: '',
                                                httpPort: undefined,
                                                httpsHost: '',
                                                httpsPort: undefined,
                                                socks5Host: '',
                                                socks5Port: undefined,
                                            },
                                            ui: {
                                                enableListAnimation: false,
                                            }
                                        }}
                                    >
                                        <Form.Item
                                            name={['proxy', 'enabled']}
                                            valuePropName="checked"
                                            label="启用代理"
                                            style={{ marginTop: '16px' }}
                                        >
                                            <Switch />
                                        </Form.Item>

                                        <Divider style={{ margin: '16px 0', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

                                        <div style={{ marginBottom: 24 }}>
                                            <div style={{ fontWeight: 500, marginBottom: 12, color: theme === 'dark' ? '#e8e8e8' : '#333' }}>代理配置</div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: theme === 'dark' ? '#303030' : '#fafafa' }}>
                                                        <th style={{ textAlign: 'left', padding: '10px 12px', width: 80, fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>协议</th>
                                                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>服务器地址</th>
                                                        <th style={{ textAlign: 'left', padding: '10px 12px', width: 120, fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>端口</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>HTTP</td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['proxy', 'httpHost']} style={{ marginBottom: 0 }}>
                                                                <Input placeholder="不填则不使用" />
                                                            </Form.Item>
                                                        </td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['proxy', 'httpPort']} style={{ marginBottom: 0 }}>
                                                                <InputNumber
                                                                    placeholder="端口"
                                                                    style={{ width: '100%' }}
                                                                    min={1}
                                                                    max={65535}
                                                                    precision={0}
                                                                />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>HTTPS</td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['proxy', 'httpsHost']} style={{ marginBottom: 0 }}>
                                                                <Input placeholder="不填则不使用" />
                                                            </Form.Item>
                                                        </td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['proxy', 'httpsPort']} style={{ marginBottom: 0 }}>
                                                                <InputNumber
                                                                    placeholder="端口"
                                                                    style={{ width: '100%' }}
                                                                    min={1}
                                                                    max={65535}
                                                                    precision={0}
                                                                />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500 }}>SOCKS5</td>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            <Form.Item name={['proxy', 'socks5Host']} style={{ marginBottom: 0 }}>
                                                                <Input placeholder="不填则不使用" />
                                                            </Form.Item>
                                                        </td>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            <Form.Item name={['proxy', 'socks5Port']} style={{ marginBottom: 0 }}>
                                                                <InputNumber
                                                                    placeholder="端口"
                                                                    style={{ width: '100%' }}
                                                                    min={1}
                                                                    max={65535}
                                                                    precision={0}
                                                                />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <Divider style={{ marginTop: 32, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                            <Button onClick={() => setSettingsVisible(false)} style={{ background: theme === 'dark' ? '#303030' : undefined, color: theme === 'dark' ? '#e8e8e8' : undefined, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : undefined }}>
                                                取消
                                            </Button>
                                            <Button type="primary" onClick={handleSaveSettings}>
                                                保存
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            )}

                            {activeSettingsTab === 'git' && (
                                <div>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        initialValues={{
                                            gitSync: {
                                                enabled: false,
                                                remoteUrl: '',
                                                branch: 'main',
                                                password: '',
                                            }
                                        }}
                                    >
                                        <Form.Item
                                            name={['gitSync', 'enabled']}
                                            valuePropName="checked"
                                            label="启用 Git 同步"
                                            style={{ marginTop: '16px' }}
                                        >
                                            <Switch />
                                        </Form.Item>

                                        <Divider style={{ margin: '16px 0', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontWeight: 500, marginBottom: 12, color: theme === 'dark' ? '#e8e8e8' : '#333' }}>仓库配置</div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, width: 80, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>仓库地址</td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['gitSync', 'remoteUrl']} style={{ marginBottom: 0 }}>
                                                                <Input placeholder="https://gitee.com/username/repo.git" />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>分支</td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['gitSync', 'branch']} style={{ marginBottom: 0 }}>
                                                                <Input placeholder="main" />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>Access Token</td>
                                                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                                                            <Form.Item name={['gitSync', 'password']} style={{ marginBottom: 0 }}>
                                                                <Input type="password" placeholder="粘贴你的 Access Token" />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <Divider style={{ marginTop: 32, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                            <Button onClick={() => setSettingsVisible(false)} style={{ background: theme === 'dark' ? '#303030' : undefined, color: theme === 'dark' ? '#e8e8e8' : undefined, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : undefined }}>
                                                取消
                                            </Button>
                                            <Button type="primary" onClick={handleSaveSettings}>
                                                保存
                                            </Button>
                                        </div>
                                    </Form>
                                </div>
                            )}

                            {activeSettingsTab === 'about' && (
                                <div>
                                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <img src="/logo.png" alt="Apiman" style={{ width: '200px', marginBottom: '24px', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }} />
                                        <p style={{ color: theme === 'dark' ? '#a0a0a0' : '#666', margin: '0 0 24px 0', fontSize: 14 }}>API 管理工具</p>
                                        <div style={{ background: theme === 'dark' ? '#303030' : '#f5f5f5', padding: '16px 24px', borderRadius: 8, display: 'inline-block' }}>
                                            <p style={{ color: theme === 'dark' ? '#e8e8e8' : '#333', margin: '0 0 8px 0', fontSize: 14 }}>
                                                <strong>版本</strong>：1.0.0
                                            </p>
                                            <p style={{ color: theme === 'dark' ? '#e8e8e8' : '#333', margin: '0 0 8px 0', fontSize: 14 }}>
                                                <strong>技术栈</strong>：Wails + React + TypeScript
                                            </p>
                                            <p style={{ color: theme === 'dark' ? '#e8e8e8' : '#333', margin: 0, fontSize: 14 }}>
                                                <strong>作者</strong>：shamo
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Col>
                    </Row>
                </div>
            </Modal>
        </>
    );
};
