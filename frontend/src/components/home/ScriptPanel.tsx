import React from 'react';
import { Button, Input, Space, Tooltip, message, Empty } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { ScriptEditor } from '../request/ScriptEditor';
import { useProjectContext } from '../../contexts/ProjectContext';

interface ScriptPanelProps {
    projectId: string | undefined;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
    projectId,
}) => {
    const { script } = useProjectContext();
    const {
        scriptFormName,
        scriptFormDescription,
        scriptFormContent,
        scriptSaving,
        editingScriptId,
        updateScriptName,
        updateScriptDescription,
        updateScriptContent,
        saveScript,
        deleteScript,
        setScriptHelpVisible,
    } = script;

    const handleSave = () => {
        if (!projectId) {
            message.warning('请先选择项目');
            return;
        }
        saveScript(projectId);
    };

    const handleDelete = () => {
        if (!projectId) {
            message.warning('请先选择项目');
            return;
        }
        deleteScript(projectId, [], [], () => {});
    };

    if (!editingScriptId) {
        return (
            <div className="environment-panel script-panel">
                <Empty description="请先在左侧选择脚本，或点击新建" />
            </div>
        );
    }

    return (
        <div className="environment-panel script-panel">
            <div className="script-editor-header">
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Input
                        placeholder="脚本名称"
                        value={scriptFormName}
                        onChange={(e) => updateScriptName(e.target.value)}
                        style={{ maxWidth: 200 }}
                    />
                    <Input.TextArea
                        placeholder="描述（可选）"
                        value={scriptFormDescription}
                        onChange={(e) => updateScriptDescription(e.target.value)}
                        style={{ maxWidth: 300, minWidth: 200, minHeight: 60, maxHeight: 120 }}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                </div>
                <Space>
                    <Tooltip title="脚本开发指南">
                        <Button
                            type="text"
                            icon={<QuestionCircleOutlined />}
                            onClick={() => setScriptHelpVisible(true)}
                        />
                    </Tooltip>
                    <Button danger onClick={handleDelete}>删除</Button>
                    <Button type="primary" loading={scriptSaving} onClick={handleSave}>保存脚本</Button>
                </Space>
            </div>
            <div className="script-editor-wrapper">
                <ScriptEditor
                    value={scriptFormContent}
                    onChange={updateScriptContent}
                    theme="dark"
                />
            </div>
        </div>
    );
};
