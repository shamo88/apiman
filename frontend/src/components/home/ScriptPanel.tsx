import React from 'react';
import { Button, Input, Space, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { ScriptEditor } from '../request/ScriptEditor';

interface ScriptPanelProps {
    scriptFormName: string;
    scriptFormDescription: string;
    scriptFormContent: string;
    scriptSaving: boolean;
    appTheme: 'light' | 'dark';
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onContentChange: (value: string) => void;
    onHelpClick: () => void;
    onDelete: () => void;
    onSave: () => void;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
    scriptFormName,
    scriptFormDescription,
    scriptFormContent,
    scriptSaving,
    appTheme,
    onNameChange,
    onDescriptionChange,
    onContentChange,
    onHelpClick,
    onDelete,
    onSave,
}) => {
    return (
        <div className="environment-panel script-panel">
            <div className="script-editor-header">
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Input
                        placeholder="脚本名称"
                        value={scriptFormName}
                        onChange={(e) => onNameChange(e.target.value)}
                        style={{ maxWidth: 200 }}
                    />
                    <Input.TextArea
                        placeholder="描述（可选）"
                        value={scriptFormDescription}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        style={{ maxWidth: 300, minWidth: 200, minHeight: 60, maxHeight: 120 }}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                    />
                </div>
                <Space>
                    <Tooltip title="脚本开发指南">
                        <Button
                            type="text"
                            icon={<QuestionCircleOutlined />}
                            onClick={onHelpClick}
                        />
                    </Tooltip>
                    <Button danger onClick={onDelete}>删除</Button>
                    <Button type="primary" loading={scriptSaving} onClick={onSave}>保存脚本</Button>
                </Space>
            </div>
            <div className="script-editor-wrapper">
                <ScriptEditor
                    value={scriptFormContent}
                    onChange={onContentChange}
                    theme={appTheme}
                />
            </div>
        </div>
    );
};
