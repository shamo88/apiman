import React from 'react';
import { EnvironmentOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { ContextMenu, useContextMenu } from '../ContextMenu';
import { Environment } from '../../store';

interface EnvironmentListItemProps {
  env: Environment;
  isActive: boolean;
  onClick: (env: Environment) => void;
  onDelete: (envId: string) => void;
  onDuplicate: (env: Environment) => void;
}

export const EnvironmentListItem: React.FC<EnvironmentListItemProps> = ({
  env,
  isActive,
  onClick,
  onDelete,
  onDuplicate,
}) => {
  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: '复制',
        onClick: () => onDuplicate(env),
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => onDelete(env.id),
      },
    ],
  });

  return (
    <>
      {contextMenu}
      <button
        className={`environment-list-item ${isActive ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onClick(env); }}
        onContextMenu={(e) => {
          e.stopPropagation();
          contextMenuProps.onContextMenu(e);
        }}
      >
        <span className="environment-list-item-icon">
          <EnvironmentOutlined />
        </span>
        <span className="environment-list-item-name">{env.name}</span>
      </button>
    </>
  );
};
