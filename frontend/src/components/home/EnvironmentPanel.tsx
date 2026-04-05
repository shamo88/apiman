import React from 'react';
import { Button, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { EnvironmentVarEditor } from './EnvironmentVarRow';
import { useProjectContext } from '../../contexts/ProjectContext';

interface EnvironmentPanelProps {
    projectId: string | undefined;
}

export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({
    projectId,
}) => {
    const { environment } = useProjectContext();
    const {
        environmentFormName,
        environmentFormVariables,
        envSaving,
        editingEnvironmentId,
        updateEnvironmentName,
        addVariable,
        removeVariable,
        updateVariable,
        resetEnvironmentEditor,
        saveEnvironment,
        deleteEnvironment,
    } = environment;

    const handleSave = () => {
        if (projectId) {
            saveEnvironment(projectId);
        }
    };

    const handleDelete = () => {
        if (projectId) {
            deleteEnvironment(projectId);
        }
    };

    return (
        <div className="environment-panel">
            <Input
                placeholder="环境名称"
                value={environmentFormName}
                onChange={(e) => updateEnvironmentName(e.target.value)}
                style={{ marginBottom: 10 }}
            />
            <div className="environment-vars-header">
                <span>变量</span>
                <Button
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={addVariable}
                >
                    添加
                </Button>
            </div>
            <EnvironmentVarEditor
                variables={environmentFormVariables}
                onUpdate={updateVariable}
                onRemove={removeVariable}
                onAdd={addVariable}
            />
            <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
                <Button onClick={resetEnvironmentEditor}>清空</Button>
                <Space>
                    {editingEnvironmentId && (
                        <Button danger onClick={handleDelete}>删除</Button>
                    )}
                    <Button type="primary" loading={envSaving} onClick={handleSave}>保存</Button>
                </Space>
            </Space>
        </div>
    );
};
