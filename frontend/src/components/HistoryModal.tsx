import React, { useEffect } from 'react';
import { Modal, Table, Button, Input, Select, Row, Col } from 'antd';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { ClearHistory, GetHistoryEntry, SearchHistory, ListHistory } from '../../wailsjs/go/main/App';
import { getMethodColor, getStatusColor } from '../utils/ui';

interface HistoryModalProps {
    visible: boolean;
    onClose: () => void;
    appTheme: 'light' | 'dark';
    // List state
    historyList: any[];
    setHistoryList: React.Dispatch<React.SetStateAction<any[]>>;
    // Detail state
    historyDetail: any | null;
    setHistoryDetail: (detail: any | null) => void;
    // Loading state
    historyLoading: boolean;
    setHistoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    // Search fields
    historySearchProject: string;
    setHistorySearchProject: (v: string) => void;
    historySearchName: string;
    setHistorySearchName: (v: string) => void;
    historySearchURL: string;
    setHistorySearchURL: (v: string) => void;
    historySearchMethod: string;
    setHistorySearchMethod: (v: string) => void;
    historySearchStatus: string;
    setHistorySearchStatus: (v: string) => void;
    historySearchSource: string;
    setHistorySearchSource: (v: string) => void;
    // Actions
    onSearch: () => void;
    onClearSearch: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
    visible,
    onClose,
    appTheme,
    historyList,
    setHistoryList,
    historyDetail,
    setHistoryDetail,
    historyLoading,
    setHistoryLoading,
    historySearchProject,
    setHistorySearchProject,
    historySearchName,
    setHistorySearchName,
    historySearchURL,
    setHistorySearchURL,
    historySearchMethod,
    setHistorySearchMethod,
    historySearchStatus,
    setHistorySearchStatus,
    historySearchSource,
    setHistorySearchSource,
    onSearch,
    onClearSearch,
}) => {
    useEffect(() => {
        if (visible) {
            onSearch();
        }
    }, [visible]);

    const handleClearAll = async () => {
        Modal.confirm({
            title: '确认清空',
            content: '确定要清空所有历史记录吗？',
            onOk: async () => {
                try {
                    await ClearHistory();
                    setHistoryList([]);
                } catch (e) {
                    console.error('Failed to clear history:', e);
                }
            },
        });
    };

    const handleTableRowClick = async (record: any) => {
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

    return (
        <>
            <Modal
                title="历史记录"
                open={visible}
                onCancel={onClose}
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
                                onPressEnter={onSearch}
                                style={{ width: 120 }}
                                allowClear
                                onClear={() => setHistorySearchProject('')}
                            />
                            <Input
                                size='small'
                                placeholder='请求名称'
                                value={historySearchName}
                                onChange={(e) => setHistorySearchName(e.target.value)}
                                onPressEnter={onSearch}
                                style={{ width: 120 }}
                                allowClear
                                onClear={() => setHistorySearchName('')}
                            />
                            <Input
                                size='small'
                                placeholder='URL'
                                value={historySearchURL}
                                onChange={(e) => setHistorySearchURL(e.target.value)}
                                onPressEnter={onSearch}
                                style={{ flex: 1 }}
                                allowClear
                                onClear={() => setHistorySearchURL('')}
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
                                onPressEnter={onSearch}
                                style={{ width: 80 }}
                                allowClear
                                onClear={() => setHistorySearchStatus('')}
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
                            <Button size='small' type='primary' onClick={onSearch}>搜索</Button>
                            <Button size='small' onClick={onClearSearch}>重置</Button>
                        </div>
                    </div>
                    <Table
                        dataSource={historyList}
                        rowKey='id'
                        size='small'
                        loading={historyLoading}
                        pagination={{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条记录` }}
                        onRow={(record) => ({
                            onClick: () => handleTableRowClick(record),
                            style: { cursor: 'pointer' },
                        })}
                        columns={[
                            { title: '时间', dataIndex: 'created_at', width: 150, render: (v) => v ? new Date(v).toLocaleString() : '' },
                            {
                                title: '来源', dataIndex: 'source', width: 70, render: (v, record) => {
                                    if (v === 'MCP') {
                                        return <span style={{ color: '#49cc90', fontSize: 11 }} title={record.source_tool}>{v}</span>;
                                    }
                                    return <span style={{ color: '#61affe', fontSize: 11 }}>{v}</span>;
                                },
                            },
                            { title: '项目', dataIndex: 'project_name', width: 100, ellipsis: true },
                            { title: '请求', dataIndex: 'request_name', width: 120, ellipsis: true },
                            { title: '方法', dataIndex: 'method', width: 60, render: (v) => <span style={{ color: getMethodColor(v) }}>{v}</span> },
                            { title: 'URL', dataIndex: 'url', ellipsis: true },
                            { title: '状态', dataIndex: 'status_code', width: 60, render: (v) => <span style={{ color: getStatusColor(v) }}>{v || '-'}</span> },
                            { title: '耗时', dataIndex: 'duration', width: 70, render: (v) => v ? `${v}ms` : '-' },
                        ]}
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
