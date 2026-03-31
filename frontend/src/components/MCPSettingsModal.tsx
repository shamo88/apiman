import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button, Space, message } from 'antd';
import { ApiOutlined, CopyOutlined } from '@ant-design/icons';

interface MCPConfig {
    enabled: boolean;
    port: number;
    project_id: string;
    api_key: string;
}

interface Project {
    id: string;
    name: string;
}

interface MCPSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    projects: Project[];
    mcpConfig: MCPConfig;
    onSave: (config: MCPConfig) => Promise<void>;
    currentStatus: 'stopped' | 'running' | 'error';
    appTheme?: string;
}

export const MCPSettingsModal: React.FC<MCPSettingsModalProps> = ({
    visible,
    onClose,
    projects,
    mcpConfig,
    onSave,
    currentStatus,
    appTheme = 'light',
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const generateRandomKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'mcp_sk_';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        form.setFieldValue('api_key', result);
    };

    const generateRandomPort = () => {
        const port = Math.floor(Math.random() * 10000) + 10000; // 10000-19999
        form.setFieldValue('port', port);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const config: MCPConfig = {
                enabled: values.enabled,
                port: values.port,
                project_id: values.project_id,
                api_key: values.api_key,
            };

            await onSave(config);
            message.success('配置已保存');
            onClose();
        } catch (error) {
            console.error('Validation failed:', error);
            message.error('保存失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyUrl = () => {
        const port = form.getFieldValue('port');
        const url = `http://localhost:${port}/mcp/streamable`;
        navigator.clipboard.writeText(url);
        message.success('已复制到剪贴板');
    };

    useEffect(() => {
        if (visible && mcpConfig) {
            form.setFieldsValue({
                enabled: mcpConfig.enabled ?? false,
                port: mcpConfig.port ?? 3847,
                project_id: mcpConfig.project_id || (projects.length > 0 ? projects[0].id : ''),
                api_key: mcpConfig.api_key || '',
            });
        }
    }, [visible, mcpConfig, projects]);

    return (
        <Modal
            title="MCP Server 设置"
            open={visible}
            onCancel={onClose}
            footer={
                <Space>
                    <Button type="primary" onClick={handleSave} loading={loading}>
                        保存
                    </Button>
                    <Button onClick={onClose}>取消</Button>
                </Space>
            }
            width={520}
            className={`mcp-modal theme-${appTheme}`}
        >
            <Form
                form={form}
                layout="vertical"
                className="mcp-form"
                initialValues={{
                    enabled: false,
                    port: 3847,
                    api_key: '',
                }}
            >
                <Form.Item
                    name="enabled"
                    label="启用 MCP 服务"
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>

                <Form.Item
                    name="port"
                    label="端口"
                >
                    <Input
                        type="number"
                        style={{ width: 200 }}
                        addonAfter={
                            <Button type="text" size="small" onClick={generateRandomPort}>
                                随机
                            </Button>
                        }
                    />
                </Form.Item>

                <Form.Item
                    name="project_id"
                    label="绑定项目"
                    extra="MCP 将绑定到该项目，提供 API 和脚本管理"
                >
                    <Select style={{ width: '100%' }} placeholder="选择项目">
                        {projects.map((p) => (
                            <Select.Option key={p.id} value={p.id}>
                                {p.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="api_key"
                    label="API 密钥"
                    extra={
                        <span className="mcp-extra">
                            AI 客户端认证 Bearer Token
                            <Button
                                type="link"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleCopyUrl}
                                style={{ padding: 0, marginLeft: 8 }}
                            >
                                复制连接地址
                            </Button>
                        </span>
                    }
                >
                    <Input.Password
                        style={{ width: '100%' }}
                        addonAfter={
                            <Button type="text" size="small" onClick={generateRandomKey}>
                                随机生成
                            </Button>
                        }
                    />
                </Form.Item>

                {currentStatus === 'running' && (
                    <div className="mcp-status-running">
                        <ApiOutlined /> MCP Server 运行中
                    </div>
                )}
            </Form>
        </Modal>
    );
};
