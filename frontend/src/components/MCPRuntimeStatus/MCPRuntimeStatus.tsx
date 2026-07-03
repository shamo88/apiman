import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Popover, Select, Space, Tag, Tooltip } from 'antd';
import { ApiOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMCP } from '../../hooks';
import { useProjectStore } from '../../store';
import { LoadEnvironments } from '../../../wailsjs/go/main/App';

const POPOVER_REFRESH_INTERVAL_MS = 5000;

/**
 * Live MCP server status pill. Renders a colored badge + popover that
 * lets the user (a) see the current binding and (b) switch project / environment
 * at runtime — the same operations exposed as MCP tools `mcp_bind_project`
 * and `mcp_set_active_environment`.
 */
export const MCPRuntimeStatus: React.FC = () => {
  const {
    mcpStatus,
    runtimeState,
    loadRuntimeState,
    bindProject,
    setEnvironment,
  } = useMCP();
  const projects = useProjectStore((s) => s.projects);

  const [envLoading, setEnvLoading] = useState(false);
  const [envOptions, setEnvOptions] = useState<Array<{ id: string; name: string; mark: string; disabled: boolean }>>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Track the most recent request so out-of-order responses don't
  // overwrite newer data. Counter beats a single boolean for cases where
  // multiple fetches are in flight concurrently (open + project-change).
  const envFetchTokenRef = useRef(0);

  // Fetch environments for the currently-bound project. Exposed via the
  // returned [loadEnvironments] so the popover-open handler can re-trigger
  // it on demand — the user may have edited marks in another window/panel.
  const loadEnvironments = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        setEnvOptions([]);
        return;
      }
      const token = ++envFetchTokenRef.current;
      setEnvLoading(true);
      try {
        const envs: any[] = await LoadEnvironments(projectId);
        if (token !== envFetchTokenRef.current) return;
        setEnvOptions(
          (envs || []).map((e) => {
            const mark: string = (e.mark ?? '').trim();
            const accessible = mark === 'dev' || mark === 'test';
            return {
              id: e.id,
              name: e.name,
              mark,
              disabled: !accessible,
            };
          })
        );
      } catch (err) {
        console.error('Failed to load environments for MCP runtime status:', err);
      } finally {
        if (token === envFetchTokenRef.current) setEnvLoading(false);
      }
    },
    []
  );

  // Refresh both runtime state and environments in parallel. Used by
  // the popover-open handler and the explicit "刷新" button.
  const refreshAll = useCallback(async () => {
    // Force the latest runtime state so bound project / environment IDs
    // are fresh — the env list is only meaningful for the current project.
    const state = await loadRuntimeState();
    const projectId = state?.boundProjectId ?? runtimeState.boundProjectId;
    await loadEnvironments(projectId);
  }, [loadRuntimeState, loadEnvironments, runtimeState.boundProjectId]);

  // Poll runtime state while the popover is mounted so multiple windows /
  // external tools changing the binding show up without a manual refresh.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await loadRuntimeState();
    };
    void tick();
    const id = window.setInterval(tick, POPOVER_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [loadRuntimeState]);

  // Whenever the bound project changes (via polling, runtime switch, or
  // initial load), reload the environment list for that project.
  useEffect(() => {
    void loadEnvironments(runtimeState.boundProjectId);
  }, [runtimeState.boundProjectId, loadEnvironments]);

  // Popover open → force a fresh fetch. The 5s polling timer keeps things
  // roughly current, but a user can sit on the page with the popover
  // closed for arbitrarily long and edit environments elsewhere; the
  // next open should never show stale data.
  const handlePopoverOpenChange = useCallback(
    (nextOpen: boolean) => {
      setPopoverOpen(nextOpen);
      if (nextOpen) {
        void refreshAll();
      }
    },
    [refreshAll]
  );

  const handleBindProject = useCallback(
    async (projectId: string | undefined) => {
      await bindProject(projectId ?? '');
    },
    [bindProject]
  );

  const handleSetEnvironment = useCallback(
    async (envId: string | undefined) => {
      await setEnvironment(envId ?? '');
    },
    [setEnvironment]
  );

  const handleRefresh = useCallback(() => {
    void refreshAll();
  }, [refreshAll]);

  const running = mcpStatus === 'running' && runtimeState.running;

  const projectLabel = runtimeState.boundProjectName
    || projects.find((p) => p.id === runtimeState.boundProjectId)?.name
    || runtimeState.boundProjectId
    || '';
  const envLabel = runtimeState.environmentName
    || runtimeState.environmentId
    || '无活动环境';

  const badgeStatus = running ? 'success' : 'default';
  const badgeText = running ? 'MCP 运行中' : 'MCP 已停止';

  const content = running ? (
    <div style={{ width: 320 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginBottom: 4 }}>
            绑定项目
          </div>
          <Select
            value={runtimeState.boundProjectId || undefined}
            placeholder="选择项目"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            onChange={handleBindProject}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginBottom: 4 }}>
            活动环境
          </div>
          <Select
            value={runtimeState.environmentId || undefined}
            placeholder={runtimeState.boundProjectId ? '选择环境' : '先绑定项目'}
            allowClear
            loading={envLoading}
            disabled={!runtimeState.boundProjectId}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            onChange={handleSetEnvironment}
            options={envOptions.map((e) => {
              // MCP only allows dev / test-marked environments to be
              // activated. Non-accessible ones (pre / prod / unmarked)
              // stay visible in the list so the user understands what's
              // in their project, but render disabled with a clear reason.
              const markDisplay = !e.mark ? '未标记' : e.mark;
              const label = e.disabled
                ? `${e.name}（${markDisplay}，MCP 不可选）`
                : `${e.name}（${markDisplay}）`;
              return { value: e.id, label, disabled: e.disabled };
            })}
          />
        </div>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>
            活跃客户端：{runtimeState.activeClients}
          </span>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </Space>
    </div>
  ) : (
    <div style={{ width: 240, fontSize: 12, color: 'var(--text-secondary, #888)' }}>
      MCP 服务未运行。请在设置面板启动后再切换项目 / 环境。
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={popoverOpen}
      onOpenChange={handlePopoverOpenChange}
    >
      <Tooltip>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '0 8px',
            height: 32,
            borderRadius: 4,
          }}
        >
          <Badge status={badgeStatus} />
          <ApiOutlined style={{ fontSize: 14 }} />
          <span style={{ fontSize: 12 }}>{badgeText}</span>
          {running && (
            <Tag
              color={runtimeState.boundProjectId ? 'blue' : 'default'}
              style={{ margin: 0, fontSize: 11 }}
            >
              {projectLabel}
            </Tag>
          )}
          {running && runtimeState.environmentId && (
            <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
              {envLabel}
            </Tag>
          )}
        </span>
      </Tooltip>
    </Popover>
  );
};