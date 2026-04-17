import React from 'react';
import { Button, Empty, Input, Space, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useScriptStore } from '../../store/useScriptStore';
import { useScriptHandlers } from '../../hooks/useScriptHandlers';
import { useUIStore } from '../../store';

interface ScriptEditorProps {
  onClose?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ onClose }) => {
  const {
    editingScriptId,
    scriptFormName,
    scriptFormDescription,
    scriptFormContent,
    setScriptFormName,
    setScriptFormDescription,
    setScriptFormContent,
  } = useScriptStore();

  const { handleSaveScript, handleDeleteScript } = useScriptHandlers();
  const setScriptHelpVisible = useUIStore((state) => state.setScriptHelpVisible);

  const handleSave = async () => {
    await handleSaveScript(scriptFormName.trim(), scriptFormDescription.trim(), scriptFormContent);
  };

  const handleDelete = async () => {
    await handleDeleteScript();
    onClose?.();
  };

  return (
    <div className="request-panel">
      {editingScriptId || scriptFormName ? (
        <div className="environment-panel script-panel">
          <div className="script-editor-header">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Input
                placeholder="脚本名称"
                value={scriptFormName}
                onChange={(e) => setScriptFormName(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              <Input.TextArea
                placeholder="描述（可选）"
                value={scriptFormDescription}
                onChange={(e) => setScriptFormDescription(e.target.value)}
                style={{ maxWidth: 300, minWidth: 200, minHeight: 60, maxHeight: 120 }}
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </div>
            <Space>
              <Tooltip title="脚本开发指南">
                <Button icon={<QuestionCircleOutlined />} onClick={() => setScriptHelpVisible(true)} />
              </Tooltip>
              <Button danger onClick={handleDelete}>删除</Button>
              <Button type="primary" onClick={handleSave}>保存脚本</Button>
            </Space>
          </div>
          <div className="script-editor-wrapper">
            <CodeMirror
              value={scriptFormContent}
              height="100%"
              theme="light"
              extensions={[javascript()]}
              onChange={(value) => setScriptFormContent(value)}
            />
          </div>
        </div>
      ) : (
        <Empty description="请先在左侧选择脚本，或点击新建" />
      )}
    </div>
  );
};