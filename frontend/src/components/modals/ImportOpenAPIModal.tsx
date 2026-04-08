import React from 'react';
import { Modal, Tree, message } from 'antd';
import type { DataNode } from 'antd/es/tree';

interface CollectionItem {
  id: string;
  name: string;
  item?: CollectionItem[];
  request?: {
    method: string;
    url?: { raw: string };
  };
}

interface ImportOpenAPIModalProps {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
  projectName: string;
  items: CollectionItem[];
  loading?: boolean;
}

export const ImportOpenAPIModal: React.FC<ImportOpenAPIModalProps> = ({
  open,
  onClose,
  onImport,
  projectName,
  items,
  loading,
}) => {
  const buildTreeData = (items: CollectionItem[]): DataNode[] => {
    return items.map((item) => ({
      key: item.id,
      title: item.request ? (
        <span>
          <span style={{ 
            color: getMethodColor(item.request.method),
            fontWeight: 500,
            marginRight: 8
          }}>
            {item.request.method}
          </span>
          <span>{item.name}</span>
        </span>
      ) : (
        <span style={{ fontWeight: 500 }}>{item.name}</span>
      ),
      children: item.item ? buildTreeData(item.item) : undefined,
    }));
  };

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      DELETE: '#93e3e3',
      PATCH: '#50e3c2',
      OPTIONS: '#0d5aa7',
      HEAD: '#9012fe',
    };
    return colors[method.toUpperCase()] || '#666';
  };

  return (
    <Modal
      title={`导入 OpenAPI: ${projectName}`}
      open={open}
      onCancel={onClose}
      onOk={onImport}
      confirmLoading={loading}
      width={600}
      okText="导入"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>预览将导入的 API 结构：</p>
        <Tree
          treeData={buildTreeData(items)}
          defaultExpandAll
          showLine
        />
      </div>
    </Modal>
  );
};