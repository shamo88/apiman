import React, { useEffect, useState } from 'react';
import { Button, Col, Input, Modal, Row, Select, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ListHistory, GetHistoryEntry, ClearHistory, SearchHistory } from '../../../wailsjs/go/main/App';
import { useUIStore } from '../../store';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
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
  spec?: any;
  response?: {
    status_code?: number;
    duration?: number;
  };
}

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

export const HistoryModal: React.FC = () => {
  const { historyModalVisible, setHistoryModalVisible, appTheme } = useUIStore();
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [historyDetail, setHistoryDetail] = useState<HistoryEntry | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchProject, setHistorySearchProject] = useState('');
  const [historySearchName, setHistorySearchName] = useState('');
  const [historySearchURL, setHistorySearchURL] = useState('');
  const [historySearchMethod, setHistorySearchMethod] = useState('');
  const [historySearchStatus, setHistorySearchStatus] = useState('');
  const [historySearchSource, setHistorySearchSource] = useState('');

  useEffect(() => {
    if (historyModalVisible) {
      loadHistoryList();
    }
  }, [historyModalVisible]);

  const buildHistorySearchParams = (): any => {
    const params: any = {};
    if (historySearchProject) params.project = historySearchProject;
    if (historySearchName) params.name = historySearchName;
    if (historySearchURL) params.url = historySearchURL;
    if (historySearchMethod) params.method = historySearchMethod.toUpperCase();
    if (historySearchStatus) params.status = parseInt(historySearchStatus, 10) || 0;
    if (historySearchSource) params.source = historySearchSource.toUpperCase();
    return params;
  };

  const searchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = buildHistorySearchParams();
      const list = await SearchHistory(params, 100);
      setHistoryList(list || []);
    } catch (e) {
      console.error('Failed to search history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

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

  const clearHistorySearch = () => {
    setHistorySearchProject('');
    setHistorySearchName('');
    setHistorySearchURL('');
    setHistorySearchMethod('');
    setHistorySearchStatus('');
    setHistorySearchSource('');
    loadHistoryList();
  };

  const handleClose = () => {
    setHistoryModalVisible(false);
    setHistoryDetail(null);
  };

  const handleClearAll = async () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      onOk: async () => {
        await ClearHistory();
        setHistoryList([]);
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

  const columns = [
    { title: '时间', dataIndex: 'created_at', width: 150, render: (v: string) => v ? new Date(v).toLocaleString() : '' },
    {
      title: '来源', dataIndex: 'source', width: 70, render: (v: string, record: HistoryEntry) => {
        if (v === 'MCP') {
          return <span style={{ color: '#49cc90', fontSize: 11 }} title={record.source_tool}>{v}</span>;
        }
        return <span style={{ color: '#61affe', fontSize: 11 }}>{v}</span>;
      }
    },
    { title: '项目', dataIndex: 'project_name', width: 100, ellipsis: true },
    { title: '请求', dataIndex: 'request_name', width: 120, ellipsis: true },
    { title: '方法', dataIndex: 'method', width: 60, render: (v: string) => <span style={{ color: getMethodColor(v) }}>{v}</span> },
    { title: 'URL', dataIndex: 'url', ellipsis: true },
    { title: '状态', dataIndex: 'status_code', width: 60, render: (_: any, record: HistoryEntry) => <span style={{ color: getStatusColor(record.response?.status_code) }}>{record.response?.status_code || '-'}</span> },
    { title: '耗时', dataIndex: 'duration', width: 70, render: (_: any, record: HistoryEntry) => record.response?.duration ? `${record.response.duration}ms` : '-' },
  ];

  return (
    <>
      <Modal
        title="历史记录"
        open={historyModalVisible}
        onCancel={handleClose}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Button size='small' danger onClick={handleClearAll}>清空全部</Button>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                size='small'
                placeholder='项目'
                value={historySearchProject}
                onChange={(e) => setHistorySearchProject(e.target.value)}
                onPressEnter={searchHistory}
                style={{ width: 120 }}
                allowClear
              />
              <Input
                size='small'
                placeholder='请求名称'
                value={historySearchName}
                onChange={(e) => setHistorySearchName(e.target.value)}
                onPressEnter={searchHistory}
                style={{ width: 120 }}
                allowClear
              />
              <Input
                size='small'
                placeholder='URL'
                value={historySearchURL}
                onChange={(e) => setHistorySearchURL(e.target.value)}
                onPressEnter={searchHistory}
                style={{ flex: 1 }}
                allowClear
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Select
                size='small'
                placeholder='方法'
                value={historySearchMethod || undefined}
                onChange={(v) => setHistorySearchMethod(v || '')}
                style={{ width: 100 }}
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
              <Input
                size='small'
                placeholder='状态码'
                value={historySearchStatus}
                onChange={(e) => setHistorySearchStatus(e.target.value)}
                onPressEnter={searchHistory}
                style={{ width: 80 }}
                allowClear
              />
              <Select
                size='small'
                placeholder='来源'
                value={historySearchSource || undefined}
                onChange={(v) => setHistorySearchSource(v || '')}
                style={{ width: 100 }}
                allowClear
              >
                <Select.Option value="GUI">GUI</Select.Option>
                <Select.Option value="MCP">MCP</Select.Option>
              </Select>
              <Button size='small' type='primary' onClick={searchHistory} icon={<SearchOutlined />}>搜索</Button>
              <Button size='small' onClick={clearHistorySearch}>重置</Button>
            </div>
          </div>
          <Table
            dataSource={historyList}
            rowKey='id'
            size='small'
            loading={historyLoading}
            pagination={{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条记录` }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            columns={columns}
          />
        </div>
      </Modal>

      <Modal
        title={historyDetail ? `${historyDetail.request_name || '请求详情'} - ${historyDetail.method}` : '请求详情'}
        open={!!historyDetail}
        onCancel={() => setHistoryDetail(null)}
        footer={null}
        width={1200}
        destroyOnClose
      >
        {historyDetail && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>{historyDetail.request_name || '未命名请求'}</strong>
              <span style={{ marginLeft: 12, color: getMethodColor(historyDetail.method) }}>{historyDetail.method}</span>
              <span style={{ marginLeft: 12 }}>{historyDetail.url}</span>
            </div>
            <Row gutter={12}>
              <Col span={12} style={{ textAlign: "left" }}>
                <h4>请求信息</h4>
                <div className="json-view-container" style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 4, maxHeight: 500, overflow: 'auto', minHeight: 250 }}>
                  <JsonView
                    data={historyDetail.spec || {}}
                    style={appTheme === 'dark' ? darkStyles : undefined}
                    shouldExpandNode={allExpanded}
                    clickToExpandNode
                  />
                </div>
              </Col>
              <Col span={12} style={{ textAlign: "left" }}>
                <div style={{ display: "flex" }}>
                  <h4>响应信息</h4>
                  <div style={{ marginLeft: 8, display: 'flex', gap: 12 }}>
                    <span style={{ color: getStatusColor(historyDetail.response?.status_code) }}>
                      Status: {historyDetail.response?.status_code || 'N/A'}
                    </span>
                    <span>Duration: {historyDetail.response?.duration || 0}ms</span>
                  </div>
                </div>
                <div className="json-view-container" style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 4, maxHeight: 470, overflow: 'auto', minHeight: 250 }}>
                  <JsonView
                    data={historyDetail.response || {}}
                    style={appTheme === 'dark' ? darkStyles : undefined}
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
