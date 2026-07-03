import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useGlobalVariables } from '../../hooks/useGlobalVariables';
import { useUIStore } from '../../store';

interface VariableRow {
  id: string;
  key: string;
  value: string;
}

const createRowId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildRows = (source: Record<string, string>): VariableRow[] =>
  Object.entries(source).map(([key, value]) => ({
    id: createRowId(),
    key,
    value,
  }));

const rowsToRecord = (rows: VariableRow[]): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const trimmedKey = row.key.trim();
    if (!trimmedKey) continue;
    record[trimmedKey] = row.value;
  }
  return record;
};

const recordsEqual = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

export const GlobalVariablesModal: React.FC = () => {
  const visible = useUIStore((state) => state.globalVariablesModalVisible);
  const closeGlobalVariablesModal = useUIStore((state) => state.closeGlobalVariablesModal);
  const { variables, load, saveAll } = useGlobalVariables();

  const [rows, setRows] = useState<VariableRow[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Populate rows from backend on first open (and refresh on each open).
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const run = async () => {
      await load();
      if (!cancelled) {
        setLoadedOnce(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [visible, load]);

  // Whenever the backend-loaded variables change and we haven't touched rows yet
  // (or the modal just re-opened), sync rows to backend data.
  useEffect(() => {
    if (!loadedOnce) return;
    setRows((prev) => {
      // Only re-seed when the modal is freshly opened (rows empty).
      if (prev.length === 0) {
        return buildRows(variables);
      }
      return prev;
    });
  }, [variables, loadedOnce]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: createRowId(), key: '', value: '' },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      // Keep at least one empty row so the UI stays usable.
      return next.length > 0 ? next : [{ id: createRowId(), key: '', value: '' }];
    });
  };

  const handleRowKeyChange = (id: string, key: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, key } : row))
    );
  };

  const handleRowValueChange = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, value } : row))
    );
  };

  const trimmedKeys = useMemo(
    () => rows.map((row) => row.key.trim()).filter((k) => k.length > 0),
    [rows]
  );

  const duplicateKey = useMemo(() => {
    const seen = new Set<string>();
    for (const key of trimmedKeys) {
      if (seen.has(key)) return key;
      seen.add(key);
    }
    return null;
  }, [trimmedKeys]);

  const isDirty = useMemo(() => {
    const next = rowsToRecord(rows);
    return !recordsEqual(next, variables);
  }, [rows, variables]);

  const dirtyAsterisk = isDirty ? ' *' : '';

  const handleSave = async () => {
    if (duplicateKey) {
      // AntD already shows inline error in the row; surface as well.
      return;
    }
    const next = rowsToRecord(rows);
    await saveAll(next);
  };

  const handleCancel = () => {
    closeGlobalVariablesModal();
  };

  // Reset transient state when modal closes so it re-fetches next open.
  const handleAfterClose = () => {
    setRows([]);
    setLoadedOnce(false);
  };

  return (
    <Modal
      title={`全局变量${dirtyAsterisk}`}
      open={visible}
      onCancel={handleCancel}
      afterClose={handleAfterClose}
      width={720}
      destroyOnClose
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary, #888)', fontSize: 12 }}>
            变量在所有项目中共享，可通过 <code>{'{{name}}'}</code> 引用
          </span>
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button
              type="primary"
              onClick={handleSave}
              disabled={duplicateKey !== null}
            >
              保存全部
            </Button>
          </Space>
        </Space>
      }
    >
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          type="link"
          icon={<PlusOutlined />}
          onClick={handleAddRow}
        >
          添加
        </Button>
      </div>
      <div
        style={{
          maxHeight: 420,
          overflowY: 'auto',
          border: '1px solid var(--border-color, #303030)',
          borderRadius: 4,
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-secondary, #888)',
            }}
          >
            暂无变量，点击「添加」开始创建
          </div>
        ) : (
          rows.map((row) => {
            const trimmedKey = row.key.trim();
            const showDuplicateError =
              trimmedKey.length > 0 &&
              duplicateKey === trimmedKey;
            return (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: 8,
                  borderBottom: '1px solid var(--border-color, #303030)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    placeholder="变量名"
                    value={row.key}
                    status={showDuplicateError ? 'error' : undefined}
                    onChange={(e) => handleRowKeyChange(row.id, e.target.value)}
                  />
                </div>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <Input
                    placeholder="变量值"
                    value={row.value}
                    onChange={(e) => handleRowValueChange(row.id, e.target.value)}
                  />
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveRow(row.id)}
                  title="删除"
                />
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};