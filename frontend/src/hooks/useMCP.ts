import { useCallback, useState } from 'react';
import { message } from 'antd';
import {
  LoadMCPConfig,
  SaveMCPConfig,
  StartMCP,
  StopMCP,
  GetMCPStatus,
} from '../../wailsjs/go/main/App';
import { useUIStore } from '../store';

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
  // 使用 UIStore 共享状态
  const mcpStatus = useUIStore((state) => state.mcpStatus);
  const setMcpStatus = useUIStore((state) => state.setMcpStatus);

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

      // 根据 enabled 标志启动或停止 MCP 服务
      if (config.enabled) {
        await StartMCP();
        setMcpStatus('running');
      } else {
        await StopMCP();
        setMcpStatus('stopped');
      }

      message.success('MCP 配置已保存');
    } catch (error: any) {
      message.error(`保存失败: ${error?.message || error}`);
      throw error;
    }
  }, [setMcpStatus]);

  const startMCP = useCallback(async () => {
    try {
      await StartMCP();
      setMcpStatus('running');
      message.success('MCP Server 已启动');
    } catch (error: any) {
      setMcpStatus('error');
      message.error(`启动失败: ${error?.message || error}`);
      throw error;
    }
  }, [setMcpStatus]);

  const stopMCP = useCallback(async () => {
    try {
      await StopMCP();
      setMcpStatus('stopped');
      message.success('MCP Server 已停止');
    } catch (error: any) {
      message.error(`停止失败: ${error?.message || error}`);
      throw error;
    }
  }, [setMcpStatus]);

  const loadMCPStatus = useCallback(async () => {
    try {
      const status = await GetMCPStatus();
      setMcpStatus(status as 'stopped' | 'running' | 'error');
    } catch (error) {
      console.error('Failed to get MCP status:', error);
    }
  }, [setMcpStatus]);

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
