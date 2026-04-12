import React, { DragEvent, useCallback } from 'react';
import { Dropdown } from 'antd';
import { DownOutlined, RightOutlined, MoreOutlined, PlusOutlined, CopyOutlined, EditOutlined, CloseOutlined, ExperimentOutlined } from '@ant-design/icons';
import { ProjectTree } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { getMethodColor, formatSidebarMethodLabel } from '../../constants/httpMethods';
import { ContextMenu, useContextMenu } from '../ContextMenu';
import './ApiTree.css';

interface ApiTreeItemProps {
  request: ProjectTree;
  isExpanded: boolean;
  isActive: boolean;
  sidebarHighlightedCasePath: string;
  movedHighlightPath: string | null;
  onToggleCases: () => void;
  onClick: () => void;
  onAddCase: (requestPath: string) => void;
  onCopy: () => void;
  onRename: () => void;
  onDelete: (path: string, name: string) => void;
  onCaseClick: (c: ProjectTree) => void;
  onDuplicateCase: (casePath: string) => void;
  onRenameCase: (casePath: string, currentName: string) => void;
  onDeleteCase: (casePath: string, name: string) => void;
  onDragStart?: (e: DragEvent, node: ProjectTree) => void;
  onDragOver?: (e: DragEvent, nodePath: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent, nodePath: string) => void;
}

// Case item with its own context menu
interface CaseItemProps {
  caseItem: ProjectTree;
  isActive: boolean;
  movedHighlightPath: string | null;
  onCaseClick: () => void;
  onDuplicateCase: () => void;
  onRenameCase: () => void;
  onDeleteCase: (casePath: string, name: string) => void;
}

const CaseItem: React.FC<CaseItemProps> = ({
  caseItem,
  isActive,
  movedHighlightPath,
  onCaseClick,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
}) => {
  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: '复制',
        onClick: onDuplicateCase,
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: onRenameCase,
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <CloseOutlined />,
        label: '删除',
        danger: true,
        onClick: () => onDeleteCase(caseItem.path || '', caseItem.name || ''),
      },
    ],
  });

  return (
    <>
      {contextMenu}
      <div
        className={`api-case-item ${isActive ? 'active' : ''} ${movedHighlightPath === caseItem.path ? 'moved-highlight' : ''}`}
        onClick={onCaseClick}
        onContextMenu={(e) => {
          e.stopPropagation();
          contextMenuProps.onContextMenu(e);
        }}
      >
        <div className="api-request-expand-cell">
          <span className="api-request-expand-placeholder" />
        </div>
        <div className="api-item-main">
          <span className="api-method-col api-method-col--case-icon" title="用例">
            <ExperimentOutlined className="api-case-type-icon" />
          </span>
          <span className="api-case-name">{caseItem.name}</span>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'dup',
                icon: <CopyOutlined />,
                label: '复制',
                onClick: (e) => { e.domEvent.stopPropagation(); onDuplicateCase(); },
              },
              {
                key: 'ren',
                icon: <EditOutlined />,
                label: '重命名',
                onClick: (e) => { e.domEvent.stopPropagation(); onRenameCase(); },
              },
              { type: 'divider' as const },
              {
                key: 'del',
                icon: <CloseOutlined />,
                label: '删除',
                danger: true,
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  onDeleteCase(caseItem.path || '', caseItem.name || '');
                },
              },
            ],
          }}
          trigger={['click']}
        >
          <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
    </>
  );
};

export const ApiTreeItem: React.FC<ApiTreeItemProps> = ({
  request,
  isExpanded,
  isActive,
  sidebarHighlightedCasePath,
  movedHighlightPath,
  onToggleCases,
  onClick,
  onAddCase,
  onCopy,
  onRename,
  onDelete,
  onCaseClick,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const { draggingNode } = useUIStore();
  const caseKids = (request.children || []).filter((c): c is ProjectTree => c.type === 'case');
  const hasCases = caseKids.length > 0;
  const method = formatSidebarMethodLabel(request.method || 'GET');
  const mc = getMethodColor(request.method || 'GET');
  const isDragging = draggingNode?.path === request.path;

  // Request item context menu
  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'add-case',
        icon: <PlusOutlined />,
        label: '新增用例',
        onClick: () => onAddCase(request.path || ''),
      },
      { type: 'divider' as const },
      {
        key: 'copy',
        icon: <CopyOutlined />,
        label: '复制',
        onClick: onCopy,
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: onRename,
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <CloseOutlined />,
        label: '删除',
        danger: true,
        onClick: () => onDelete(request.path || '', request.name || ''),
      },
    ],
  });

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDragStart?.(e, request);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e, request.path || '');
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave?.();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e, request.path || '');
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    contextMenuProps.onContextMenu(e);
  }, [contextMenuProps]);

  return (
    <div className="api-request-block">
      {contextMenu}
      <div
        className={`api-item ${isActive ? 'active' : ''} ${movedHighlightPath === request.path ? 'moved-highlight' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={onClick}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
      >
        <div className="api-request-expand-cell">
          {hasCases ? (
            <button
              type="button"
              className="api-request-expand"
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCases();
              }}
            >
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </button>
          ) : (
            <span className="api-request-expand-placeholder" />
          )}
        </div>
        <div className="api-item-main">
          <span className="api-method-col">
            <span
              className="api-method-tag"
              style={{ backgroundColor: `${mc}20`, color: mc }}
            >
              {method}
            </span>
          </span>
          <span className="api-name">{(request.name || '').replace(/\.curl$/i, '')}</span>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'add-case',
                icon: <PlusOutlined />,
                label: '新增用例',
                onClick: (e) => { e.domEvent.stopPropagation(); onAddCase(request.path || ''); },
              },
              { type: 'divider' as const },
              {
                key: 'copy',
                icon: <CopyOutlined />,
                label: '复制',
                onClick: (e) => { e.domEvent.stopPropagation(); onCopy(); },
              },
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名',
                onClick: (e) => { e.domEvent.stopPropagation(); onRename(); },
              },
              {
                key: 'delete',
                icon: <CloseOutlined />,
                label: '删除',
                danger: true,
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  onDelete(request.path || '', request.name || '');
                },
              },
            ],
          }}
          trigger={['click']}
        >
          <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
      {hasCases && isExpanded && (
        <div className="api-case-list">
          {caseKids.map((c) => (
            <CaseItem
              key={c.path}
              caseItem={c}
              isActive={sidebarHighlightedCasePath !== '' && sidebarHighlightedCasePath === c.path}
              movedHighlightPath={movedHighlightPath}
              onCaseClick={() => onCaseClick(c)}
              onDuplicateCase={() => onDuplicateCase(c.path!)}
              onRenameCase={() => onRenameCase(c.path!, c.name || '')}
              onDeleteCase={() => onDeleteCase(c.path!, c.name || '')}
            />
          ))}
        </div>
      )}
    </div>
  );
};
