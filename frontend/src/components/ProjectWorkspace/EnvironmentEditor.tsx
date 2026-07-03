import React from 'react';
import { Button, Empty, Input, Select, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ContextMenu, useContextMenu } from '../ContextMenu';
import {
  ALL_ENVIRONMENT_MARKS,
  ENVIRONMENT_MARK_LABELS,
  EnvironmentVariableRow,
  useEnvironmentStore,
} from '../../store';
import './EnvironmentEditor.css';

interface EnvironmentEditorProps {
  onSave: () => void;
  onDelete: () => void;
}

export const EnvironmentEditor: React.FC<EnvironmentEditorProps> = ({
  onSave,
  onDelete,
}) => {
  const {
    environmentFormName,
    environmentFormMark,
    environmentFormVariables,
    setEnvironmentFormName,
    setEnvironmentFormMark,
    setEnvironmentFormVariables,
    editingEnvironmentId,
    resetEnvironmentEditor,
  } = useEnvironmentStore();

  const createNewVariableRow = (): EnvironmentVariableRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key: '',
    value: '',
  });

  const handleAddVariable = () => {
    setEnvironmentFormVariables([...environmentFormVariables, createNewVariableRow()]);
  };

  const handleRemoveVariable = (id: string) => {
    const next = environmentFormVariables.filter((row) => row.id !== id);
    setEnvironmentFormVariables(next.length > 0 ? next : [createNewVariableRow()]);
  };

  const handleVariableKeyChange = (id: string, key: string) => {
    setEnvironmentFormVariables(
      environmentFormVariables.map((row) => (row.id === id ? { ...row, key } : row))
    );
  };

  const handleVariableValueChange = (id: string, value: string) => {
    setEnvironmentFormVariables(
      environmentFormVariables.map((row) => (row.id === id ? { ...row, value } : row))
    );
  };

  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'add',
        label: '添加变量',
        onClick: handleAddVariable,
      },
      { type: 'divider' as const },
      {
        key: 'clear',
        label: '清空',
        onClick: () => {
          setEnvironmentFormVariables([createNewVariableRow()]);
        },
      },
    ],
  });

  return (
    <div className="request-panel">
      {editingEnvironmentId || environmentFormName ? (
        <>
          {contextMenu}
          <div
            className="environment-panel"
            onContextMenu={(e) => {
              e.stopPropagation();
              contextMenuProps.onContextMenu(e);
            }}
          >
            <Input
              placeholder="环境名称"
              value={environmentFormName}
              onChange={(e) => setEnvironmentFormName(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary, #888)', fontSize: 12, whiteSpace: 'nowrap' }}>
                标记
              </span>
              <Select
                value={environmentFormMark}
                onChange={(value) => setEnvironmentFormMark(value)}
                style={{ flex: 1 }}
                placeholder="选择环境标记"
                options={ALL_ENVIRONMENT_MARKS.map((m: string) => ({
                  value: m,
                  label: ENVIRONMENT_MARK_LABELS[m] ?? m,
                }))}
              />
            </div>
            <div className="environment-vars-header">
              <span>变量</span>
              <Button
                size="small"
                type="link"
                icon={<PlusOutlined />}
                onClick={handleAddVariable}
              >
                添加
              </Button>
            </div>
            <div className="environment-vars-list">
              {environmentFormVariables.map((item) => (
                <div className="environment-var-row" key={item.id}>
                  <Input
                    placeholder="变量名"
                    value={item.key}
                    onChange={(e) => handleVariableKeyChange(item.id, e.target.value)}
                  />
                  <Input
                    placeholder="变量值"
                    value={item.value}
                    onChange={(e) => handleVariableValueChange(item.id, e.target.value)}
                  />
                  <Button
                    type="text"
                    danger
                    onClick={() => handleRemoveVariable(item.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
              <Button onClick={resetEnvironmentEditor}>清空</Button>
              <Space>
                {editingEnvironmentId && (
                  <Button danger onClick={onDelete}>删除</Button>
                )}
                <Button type="primary" onClick={onSave}>保存</Button>
              </Space>
            </Space>
          </div>
        </>
      ) : (
        <Empty description="请先在左侧选择环境，或点击新建" />
      )}
    </div>
  );
};