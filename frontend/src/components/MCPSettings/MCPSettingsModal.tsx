import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Switch, Button, Space, message } from 'antd';
import { ApiOutlined, CopyOutlined } from '@ant-design/icons';
import { useUIStore } from '../../store';
import { useMCP } from '../../hooks';

export interface MCPConfig {
    enabled: boolean;
    port: number;
    project_id: string;
    environment_id: string;
    api_key: string;
}

export interface Project {
    id: string;
    name: string;
}

export interface Environment {
    id: string;
    name: string;
}

export const MCPSettingsModal: React.FC = () => {
    const uiStore = useUIStore();
    const { mcpConfig, mcpStatus, saveMCPConfig, loadMCPConfig } = useMCP();

    const visible = uiStore.mcpModalVisible;

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 弹窗打开时加载 MCP 配置
    useEffect(() => {
        if (visible) {
            loadMCPConfig();
        }
    }, [visible, loadMCPConfig]);

    const generateRandomKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'mcp_sk_';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        form.setFieldValue('api_key', result);
    };

    const generateRandomPort = () => {
        const port = Math.floor(Math.random() * 10000) + 10000;
        form.setFieldValue('port', port);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            setLoading(true);

            // project_id / environment_id are no longer required here.
            // They are the *initial* binding only; runtime switching is done
            // by MCP tools / the runtime status component.
            const config: MCPConfig = {
                enabled: values.enabled,
                port: values.port,
                project_id: values.project_id || '',
                environment_id: '',
                api_key: values.api_key,
            };

            await saveMCPConfig(config);
            message.success('配置已保存');
            uiStore.setMcpModalVisible(false);
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

    const handleCopyAuth = () => {
        const apiKey = form.getFieldValue('api_key');
        if (!apiKey) {
            message.error('请先生成 API 密钥');
            return;
        }
        const authHeader = `Authorization: Bearer ${apiKey}`;
        navigator.clipboard.writeText(authHeader);
        message.success('已复制认证头到剪贴板');
    };

    useEffect(() => {
        if (visible && mcpConfig) {
            form.setFieldsValue({
                enabled: mcpConfig.enabled ?? false,
                port: mcpConfig.port ?? 3847,
                api_key: mcpConfig.api_key || '',
            });
        }
    }, [visible, mcpConfig, form]);

    const handleClose = () => {
        uiStore.setMcpModalVisible(false);
    };

    return (
        <Modal
            title="MCP Server 设置"
            open={visible}
            onCancel={handleClose}
            footer={
                <Space>
                    <Button type="primary" onClick={handleSave} loading={loading}>
                        保存
                    </Button>
                    <Button onClick={handleClose}>取消</Button>
                </Space>
            }
            width={520}
            className="mcp-modal"
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

                <Form.Item name="port" label="端口">
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
                    name="api_key"
                    label="API 密钥"
                    extra={
                        <span className="mcp-extra">
                            <Button
                                type="link"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleCopyUrl}
                                style={{ padding: 0 }}
                            >
                                复制连接地址
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleCopyAuth}
                                style={{ padding: 0, marginLeft: 12 }}
                            >
                                复制认证头
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

                {mcpStatus === 'running' && (
                    <div className="mcp-status-running">
                        <ApiOutlined /> MCP Server 运行中
                    </div>
                )}
            </Form>
        </Modal>
    );
};
