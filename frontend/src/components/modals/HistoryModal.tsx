import React, { useEffect, useState, useMemo } from 'react';
import { Button, Col, Input, Modal, Row, Select, Table, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, DeleteOutlined, ClockCircleOutlined, PlayCircleOutlined, CopyOutlined, LinkOutlined, FileTextOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ListHistory, GetHistoryEntry, ClearHistory, SearchHistory, DeleteHistory, ExecuteHTTPRequestWithScripts } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { useUIStore } from '../../store';
import { JsonView, allExpanded } from 'react-json-view-lite';
import { buildCurlCommand } from '../../utils/curlUtils';
import 'react-json-view-lite/dist/index.css';
import './modals.css';

interface HistoryEntry {
  id: string;
  source: string;
  source_tool?: string;
  project_name: string;
  request_name: string;
  method: string;
  url: string;
  created_at: string;
  status_code?: number;
  duration?: number;
  spec?: unknown;
  response?: {
    status_code?: number;
    duration?: number;
  };
}

type TimeRange = 'all' | 'today' | 'week' | 'month';

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: '#61affe', POST: '#49cc90', PUT: '#fca130', DELETE: '#f93e3e',
    PATCH: '#50e3c2', OPTIONS: '#0d5aa7', HEAD: '#9012fe',
  };
  return colors[method] || '#666';
};

const getStatusColor = (code?: number) => {
  if (!code) return '#666';
  if (code >= 200 && code < 300) return '#49cc90';
  if (code >= 300 && code < 400) return '#fca130';
  if (code >= 400 && code < 500) return '#f93e3e';
  if (code >= 500) return '#f93e3e';
  return '#666';
};

const getTimeRange = (range: TimeRange): { from: string; to: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return {
        from: today.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        from: weekStart.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: monthStart.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }
    default:
      return { from: '', to: '' };
  }
};

/** 从 HttpRequestSpec 构建 curl 命令 */
const buildCurlFromSpec = (spec: unknown): string => {
  if (!spec) return '';
  const s = spec as {
    method?: string;
    http_url?: string;
    headers?: Array<{ key: string; value: string; enabled?: boolean }>;
    params?: Array<{ key: string; value: string; enabled?: boolean }>;
    body?: string;
    body_type?: string;
    form_data?: Array<{ key: string; value: string; enabled?: boolean }>;
    url_encoded?: Array<{ key: string; value: string; enabled?: boolean }>;
  };
  return buildCurlCommand({
    name: '',
    method: s.method || 'GET',
    url: s.http_url || '',
    headers: (s.headers || []).map(h => ({ key: h.key, value: h.value, enabled: h.enabled ?? true })),
    params: (s.params || []).map(p => ({ key: p.key, value: p.value, enabled: p.enabled ?? true })),
    body: s.body || '',
    bodyType: (s.body_type || 'none') as 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary',
    formData: (s.form_data || []).map(f => ({ key: f.key, value: f.value, enabled: f.enabled ?? true })),
    urlencoded: (s.url_encoded || []).map(u => ({ key: u.key, value: u.value, enabled: u.enabled ?? true })),
    preScripts: [],
    postScripts: [],
  });
};

export const HistoryModal: React.FC = () => {
  const { historyModalVisible, setHistoryModalVisible } = useUIStore();
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [historyDetail, setHistoryDetail] = useState<HistoryEntry | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');

  useEffect(() => {
    if (historyModalVisible) {
      loadHistoryList();
    }
  }, [historyModalVisible]);

  const loadHistoryList = async () => {
    setHistoryLoading(true);
    try {
      const list = await ListHistory(100);
      setHistoryList(list || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const searchHistory = async () => {
    setHistoryLoading(true);
    setSelectedRowKeys([]);
    try {
      const timeRange = getTimeRange(selectedTimeRange);
      const params = new models.HistorySearchParams();
      if (searchKeyword) params.keyword = searchKeyword;
      if (statusFilter) params.status = parseInt(statusFilter, 10) || 0;
      if (methodFilter) params.method = methodFilter.toUpperCase();
      if (timeRange.from) params.from = timeRange.from;
      if (timeRange.to) params.to = timeRange.to;

      const list = await SearchHistory(params, 100);
      setHistoryList(list || []);
    } catch (e) {
      console.error('Failed to search history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setTimeout(() => searchHistory(), 0);
  };

  const clearHistorySearch = () => {
    setSearchKeyword('');
    setStatusFilter('');
    setMethodFilter('');
    setSelectedTimeRange('all');
    setSelectedRowKeys([]);
    loadHistoryList();
  };

  const handleClose = () => {
    setHistoryModalVisible(false);
    setHistoryDetail(null);
    setSelectedRowKeys([]);
  };

  const handleClearAll = async () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      async onOk() {
        await ClearHistory();
        setHistoryList([]);
        setSelectedRowKeys([]);
      },
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条历史记录吗？`,
      async onOk() {
        for (const id of selectedRowKeys) {
          await DeleteHistory(id as string);
        }
        setSelectedRowKeys([]);
        searchHistory();
        message.success(`已删除 ${selectedRowKeys.length} 条记录`);
      },
    });
  };

  const handleRowClick = async (record: HistoryEntry) => {
    setHistoryLoading(true);
    try {
      const detail = await GetHistoryEntry(record.id);
      setHistoryDetail(detail);
    } catch (e) {
      console.error('Failed to load history detail:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 右键菜单处理 - 使用自定义跟随鼠标的菜单
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; record: HistoryEntry | null }>({
    visible: false,
    x: 0,
    y: 0,
    record: null,
  });

  const handleContextMenu = (e: React.MouseEvent, record: HistoryEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, record });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleCopyUrl = async () => {
    const record = contextMenu.record;
    if (!record) return;
    try {
      const detail = await GetHistoryEntry(record.id);
      let url = record.url; // 默认使用原始 URL

      if (detail?.response?.curl_command) {
        // 从 curl_command 中解析最终 URL - URL 在最后，单引号包裹
        const curlCmd = detail.response.curl_command;
        const urlMatch = curlCmd.match(/'((?:https?:\/\/|\$\{)[^']+)'$/m);
        if (urlMatch) {
          url = urlMatch[1];
        }
      } else if (detail?.spec) {
        // 降级：使用 spec 中的 URL
        url = (detail.spec as any).http_url || record.url;
      }

      await navigator.clipboard.writeText(url);
      message.success('URL 已复制');
    } catch (e) {
      message.error('复制失败');
    }
    closeContextMenu();
  };

  const handleCopyCurl = async () => {
    const record = contextMenu.record;
    if (!record) return;
    try {
      const detail = await GetHistoryEntry(record.id);
      if (detail?.response?.curl_command) {
        // 使用后端实际执行的 curl 命令（已替换变量）
        await navigator.clipboard.writeText(detail.response.curl_command);
        message.success('Curl 命令已复制');
      } else if (detail?.spec) {
        // 降级：从前端 spec 构建
        const curl = buildCurlFromSpec(detail.spec);
        await navigator.clipboard.writeText(curl);
        message.success('Curl 命令已复制');
      }
    } catch (e) {
      message.error('复制失败');
    }
    closeContextMenu();
  };

  const handleCopyResponse = async () => {
    const record = contextMenu.record;
    if (!record) return;
    try {
      const detail = await GetHistoryEntry(record.id);
      if (detail?.response) {
        await navigator.clipboard.writeText(JSON.stringify(detail.response, null, 2));
        message.success('响应已复制');
      }
    } catch (e) {
      message.error('复制失败');
    }
    closeContextMenu();
  };

  const handleCopyRequest = async () => {
    const record = contextMenu.record;
    if (!record) return;
    try {
      const detail = await GetHistoryEntry(record.id);
      if (detail?.spec) {
        await navigator.clipboard.writeText(JSON.stringify(detail.spec, null, 2));
        message.success('请求已复制');
      }
    } catch (e) {
      message.error('复制失败');
    }
    closeContextMenu();
  };

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  const handleReExecute = async (record: HistoryEntry) => {
    try {
      const detail = await GetHistoryEntry(record.id);
      if (detail && detail.spec) {
        await ExecuteHTTPRequestWithScripts(
          detail.project_id || '',
          detail.project_name || '',
          detail.request_name || '',
          detail.request_path || '',
          '',  // environmentID - empty for re-execute from history
          detail.spec,
          [],  // preScripts
          []   // postScripts
        );
        message.success('请求已重新发送');
      }
    } catch (e) {
      message.error('重新执行失败');
      console.error('Failed to re-execute:', e);
    }
  };

  const handleBatchReExecute = async () => {
    if (selectedRowKeys.length === 0) return;
    message.loading('正在批量执行...');

    const selectedEntries = historyList.filter(e => selectedRowKeys.includes(e.id));
    let successCount = 0;

    for (const entry of selectedEntries) {
      try {
        const detail = await GetHistoryEntry(entry.id);
        if (detail && detail.spec) {
          await ExecuteHTTPRequestWithScripts(
            detail.project_id || '',
            detail.project_name || '',
            detail.request_name || '',
            detail.request_path || '',
            '',  // environmentID - empty for re-execute from history
            detail.spec,
            [],  // preScripts
            []   // postScripts
          );
          successCount++;
        }
      } catch (e) {
        console.error('Failed to re-execute:', e);
      }
    }

    message.success(`已执行 ${successCount}/${selectedRowKeys.length} 个请求`);
  };

  const avgDuration = useMemo(() => {
    if (historyList.length === 0) return 0;
    const sum = historyList.reduce((acc, e) => acc + (e.duration || 0), 0);
    return Math.round(sum / historyList.length);
  }, [historyList]);

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 140,
      render: (v: string) => v ? new Date(v).toLocaleString() : '',
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 60,
      render: (v: string, record: HistoryEntry) => {
        if (v === 'MCP') {
          return <span style={{ color: '#49cc90', fontSize: 11 }} title={record.source_tool}>{v}</span>;
        }
        return <span style={{ color: '#61affe', fontSize: 11 }}>{v}</span>;
      },
    },
    {
      title: '项目',
      dataIndex: 'project_name',
      width: 100,
      ellipsis: true,
    },
    {
      title: '请求',
      dataIndex: 'request_name',
      width: 120,
      ellipsis: true,
    },
    {
      title: '方法',
      dataIndex: 'method',
      width: 60,
      render: (v: string) => <span style={{ color: getMethodColor(v) }}>{v}</span>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status_code',
      width: 60,
      render: (_: unknown, record: HistoryEntry) => (
        <span style={{ color: getStatusColor(record.response?.status_code) }}>
          {record.response?.status_code || '-'}
        </span>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      width: 70,
      render: (_: unknown, record: HistoryEntry) => (
        record.response?.duration ? `${record.response.duration}ms` : '-'
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: HistoryEntry) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleReExecute(record);
            }}
            title="重新执行"
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这条历史记录吗？',
                onOk: async () => {
                  await DeleteHistory(record.id);
                  searchHistory();
                },
              });
            }}
            title="删除"
          />
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const timeRangeButtons: { key: TimeRange; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
  ];

  return (
    <>
      <Modal
        title="历史记录"
        open={historyModalVisible}
        onCancel={handleClose}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Space>
              <Button size='small' danger onClick={handleClearAll}>清空全部</Button>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button size='small' icon={<ReloadOutlined />} onClick={handleBatchReExecute}>
                    重新执行 ({selectedRowKeys.length})
                  </Button>
                  <Button size='small' danger icon={<DeleteOutlined />} onClick={handleDeleteSelected}>
                    删除 ({selectedRowKeys.length})
                  </Button>
                </>
              )}
            </Space>
            <Space style={{ color: '#888', fontSize: 12 }}>
              <ClockCircleOutlined />
              <span>平均耗时: <strong style={{ color: '#333' }}>{avgDuration}ms</strong></span>
              <span>|</span>
              <span>共 <strong>{historyList.length}</strong> 条</span>
            </Space>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {timeRangeButtons.map((btn) => (
                  <Button
                    key={btn.key}
                    size='small'
                    type={selectedTimeRange === btn.key ? 'primary' : 'default'}
                    onClick={() => handleTimeRangeChange(btn.key)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
              <Select
                size='small'
                placeholder='方法'
                value={methodFilter || undefined}
                onChange={(v) => {
                  setMethodFilter(v || '');
                  setTimeout(() => searchHistory(), 0);
                }}
                style={{ width: 90 }}
                allowClear
              >
                <Select.Option value="GET">GET</Select.Option>
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="PUT">PUT</Select.Option>
                <Select.Option value="DELETE">DELETE</Select.Option>
                <Select.Option value="PATCH">PATCH</Select.Option>
                <Select.Option value="OPTIONS">OPTIONS</Select.Option>
                <Select.Option value="HEAD">HEAD</Select.Option>
              </Select>
              <Select
                size='small'
                placeholder='状态'
                value={statusFilter || undefined}
                onChange={(v) => {
                  setStatusFilter(v || '');
                  setTimeout(() => searchHistory(), 0);
                }}
                style={{ width: 80 }}
                allowClear
              >
                <Select.Option value="200">2xx</Select.Option>
                <Select.Option value="300">3xx</Select.Option>
                <Select.Option value="400">4xx</Select.Option>
                <Select.Option value="500">5xx</Select.Option>
              </Select>
              <Input
                size='small'
                placeholder='搜索项目/请求名/URL'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onPressEnter={searchHistory}
                style={{ width: 200 }}
                allowClear
              />
              <Button size='small' type='primary' onClick={searchHistory} icon={<SearchOutlined />}>搜索</Button>
              <Button size='small' onClick={clearHistorySearch}>重置</Button>
            </div>
          </div>

          <Table
            dataSource={historyList}
            rowKey='id'
            size='small'
            loading={historyLoading}
            rowSelection={rowSelection}
            pagination={{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条` }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              onContextMenu: (e) => handleContextMenu(e, record),
              style: { cursor: 'pointer' },
            })}
            columns={columns}
          />

          {/* 自定义右键菜单 - 跟随鼠标 */}
          {contextMenu.visible && contextMenu.record && (
            <div
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 10000,
                background: 'white',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '4px 0',
                minWidth: 160,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="context-menu-item"
                onClick={() => {
                  handleReExecute(contextMenu.record!);
                  closeContextMenu();
                }}
              >
                <PlayCircleOutlined /> <span>重新执行</span>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={handleCopyUrl}>
                <LinkOutlined /> <span>复制 URL</span>
              </div>
              <div className="context-menu-item" onClick={handleCopyCurl}>
                <CopyOutlined /> <span>复制 Curl</span>
              </div>
              <div className="context-menu-divider" />
              <div
                className="context-menu-item context-menu-item-danger"
                onClick={async () => {
                  await DeleteHistory(contextMenu.record!.id);
                  searchHistory();
                  message.success('已删除');
                  closeContextMenu();
                }}
              >
                <DeleteOutlined /> <span>删除</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={historyDetail ? `${historyDetail.request_name || '请求详情'} - ${historyDetail.method}` : '请求详情'}
        open={!!historyDetail}
        onCancel={() => setHistoryDetail(null)}
        footer={
          historyDetail ? (
            <Space>
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={() => handleReExecute(historyDetail as HistoryEntry)}
              >
                重新执行
              </Button>
              <Button onClick={() => setHistoryDetail(null)}>关闭</Button>
            </Space>
          ) : null
        }
        width={1200}
        destroyOnClose
      >
        {historyDetail && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <strong>{historyDetail.request_name || '未命名请求'}</strong>
              <Tag color={getMethodColor(historyDetail.method)}>{historyDetail.method}</Tag>
              <span style={{ color: '#666' }}>{historyDetail.url}</span>
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <h4>请求信息</h4>
                <div
                  className="json-view-container"
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 500,
                    overflow: 'auto',
                    minHeight: 250,
                  }}
                >
                  <JsonView
                    data={historyDetail.spec || {}}
                    shouldExpandNode={allExpanded}
                    clickToExpandNode
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>响应信息</h4>
                  <Space>
                    <Tag color={getStatusColor(historyDetail.response?.status_code)}>
                      Status: {historyDetail.response?.status_code || 'N/A'}
                    </Tag>
                    <Tag>Duration: {historyDetail.response?.duration || 0}ms</Tag>
                  </Space>
                </div>
                <div
                  className="json-view-container"
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 500,
                    overflow: 'auto',
                    minHeight: 250,
                  }}
                >
                  <JsonView
                    data={historyDetail.response || {}}
                    shouldExpandNode={allExpanded}
                    clickToExpandNode
                  />
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </>
  );
};
