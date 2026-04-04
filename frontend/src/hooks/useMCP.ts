import { useState, useCallback } from 'react';
import { LoadMCPConfig, SaveMCPConfig, StartMCP, StopMCP, GetMCPStatus, LoadEnvironments } from '../../wailsjs/go/main/App';
import type { Environment } from '../types';

export interface UseMCPState {
    mcpConfig: any | null;
    mcpStatus: 'stopped' | 'running' | 'error';
    mcpEnvironments: Environment[];
    mcpLoading: boolean;
}

export interface UseMCPActions {
    loadMCPConfig: () => Promise<void>;
    saveAndApplyMCPConfig: (config: any) => Promise<void>;
    loadMCPEnvironments: (projectId: string) => Promise<void>;
    checkMCPStatus: () => Promise<void>;
    startMCP: () => Promise<void>;
    stopMCP: () => Promise<void>;
}

export type UseMCP = UseMCPState & UseMCPActions;

export const useMCP = (): UseMCP => {
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

    const saveAndApplyMCPConfig = useCallback(async (config: any) => {
        setMcpLoading(true);
        try {
            // Save config first
            await SaveMCPConfig(config);
            setMcpConfig(config);

            // Then start or stop based on enabled flag
            if (config.enabled) {
                await StartMCP();
                setMcpStatus('running');
            } else {
                await StopMCP();
                setMcpStatus('stopped');
            }
        } catch (e) {
            console.error('Failed to save MCP config:', e);
            setMcpStatus('error');
            throw e;
        } finally {
            setMcpLoading(false);
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

    return {
        mcpConfig,
        mcpStatus,
        mcpEnvironments,
        mcpLoading,
        loadMCPConfig,
        saveAndApplyMCPConfig,
        loadMCPEnvironments,
        checkMCPStatus,
        startMCP,
        stopMCP,
    };
};
