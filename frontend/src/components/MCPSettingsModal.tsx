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
    onStartMCP: (config: MCPConfig) => void;
    onStopMCP: () => void;
    currentStatus: 'stopped' | 'running' | 'error';
}

export const MCPSettingsModal: React.FC<MCPSettingsModalProps> = ({
    visible,
    onClose,
    projects,
    onStartMCP,
    onStopMCP,
    currentStatus,
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
                enabled: true,
                port: values.port,
                project_id: values.project_id,
                api_key: values.api_key,
            };

            onStartMCP(config);
            message.success('MCP Server 已启动');
            onClose();
        } catch (error) {
            console.error('Validation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = () => {
        onStopMCP();
        message.success('MCP Server 已停止');
    };

    const handleCopyUrl = () => {
        const port = form.getFieldValue('port');
        const url = `http://localhost:${port}/mcp/streamable`;
        navigator.clipboard.writeText(url);
        message.success('已复制到剪贴板');
    };

    useEffect(() => {
        if (visible && projects.length > 0 && !form.getFieldValue('project_id')) {
            form.setFieldValue('project_id', projects[0].id);
        }
    }, [visible, projects]);

    return (
        <Modal
            title="MCP Server 设置"
            open={visible}
            onCancel={onClose}
            footer={
                <Space>
                    {currentStatus === 'running' ? (
                        <Button danger onClick={handleStop}>
                            停止服务
                        </Button>
                    ) : (
                        <Button type="primary" onClick={handleSave} loading={loading}>
                            保存并启动
                        </Button>
                    )}
                    <Button onClick={onClose}>取消</Button>
                </Space>
            }
            width={520}
        >
            <Form
                form={form}
                layout="vertical"
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
                    extra="MCP Server 监听的端口"
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
                    <Select style={{ width: 300 }} placeholder="选择项目">
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
                        <span>
                            用于 AI 客户端认证Bearer Token 认证
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
                        style={{ width: 300 }}
                        addonAfter={
                            <Button type="text" size="small" onClick={generateRandomKey}>
                                随机生成
                            </Button>
                        }
                    />
                </Form.Item>

                {currentStatus === 'running' && (
                    <div style={{ color: '#49cc90', marginTop: 16 }}>
                        <ApiOutlined /> MCP Server 运行中
                    </div>
                )}
            </Form>
        </Modal>
    );
};
