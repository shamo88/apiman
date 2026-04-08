import React from 'react';
import { Button } from 'antd';
import { SafetyOutlined, ApiOutlined, FileTextOutlined } from '@ant-design/icons';
import { useUIStore } from '../../store';
import './AppFooter.css';

export const AppFooter: React.FC = () => {
  const uiStore = useUIStore();
  const mcpStatus = useUIStore((state) => state.mcpStatus);

  const handleCookieClick = () => {
    uiStore.setCookieModalVisible(true);
  };

  const handleMCPClick = () => {
    uiStore.setMcpModalVisible(true);
  };

  const handleLogClick = () => {
    uiStore.setHistoryModalVisible(true);
  };

  return (
    <div className="app-footer">
      <Button icon={<SafetyOutlined />} onClick={handleCookieClick}>
        Cookie
      </Button>
      <Button
        icon={<ApiOutlined />}
        className={`mcp-status ${mcpStatus}`}
        onClick={handleMCPClick}
      >
        {mcpStatus === 'running' ? 'MCP 运行中' : 'MCP'}
      </Button>
      <Button icon={<FileTextOutlined />} onClick={handleLogClick}>
        Log
      </Button>
    </div>
  );
};
