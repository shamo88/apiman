import React, { useState } from 'react';
import { Modal, Select, Table, Tag } from 'antd';
import { Environment } from '../../types';

interface EnvironmentCompareModalProps {
    visible: boolean;
    onClose: () => void;
    environments: Environment[];
}

interface DiffRow {
    key: string;
    onlyInA?: string;
    onlyInB?: string;
    inBoth?: { valueA: string; valueB: string; isDifferent: boolean };
}

export const EnvironmentCompareModal: React.FC<EnvironmentCompareModalProps> = ({
    visible,
    onClose,
    environments,
}) => {
    const [envAId, setEnvAId] = useState<string>('');
    const [envBId, setEnvBId] = useState<string>('');

    const envA = environments.find(e => e.id === envAId);
    const envB = environments.find(e => e.id === envBId);

    const getAllKeys = (): string[] => {
        const keys = new Set<string>();
        if (envA) Object.keys(envA.variables).forEach(k => keys.add(k));
        if (envB) Object.keys(envB.variables).forEach(k => keys.add(k));
        return Array.from(keys).sort();
    };

    const buildDiffData = (): DiffRow[] => {
        if (!envA || !envB) return [];

        const allKeys = getAllKeys();
        const rows: DiffRow[] = [];

        for (const key of allKeys) {
            const valA = envA.variables[key];
            const valB = envB.variables[key];

            if (valA !== undefined && valB === undefined) {
                rows.push({ key, onlyInA: valA });
            } else if (valA === undefined && valB !== undefined) {
                rows.push({ key, onlyInB: valB });
            } else if (valA !== valB) {
                rows.push({ key, inBoth: { valueA: valA!, valueB: valB!, isDifferent: true } });
            } else {
                rows.push({ key, inBoth: { valueA: valA!, valueB: valB!, isDifferent: false } });
            }
        }

        return rows;
    };

    const diffData = buildDiffData();

    const columns = [
        { title: '变量名', dataIndex: 'key', key: 'key', width: 150 },
        {
            title: envA?.name || '环境 A',
            dataIndex: 'onlyInA',
            key: 'onlyInA',
            width: 200,
            render: (_: any, record: DiffRow) => {
                if (record.onlyInA !== undefined) {
                    return <Tag color="blue">{record.onlyInA}</Tag>;
                }
                if (record.inBoth) {
                    return record.inBoth.valueA;
                }
                return '-';
            },
        },
        {
            title: envB?.name || '环境 B',
            dataIndex: 'onlyInB',
            key: 'onlyInB',
            width: 200,
            render: (_: any, record: DiffRow) => {
                if (record.onlyInB !== undefined) {
                    return <Tag color="green">{record.onlyInB}</Tag>;
                }
                if (record.inBoth) {
                    return record.inBoth.valueB;
                }
                return '-';
            },
        },
        {
            title: '状态',
            key: 'status',
            width: 100,
            render: (_: any, record: DiffRow) => {
                if (record.onlyInA) return <Tag>仅 A 有</Tag>;
                if (record.onlyInB) return <Tag>仅 B 有</Tag>;
                if (record.inBoth?.isDifferent) return <Tag color="orange">值不同</Tag>;
                return <Tag color="default">相同</Tag>;
            },
        },
    ];

    return (
        <Modal
            title="环境对比"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
            destroyOnClose
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>选择环境 A</div>
                    <Select
                        value={envAId || undefined}
                        onChange={setEnvAId}
                        placeholder="选择环境 A"
                        style={{ width: '100%' }}
                        allowClear
                    >
                        {environments.map(env => (
                            <Select.Option key={env.id} value={env.id}>{env.name}</Select.Option>
                        ))}
                    </Select>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>选择环境 B</div>
                    <Select
                        value={envBId || undefined}
                        onChange={setEnvBId}
                        placeholder="选择环境 B"
                        style={{ width: '100%' }}
                        allowClear
                    >
                        {environments.map(env => (
                            <Select.Option key={env.id} value={env.id}>{env.name}</Select.Option>
                        ))}
                    </Select>
                </div>
            </div>

            {envAId && envBId && (
                <div>
                    <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        共 {diffData.length} 个变量
                    </div>
                    <Table
                        dataSource={diffData}
                        rowKey="key"
                        size="small"
                        pagination={false}
                        columns={columns}
                        scroll={{ y: 400 }}
                    />
                </div>
            )}

            {(!envAId || !envBId) && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    请选择两个环境进行对比
                </div>
            )}
        </Modal>
    );
};
