import React, { useState } from 'react';
import { Modal, Checkbox, Radio, Progress, Table, Tag, Space, Button, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../store';
import { ProjectTree } from '../../store/useProjectStore';
import { BatchExecuteHTTPRequests } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { getMethodColor } from '../../constants/httpMethods';

interface BatchExecuteModalProps {
  selectedItems: ProjectTree[];
  onClose: () => void;
  onBatchExecute: () => void;
}

interface BatchItem {
  key: string;
  name: string;
  method: string;
  path: string;
  projectId: string;
  projectName: string;
  type: 'request' | 'case';
  spec?: models.HttpRequestSpec;
}

interface ExecutionResult {
  key: string;
  name: string;
  method: string;
  success: boolean;
  statusCode: number;
  duration: number;
  error?: string;
}

export const BatchExecuteModal: React.FC<BatchExecuteModalProps> = ({
  selectedItems,
  onClose,
  onBatchExecute,
}) => {
  const projectStore = useProjectStore();
  
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>(selectedItems.map(i => i.path || i.id));
  const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential');
  const [concurrency, setConcurrency] = useState(5);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState('');

  const activeProjectId = useProjectStore((state) => state.activeTab);

  const items: BatchItem[] = selectedItems.map((item) => {
    const project = projectStore.projectTabs.find(t => t.id === activeProjectId)?.project;
    return {
      key: item.path || item.id,
      name: item.name || 'Unnamed',
      method: item.method || 'GET',
      path: item.path || '',
      projectId: item.id,
      projectName: project?.name || '',
      type: item.type as 'request' | 'case',
    };
  });

  const columns = [
    {
      title: '请求名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={getMethodColor(method)} style={{ margin: 0 }}>
          {method}
        </Tag>
      ),
    },
  ];

  if (results.length > 0) {
    const resultColumns = [
      {
        title: '请求名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '方法',
        dataIndex: 'method',
        key: 'method',
        width: 80,
        render: (method: string) => (
          <Tag color={getMethodColor(method)} style={{ margin: 0 }}>
            {method}
          </Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'success',
        key: 'success',
        width: 100,
        render: (success: boolean) =>
          success ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
          ),
      },
      {
        title: '状态码',
        dataIndex: 'statusCode',
        key: 'statusCode',
        width: 100,
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: number) => `${duration}ms`,
      },
      {
        title: '错误信息',
        dataIndex: 'error',
        key: 'error',
        ellipsis: true,
      },
    ];

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return (
      <Modal
        title="批量执行结果"
        open={true}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Space size="large">
            <span>
              总计: <Tag>{results.length}</Tag>
            </span>
            <span>
              成功: <Tag color="success">{succeeded}</Tag>
            </span>
            <span>
              失败: <Tag color="error">{failed}</Tag>
            </span>
          </Space>
        </div>
        <Table
          dataSource={results}
          columns={resultColumns}
          pagination={false}
          size="small"
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="批量执行"
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="execute"
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={executing}
          disabled={selectedKeys.length === 0}
          onClick={handleExecute}
        >
          开始执行
        </Button>,
      ]}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Checkbox
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length}
          checked={selectedKeys.length === items.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys(items.map(i => i.key));
            } else {
              setSelectedKeys([]);
            }
          }}
        >
          全选 ({selectedKeys.length}/{items.length})
        </Checkbox>
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys),
        }}
        pagination={false}
        size="small"
        style={{ maxHeight: 300, overflow: 'auto' }}
      />

      <div style={{ marginTop: 16 }}>
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio value="sequential">顺序执行</Radio>
          <Radio value="parallel">并发执行</Radio>
        </Radio.Group>
      </div>

      {mode === 'parallel' && (
        <div style={{ marginTop: 16 }}>
          <span>并发数: </span>
          <Radio.Group value={concurrency} onChange={(e) => setConcurrency(e.target.value)}>
            <Radio.Button value={3}>3</Radio.Button>
            <Radio.Button value={5}>5</Radio.Button>
            <Radio.Button value={10}>10</Radio.Button>
          </Radio.Group>
        </div>
      )}

      {executing && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={progress} status="active" />
        </div>
      )}
    </Modal>
  );

  async function handleExecute() {
    if (selectedKeys.length === 0) {
      message.warning('请选择要执行的请求');
      return;
    }

    setExecuting(true);
    setProgress(0);
    setResults([]);

    const selectedItemsList = items.filter(i => selectedKeys.includes(i.key));
    const batchItems: Record<string, unknown>[] = [];

    for (const item of selectedItemsList) {
      try {
        const request = await import('../../../wailsjs/go/main/App').then(m => m.GetRequest(item.path));
        const spec = request as models.CurlRequest;
        
        const httpSpec: Record<string, unknown> = {
          method: spec.method || 'GET',
          http_url: spec.http_url || '',
          headers: (spec.headers || []).map((h: { key: string; value: string; enabled?: boolean }) => ({
            key: h.key,
            value: h.value,
            enabled: h.enabled !== false,
          })),
          params: (spec.params || []).map((p: { key: string; value: string; enabled?: boolean }) => ({
            key: p.key,
            value: p.value,
            enabled: p.enabled !== false,
          })),
          body: spec.body || '',
          body_type: spec.body_type || 'none',
        };

        batchItems.push({
          projectID: item.projectId,
          projectName: item.projectName,
          requestName: item.name,
          requestPath: item.path,
          spec: httpSpec,
        });
      } catch (err) {
        console.error('Failed to load request:', item.path, err);
        message.error(`加载请求失败: ${item.name}`);
        setExecuting(false);
        return;
      }
    }

    try {
      if (mode === 'sequential') {
        const tempResults: ExecutionResult[] = [];
        for (let i = 0; i < batchItems.length; i++) {
          const item = batchItems[i];
          setProgress(Math.round(((i + 1) / batchItems.length) * 100));

          try {
            const response = await BatchExecuteHTTPRequests([item], selectedEnvId, false, 0) as {
              results: Array<{
                requestName: string;
                success: boolean;
                statusCode: number;
                duration: number;
                error?: string;
              }>;
            };

            if (response?.results?.[0]) {
              const r = response.results[0];
              tempResults.push({
                key: item.requestPath as string,
                name: r.requestName,
                method: (item.spec as { method?: string })?.method || 'GET',
                success: r.success,
                statusCode: r.statusCode,
                duration: r.duration,
                error: r.error,
              });
            }
          } catch (err) {
            tempResults.push({
              key: item.requestPath as string,
              name: item.requestName as string,
              method: (item.spec as { method?: string })?.method || 'GET',
              success: false,
              statusCode: 0,
              duration: 0,
              error: String(err),
            });
          }
        }
        setResults(tempResults);
      } else {
        const response = await BatchExecuteHTTPRequests(batchItems, selectedEnvId, true, concurrency) as {
          results: Array<{
            requestName: string;
            success: boolean;
            statusCode: number;
            duration: number;
            error?: string;
          }>;
        };

        setProgress(100);

        if (response?.results) {
          const tempResults: ExecutionResult[] = response.results.map((r, idx) => {
            const item = batchItems[idx] as { requestPath?: string; requestName?: string; spec?: { method?: string } };
            return {
              key: item.requestPath || String(idx),
              name: r.requestName,
              method: item.spec?.method || 'GET',
              success: r.success,
              statusCode: r.statusCode,
              duration: r.duration,
              error: r.error,
            };
          });
          setResults(tempResults);
        }
      }

      message.success('批量执行完成');
      onBatchExecute();
    } catch (err) {
      console.error('Batch execution failed:', err);
      message.error(`批量执行失败: ${err}`);
    } finally {
      setExecuting(false);
    }
  }
};
