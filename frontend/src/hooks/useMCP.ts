import { useState, useCallback } from 'react';
import { LoadMCPConfig, SaveMCPConfig, StartMCP, StopMCP, GetMCPStatus, LoadEnvironments } from '../../wailsjs/go/main/App';
import type { Environment } from '../types';

interface UseMCPReturn {
    mcpConfig: any | null;
    mcpStatus: 'stopped' | 'running' | 'error';
    mcpEnvironments: Environment[];
    mcpLoading: boolean;
    setMcpConfig: React.Dispatch<React.SetStateAction<any | null>>;
    setMcpStatus: React.Dispatch<React.SetStateAction<'stopped' | 'running' | 'error'>>;
    setMcpEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
    loadMCPConfig: () => Promise<void>;
    saveMCPConfig: (config: any) => Promise<void>;
    startMCP: () => Promise<void>;
    stopMCP: () => Promise<void>;
    checkMCPStatus: () => Promise<void>;
    loadMCPEnvironments: (projectId: string) => Promise<void>;
}

export const useMCP = (): UseMCPReturn => {
    const [mcpConfig, setMcpConfig] = useState<any | null>(null);
    const [mcpStatus, setMcpStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
    const [mcpEnvironments, setMcpEnvironments] = useState<Environment[]>([]);
    const [mcpLoading, setMcpLoading] = useState(false);

    const loadMCPConfig = useCallback(async () => {
        try {
            const config = await LoadMCPConfig();
            if (config) {
                setMcpConfig({
                    enabled: config.enabled || false,
                    port: config.port || 3847,
                    project_id: config.project_id || '',
                    environment_id: config.environment_id || '',
                    api_key: config.api_key || '',
                });
            }
        } catch (e) {
            console.error('Failed to load MCP config:', e);
        }
    }, []);

    const saveMCPConfig = useCallback(async (config: any) => {
        setMcpLoading(true);
        try {
            await SaveMCPConfig(config);
            setMcpConfig(config);
        } catch (e) {
            console.error('Failed to save MCP config:', e);
            throw e;
        } finally {
            setMcpLoading(false);
        }
    }, []);

    const startMCP = useCallback(async () => {
        setMcpLoading(true);
        try {
            await StartMCP();
            setMcpStatus('running');
        } catch (e) {
            console.error('Failed to start MCP:', e);
            setMcpStatus('error');
            throw e;
        } finally {
            setMcpLoading(false);
        }
    }, []);

    const stopMCP = useCallback(async () => {
        setMcpLoading(true);
        try {
            await StopMCP();
            setMcpStatus('stopped');
        } catch (e) {
            console.error('Failed to stop MCP:', e);
            throw e;
        } finally {
            setMcpLoading(false);
        }
    }, []);

    const checkMCPStatus = useCallback(async () => {
        try {
            const status = await GetMCPStatus();
            if (status === 'running') {
                setMcpStatus('running');
            } else if (status === 'error') {
                setMcpStatus('error');
            } else {
                setMcpStatus('stopped');
            }
        } catch (e) {
            console.error('Failed to get MCP status:', e);
            setMcpStatus('stopped');
        }
    }, []);

    const loadMCPEnvironments = useCallback(async (projectId: string) => {
        try {
            const envs = await LoadEnvironments(projectId);
            setMcpEnvironments(envs || []);
        } catch (e) {
            console.error('Failed to load MCP environments:', e);
            setMcpEnvironments([]);
        }
    }, []);

    return {
        mcpConfig,
        mcpStatus,
        mcpEnvironments,
        mcpLoading,
        setMcpConfig,
        setMcpStatus,
        setMcpEnvironments,
        loadMCPConfig,
        saveMCPConfig,
        startMCP,
        stopMCP,
        checkMCPStatus,
        loadMCPEnvironments,
    };
};
