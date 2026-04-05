import React from 'react';
import { Button, Select } from 'antd';
import { SafetyOutlined, ApiOutlined, FileTextOutlined } from '@ant-design/icons';
import { useProjectContext } from '../../contexts/ProjectContext';

interface AppFooterProps {
    mcpStatus: 'stopped' | 'running' | 'error';
    onOpenCookie: () => void;
    onOpenMCP: () => void;
    onOpenHistory: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
    mcpStatus,
    onOpenCookie,
    onOpenMCP,
    onOpenHistory,
}) => {
    const { environment } = useProjectContext();
    const { environments, selectedEnvironmentId, setSelectedEnvironmentId } = environment;

    return (
        <div className="app-footer">
            <Button
                icon={<SafetyOutlined />}
                onClick={onOpenCookie}
            >
                Cookie
            </Button>
            <Button
                icon={<ApiOutlined />}
                className={`mcp-status ${mcpStatus}`}
                onClick={onOpenMCP}
            >
                {mcpStatus === 'running' ? 'MCP 运行中' : 'MCP'}
            </Button>
            <Button
                icon={<FileTextOutlined />}
                onClick={onOpenHistory}
            >
                Log
            </Button>
            {environments.length > 0 && (
                <div className="app-footer-env-selector">
                    <span className="app-footer-env-label">环境</span>
                    <Select
                        value={selectedEnvironmentId || undefined}
                        onChange={setSelectedEnvironmentId}
                        options={[
                            { label: '无环境', value: '' },
                            ...environments.map(env => ({ label: env.name, value: env.id })),
                        ]}
                        style={{ width: 100 }}
                        placeholder="选择环境"
                    />
                </div>
            )}
        </div>
    );
};
