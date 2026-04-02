import React from 'react';
import { Button } from 'antd';
import { SafetyOutlined, ApiOutlined, FileTextOutlined } from '@ant-design/icons';

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
        </div>
    );
};
