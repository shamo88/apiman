import { useCallback, useState } from 'react';
import { message } from 'antd';
import {
  LoadMCPConfig,
  SaveMCPConfig,
  StartMCP,
  StopMCP,
  GetMCPStatus,
  GetMCPRuntimeState,
  BindMCPProject,
  SetMCPEnvironment,
} from '../../wailsjs/go/main/App';
import { useUIStore } from '../store';

interface MCPConfig {
  enabled: boolean;
  port: number;
  project_id: string;
  environment_id: string;
  api_key: string;
}

// Live snapshot of the running MCP server. Populated from the backend's
// GetMCPRuntimeState; project_id / environment_id reflect the *current*
// runtime binding, which may differ from the boot defaults in mcpConfig.
export interface MCPRuntimeState {
  running: boolean;
  boundProjectId: string;
  boundProjectName: string;
  environmentId: string;
  environmentName: string;
  activeClients: number;
  port: number;
}

const EMPTY_RUNTIME: MCPRuntimeState = {
  running: false,
  boundProjectId: '',
  boundProjectName: '',
  environmentId: '',
  environmentName: '',
  activeClients: 0,
  port: 0,
};

export function useMCP() {
  const [mcpConfig, setMCPConfig] = useState<MCPConfig>({
    enabled: false,
    port: 3847,
    project_id: '',
    environment_id: '',
    api_key: '',
  });
  const [runtimeState, setRuntimeState] = useState<MCPRuntimeState>(EMPTY_RUNTIME);

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

  const loadRuntimeState = useCallback(async (): Promise<MCPRuntimeState | null> => {
    try {
      const state = await GetMCPRuntimeState();
      if (state) {
        const normalized: MCPRuntimeState = {
          running: state.running ?? false,
          boundProjectId: state.boundProjectId ?? '',
          boundProjectName: state.boundProjectName ?? '',
          environmentId: state.environmentId ?? '',
          environmentName: state.environmentName ?? '',
          activeClients: state.activeClients ?? 0,
          port: state.port ?? 0,
        };
        setRuntimeState(normalized);
        return normalized;
      }
    } catch (error) {
      console.error('Failed to load MCP runtime state:', error);
    }
    return null;
  }, []);

  // Runtime project switching. Empty id unbinds.
  const bindProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      await BindMCPProject(projectId);
      await loadRuntimeState();
      message.success('项目已切换');
      return true;
    } catch (error: any) {
      message.error(`切换项目失败: ${error?.message || error}`);
      return false;
    }
  }, [loadRuntimeState]);

  // Runtime environment switching. Empty id deactivates.
  const setEnvironment = useCallback(async (envId: string): Promise<boolean> => {
    try {
      await SetMCPEnvironment(envId);
      await loadRuntimeState();
      message.success(envId ? '环境已切换' : '已取消环境');
      return true;
    } catch (error: any) {
      message.error(`切换环境失败: ${error?.message || error}`);
      return false;
    }
  }, [loadRuntimeState]);

  return {
    mcpConfig,
    mcpStatus,
    runtimeState,
    loadMCPConfig,
    saveMCPConfig,
    startMCP,
    stopMCP,
    loadMCPStatus,
    loadRuntimeState,
    bindProject,
    setEnvironment,
  };
}
