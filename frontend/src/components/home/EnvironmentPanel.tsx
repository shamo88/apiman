import React from 'react';
import { Button, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { EnvironmentVarEditor } from './EnvironmentVarRow';

interface EnvironmentPanelProps {
    environmentFormName: string;
    environmentFormVariables: { id: string; key: string; value: string }[];
    envSaving: boolean;
    editingEnvironmentId: string | null;
    onNameChange: (value: string) => void;
    onVariablesUpdate: (id: string, field: 'key' | 'value', value: string) => void;
    onVariablesRemove: (id: string) => void;
    onVariablesAdd: () => void;
    onReset: () => void;
    onDelete: () => void;
    onSave: () => void;
    createEnvironmentVariableRow: () => { id: string; key: string; value: string };
}

export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({
    environmentFormName,
    environmentFormVariables,
    envSaving,
    editingEnvironmentId,
    onNameChange,
    onVariablesUpdate,
    onVariablesRemove,
    onVariablesAdd,
    onReset,
    onDelete,
    onSave,
    createEnvironmentVariableRow,
}) => {
    return (
        <div className="environment-panel">
            <Input
                placeholder="环境名称"
                value={environmentFormName}
                onChange={(e) => onNameChange(e.target.value)}
                style={{ marginBottom: 10 }}
            />
            <div className="environment-vars-header">
                <span>变量</span>
                <Button
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={onVariablesAdd}
                >
                    添加
                </Button>
            </div>
            <EnvironmentVarEditor
                variables={environmentFormVariables}
                onUpdate={onVariablesUpdate}
                onRemove={onVariablesRemove}
                onAdd={onVariablesAdd}
            />
            <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
                <Button onClick={onReset}>清空</Button>
                <Space>
                    {editingEnvironmentId && (
                        <Button danger onClick={onDelete}>删除</Button>
                    )}
                    <Button type="primary" loading={envSaving} onClick={onSave}>保存</Button>
                </Space>
            </Space>
        </div>
    );
};
