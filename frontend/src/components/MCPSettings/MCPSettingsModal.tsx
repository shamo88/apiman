import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button, Space, message } from 'antd';
import { ApiOutlined, CopyOutlined } from '@ant-design/icons';
import { useProjectStore, useUIStore } from '../../store';
import { useMCP, useEnvironments } from '../../hooks';

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
    const projectStore = useProjectStore();
    const uiStore = useUIStore();
    const { mcpConfig, mcpStatus, saveMCPConfig, loadMCPConfig } = useMCP();
    const { environments, loadEnvironments } = useEnvironments();

    const visible = uiStore.mcpModalVisible;

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const projects = projectStore.projects;

    // 弹窗打开时加载 MCP 配置
    useEffect(() => {
        if (visible) {
            loadMCPConfig();
        }
    }, [visible]);

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

            if (values.enabled) {
                if (!values.project_id) {
                    message.error('启用 MCP 服务时，请选择项目');
                    return;
                }
                if (!values.environment_id) {
                    message.error('启用 MCP 服务时，请选择环境');
                    return;
                }
            }

            setLoading(true);

            const config: MCPConfig = {
                enabled: values.enabled,
                port: values.port,
                project_id: values.project_id,
                environment_id: values.environment_id,
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
                project_id: mcpConfig.project_id || (projects.length > 0 ? projects[0].id : ''),
                environment_id: mcpConfig.environment_id || '',
                api_key: mcpConfig.api_key || '',
            });
            if (mcpConfig.project_id) {
                loadEnvironments(mcpConfig.project_id);
            }
        }
    }, [visible, mcpConfig, projects]);

    const handleProjectChange = (projectId: string) => {
        form.setFieldValue('environment_id', '');
        loadEnvironments(projectId);
    };

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
                    name="project_id"
                    label="绑定项目"
                    extra="MCP 将绑定到该项目，提供 API 和脚本管理"
                >
                    <Select style={{ width: '100%' }} placeholder="选择项目" onChange={handleProjectChange}>
                        {projects.map((p) => (
                            <Select.Option key={p.id} value={p.id}>
                                {p.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="environment_id"
                    label="环境"
                    extra="选择要使用的环境变量集合"
                >
                    <Select style={{ width: '100%' }} placeholder="选择环境" allowClear>
                        {environments.map((env) => (
                            <Select.Option key={env.id} value={env.id}>
                                {env.name}
                            </Select.Option>
                        ))}
                    </Select>
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
