import React, { useEffect } from 'react';
import { Modal, Table, Button, Input, Select, Row, Col } from 'antd';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { ClearHistory, GetHistoryEntry } from '../../../wailsjs/go/main/App';
import { getMethodColor, getStatusColor } from '../../utils/ui';
import { useHistory } from '../../hooks/useHistory';

interface HistoryModalProps {
    visible: boolean;
    onClose: () => void;
    appTheme: 'light' | 'dark';
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
    visible,
    onClose,
    appTheme,
}) => {
    const {
        historyList,
        historyDetail,
        historyLoading,
        setSearchProject,
        setSearchName,
        setSearchURL,
        setSearchMethod,
        setSearchStatus,
        setSearchSource,
        loadHistoryList,
        loadHistoryDetail,
        clearDetail,
        searchHistory,
        clearSearch,
        clearAllHistory,
    } = useHistory();

    useEffect(() => {
        if (visible) {
            loadHistoryList();
        }
    }, [visible, loadHistoryList]);

    const handleClearAll = () => {
        Modal.confirm({
            title: '确认清空',
            content: '确定要清空所有历史记录吗？',
            onOk: async () => {
                await clearAllHistory();
            },
        });
    };

    const handleTableRowClick = async (record: any) => {
        await loadHistoryDetail(record.id);
    };

    const handleSearch = async () => {
        await searchHistory();
    };

    const handleClearSearch = () => {
        clearSearch();
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
                                onChange={(e) => setSearchProject(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{ width: 120 }}
                                allowClear
                            />
                            <Input
                                size='small'
                                placeholder='请求名称'
                                onChange={(e) => setSearchName(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{ width: 120 }}
                                allowClear
                            />
                            <Input
                                size='small'
                                placeholder='URL'
                                onChange={(e) => setSearchURL(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{ flex: 1 }}
                                allowClear
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <Select
                                size='small'
                                placeholder='方法'
                                onChange={(v) => setSearchMethod(v || '')}
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
                                onChange={(e) => setSearchStatus(e.target.value)}
                                onPressEnter={handleSearch}
                                style={{ width: 80 }}
                                allowClear
                            />
                            <Select
                                size='small'
                                placeholder='来源'
                                onChange={(v) => setSearchSource(v || '')}
                                style={{ width: 100 }}
                                allowClear
                            >
                                <Select.Option value="GUI">GUI</Select.Option>
                                <Select.Option value="MCP">MCP</Select.Option>
                            </Select>
                            <Button size='small' type='primary' onClick={handleSearch}>搜索</Button>
                            <Button size='small' onClick={handleClearSearch}>重置</Button>
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
                            { title: '耗时', dataIndex: 'duration', width: 70, render: (v, record) => record.response?.duration ? `${record.response.duration}ms` : '-' },
                        ]}
                    />
                </div>
            </Modal>

            <Modal
                title={historyDetail ? `${historyDetail.request_name || '请求详情'} - ${historyDetail.method}` : '请求详情'}
                open={!!historyDetail}
                onCancel={() => clearDetail()}
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
