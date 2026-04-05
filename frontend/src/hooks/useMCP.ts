import { useCallback, useState } from 'react';
import { message } from 'antd';
import {
  LoadMCPConfig,
  SaveMCPConfig,
  StartMCP,
  StopMCP,
  GetMCPStatus,
} from '../../wailsjs/go/main/App';

interface MCPConfig {
  enabled: boolean;
  port: number;
  project_id: string;
  environment_id: string;
  api_key: string;
}

export function useMCP() {
  const [mcpConfig, setMCPConfig] = useState<MCPConfig>({
    enabled: false,
    port: 3847,
    project_id: '',
    environment_id: '',
    api_key: '',
  });
  const [mcpStatus, setMCPStatus] = useState<'stopped' | 'running' | 'error'>('stopped');

  const loadMCPConfig = useCallback(async () => {
    try {
      const config = await LoadMCPConfig();
      if (config) {
        setMCPConfig(config);
      }
    } catch (error) {
      console.error('Failed to load MCP config:', error);
    }
  }, []);

  const saveMCPConfig = useCallback(async (config: MCPConfig) => {
    try {
      await SaveMCPConfig(config);
      setMCPConfig(config);
      message.success('MCP 配置已保存');
    } catch (error: any) {
      message.error(`保存失败: ${error?.message || error}`);
      throw error;
    }
  }, []);

  const startMCP = useCallback(async () => {
    try {
      await StartMCP();
      setMCPStatus('running');
      message.success('MCP Server 已启动');
    } catch (error: any) {
      setMCPStatus('error');
      message.error(`启动失败: ${error?.message || error}`);
      throw error;
    }
  }, []);

  const stopMCP = useCallback(async () => {
    try {
      await StopMCP();
      setMCPStatus('stopped');
      message.success('MCP Server 已停止');
    } catch (error: any) {
      message.error(`停止失败: ${error?.message || error}`);
      throw error;
    }
  }, []);

  const loadMCPStatus = useCallback(async () => {
    try {
      const status = await GetMCPStatus();
      setMCPStatus(status as 'stopped' | 'running' | 'error');
    } catch (error) {
      console.error('Failed to get MCP status:', error);
    }
  }, []);

  return {
    mcpConfig,
    mcpStatus,
    loadMCPConfig,
    saveMCPConfig,
    startMCP,
    stopMCP,
    loadMCPStatus,
  };
}
