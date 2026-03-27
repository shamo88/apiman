import React from 'react';
import { Tabs, Modal, Form, Input, InputNumber, Button, Switch, Divider, Row, Col } from 'antd';
import { MinusOutlined, CloseOutlined, AppstoreOutlined, SettingOutlined, InfoCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';
import { LoadAppConfig, SaveAppConfig } from '../../wailsjs/go/main/App';
import { config as wailsConfig } from '../../wailsjs/go/models';

interface TitleBarProps {
    title?: string;
    activeTab?: string;
    onTabChange?: (key: string) => void;
    onTabEdit?: (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => void;
    tabItems?: any[];
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
    tabItems
}) => {
    const [settingsVisible, setSettingsVisible] = React.useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('proxy');
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
                }
            });
            setSettingsVisible(true);
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    };

    const handleSaveSettings = async () => {
        try {
            const values = await form.validateFields();
            const configToSave = new wailsConfig.AppConfig({
                proxy: {
                    enabled: Boolean(values?.proxy?.enabled),
                    httpHost: values?.proxy?.httpHost || '',
                    httpPort: parsePort(values?.proxy?.httpPort),
                    httpsHost: values?.proxy?.httpsHost || '',
                    httpsPort: parsePort(values?.proxy?.httpsPort),
                    socks5Host: values?.proxy?.socks5Host || '',
                    socks5Port: parsePort(values?.proxy?.socks5Port),
                }
            });

            await SaveAppConfig(configToSave);
            console.log('Config saved successfully');
            setSettingsVisible(false);
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('保存失败: ' + (error as Error).message);
        }
    };

    const settingsMenuItems = [
        { key: 'proxy', label: '网络代理', icon: <GlobalOutlined /> },
    ];

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
                        <Tabs
                            activeKey={activeTab}
                            onChange={onTabChange}
                            type="editable-card"
                            hideAdd
                            onEdit={onTabEdit}
                            items={tabItems}
                            size="small"
                            className="title-bar-tabs"
                        />
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
                className="settings-modal"
            >
                <Row gutter={0} style={{ minHeight: 400 }}>
                    <Col span={6} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
                        {settingsMenuItems.map(item => (
                            <div
                                key={item.key}
                                onClick={() => setActiveSettingsTab(item.key)}
                                style={{
                                    padding: '10px 12px',
                                    marginBottom: 4,
                                    cursor: 'pointer',
                                    borderRadius: 6,
                                    background: activeSettingsTab === item.key ? '#e6f7ff' : 'transparent',
                                    color: activeSettingsTab === item.key ? '#1890ff' : '#333',
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
                                color: activeSettingsTab === 'about' ? '#1890ff' : '#333',
                                background: activeSettingsTab === 'about' ? '#e6f7ff' : 'transparent',
                            }}
                        >
                            <InfoCircleOutlined />
                            <span>关于</span>
                        </div>
                    </Col>

                    <Col span={18} style={{ paddingLeft: 24 }}>
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

                                    <Divider style={{ margin: '16px 0' }} />

                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontWeight: 500, marginBottom: 12, color: '#333' }}>代理配置</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#fafafa' }}>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', width: 80, fontWeight: 500, color: '#333', borderBottom: '1px solid #f0f0f0' }}>协议</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 500, color: '#333', borderBottom: '1px solid #f0f0f0' }}>服务器地址</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', width: 120, fontWeight: 500, color: '#333', borderBottom: '1px solid #f0f0f0' }}>端口</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>HTTP</td>
                                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                                        <Form.Item name={['proxy', 'httpHost']} style={{ marginBottom: 0 }}>
                                                            <Input placeholder="不填则不使用" />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
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
                                                    <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>HTTPS</td>
                                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                                                        <Form.Item name={['proxy', 'httpsHost']} style={{ marginBottom: 0 }}>
                                                            <Input placeholder="不填则不使用" />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
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
                                                    <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500 }}>SOCKS5</td>
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

                                    <Divider style={{ marginTop: 32 }} />

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                        <Button onClick={() => setSettingsVisible(false)}>
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
                                    <img src="/logo.png" alt="Apiman" style={{ width: '200px', marginBottom: '24px' }} />
                                    <p style={{ color: '#666', margin: '0 0 24px 0', fontSize: 14 }}>API 管理工具</p>
                                    <div style={{ background: '#f5f5f5', padding: '16px 24px', borderRadius: 8, display: 'inline-block' }}>
                                        <p style={{ color: '#333', margin: '0 0 8px 0', fontSize: 14 }}>
                                            <strong>版本</strong>：1.0.0
                                        </p>
                                        <p style={{ color: '#333', margin: '0 0 8px 0', fontSize: 14 }}>
                                            <strong>技术栈</strong>：Wails + React + TypeScript
                                        </p>
                                        <p style={{ color: '#333', margin: 0, fontSize: 14 }}>
                                            <strong>作者</strong>：zetaoxie
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Col>
                </Row>
            </Modal>
        </>
    );
};
