import React, { DragEvent, useCallback } from 'react';
import { Dropdown } from 'antd';
import { FolderOutlined, RightOutlined, DownOutlined, PlusOutlined, MoreOutlined, EditOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { ProjectTree } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { ApiTreeItem } from './ApiTreeItem';
import { ContextMenu, useContextMenu } from '../ContextMenu';
import './ApiTree.css';

interface FolderNodeProps {
  folder: ProjectTree;
  isCollapsed: boolean;
  collapsedFolders: Set<string>;
  expandedRequestPaths: Set<string>;
  activeRequestPath: string;
  sidebarHighlightedCasePath: string;
  movedHighlightPath: string | null;
  onToggleFolder: (folderPath: string) => void;
  onToggleRequestCases: (requestPath: string) => void;
  onRequestClick: (request: ProjectTree) => void;
  onCaseClick: (c: ProjectTree) => void;
  onAddRequest: (parentPath: string) => void;
  onAddFolder: (parentPath: string) => void;
  onRename: (type: 'request' | 'folder', path: string, currentName: string) => void;
  onRenameFolder: (path: string, currentName: string) => void;
  onDeleteFolder: (path: string, name: string) => void;
  onDeleteRequest: (path: string) => void;
  onCopyRequest: (path: string) => void;
  onAddCase: (requestPath: string) => void;
  onDuplicateCase: (casePath: string) => void;
  onRenameCase: (casePath: string, currentName: string) => void;
  onDeleteCase: (casePath: string, name: string) => void;
  onConfigureFolderScripts?: (folderPath: string, folderName: string) => void;
  onDragStart?: (e: DragEvent, node: ProjectTree) => void;
  onDragEnter?: (e: DragEvent, targetPath: string, beforeId: string) => void;
  onDragOver?: (e: DragEvent, targetPath: string, beforeId: string) => void;
  onDragLeave?: (e: DragEvent, targetPath: string) => void;
  onDrop?: (e: DragEvent, targetPath: string, beforeId: string) => void;
}

export const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  isCollapsed,
  collapsedFolders,
  expandedRequestPaths,
  activeRequestPath,
  sidebarHighlightedCasePath,
  movedHighlightPath,
  onToggleFolder,
  onToggleRequestCases,
  onRequestClick,
  onCaseClick,
  onAddRequest,
  onAddFolder,
  onRename,
  onRenameFolder,
  onDeleteFolder,
  onDeleteRequest,
  onCopyRequest,
  onAddCase,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
  onConfigureFolderScripts,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const { dropTargetFolderPath } = useUIStore();
  const { toggleFolderCollapse } = useProjectStore();
  const folderPath = folder.path || '';
  const folderChildren = folder.children || [];
  const orderedKids = folderChildren.filter((child: ProjectTree) => child.type === 'folder' || child.type === 'request');
  const totalCount = folderChildren.length;
  const isDropTarget = dropTargetFolderPath === folderPath;

  // Right-click context menu for folder
  const { contextMenuProps, contextMenu } = useContextMenu({
    items: [
      {
        key: 'add-request',
        icon: <PlusOutlined />,
        label: '新建请求',
        onClick: () => onAddRequest(folderPath),
      },
      {
        key: 'add-folder',
        icon: <FolderOutlined />,
        label: '新建文件夹',
        onClick: () => onAddFolder(folderPath),
      },
      { type: 'divider' as const },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: () => onRenameFolder(folderPath, folder.name),
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <CloseOutlined />,
        label: '删除文件夹',
        danger: true,
        onClick: () => onDeleteFolder(folderPath, folder.name),
      },
    ],
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    contextMenuProps.onContextMenu(e);
  }, [contextMenuProps]);

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation();
    onDragStart?.(e, folder);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // For folder header: target is the folder itself, beforeId is '' (append at end)
    onDragEnter?.(e, folderPath, '');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e, folderPath, '');
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave?.(e, folderPath);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e, folderPath, '');
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigureFolderScripts?.(folderPath, folder.name);
  };

  // 点击箭头图标展开/收起文件夹
  const handleToggleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderCollapse(folderPath);
  }, [folderPath, toggleFolderCollapse]);

  // Helper to check if the selected case BELONGS to a specific request
  const selectedCaseBelongsToRequest = (request: ProjectTree): boolean => {
    const caseChildren = (request.children || []).filter((c): c is ProjectTree => c.type === 'case');
    return caseChildren.some(c => c.path === sidebarHighlightedCasePath);
  };

  return (
    <div className="api-folder" id={`folder-${folderPath}`}>
      {contextMenu}
      <div
        className={`api-folder-header ${movedHighlightPath === (folder.path || folder.id) ? 'moved-highlight' : ''} ${isDropTarget ? 'drop-target-active' : ''}`}
        onClick={handleHeaderClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
      >
        <span className="folder-toggle-icon" onClick={handleToggleIconClick}>
          {isCollapsed ? <RightOutlined /> : <DownOutlined />}
        </span>
        <FolderOutlined className="folder-icon" />
        <span className="folder-name">{folder.name}</span>
        <span className="folder-count">{totalCount}</span>
        <Dropdown
          menu={{
            items: [
              {
                key: 'add-request',
                icon: <PlusOutlined />,
                label: '新建请求',
                onClick: (e) => { e.domEvent.stopPropagation(); onAddRequest(folderPath); },
              },
              {
                key: 'add-folder',
                icon: <FolderOutlined />,
                label: '新建文件夹',
                onClick: (e) => { e.domEvent.stopPropagation(); onAddFolder(folderPath); },
              },
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名',
                onClick: (e) => { e.domEvent.stopPropagation(); onRenameFolder(folderPath, folder.name); },
              },
              { type: 'divider' as const },
              {
                key: 'delete',
                icon: <CloseOutlined />,
                label: '删除文件夹',
                danger: true,
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  onDeleteFolder(folderPath, folder.name);
                },
              },
            ],
          }}
          trigger={['hover']}
        >
          <span className="folder-action-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </span>
        </Dropdown>
      </div>

      {!isCollapsed && orderedKids.length > 0 && (
        <div
          className="api-folder-content"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 当拖拽到内容区域时，目标就是当前文件夹
            onDragEnter?.(e, folderPath, '');
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragOver?.(e, folderPath, '');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragLeave?.(e, folderPath);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDrop?.(e, folderPath, '');
          }}
        >
          {orderedKids.map((child: ProjectTree) =>
            child.type === 'request' ? (
              <ApiTreeItem
                key={child.path || child.id}
                request={child}
                isExpanded={child.path ? expandedRequestPaths.has(child.path) : false}
                isActive={child.path === activeRequestPath && !selectedCaseBelongsToRequest(child)}
                sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                movedHighlightPath={movedHighlightPath}
                onToggleCases={() => child.path && onToggleRequestCases(child.path)}
                onClick={() => onRequestClick(child)}
                onAddCase={() => child.path && onAddCase(child.path)}
                onCopy={() => child.path && onCopyRequest(child.path)}
                onRename={() => child.path && onRename('request', child.path, child.name)}
                onDelete={() => child.path && onDeleteRequest(child.path)}
                onCaseClick={onCaseClick}
                onDuplicateCase={onDuplicateCase}
                onRenameCase={onRenameCase}
                onDeleteCase={(path, name) => onDeleteCase(path, name)}
                onDragStart={onDragStart}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ) : (
              <FolderNode
                key={child.path || child.id}
                folder={child}
                collapsedFolders={collapsedFolders}
                isCollapsed={child.path ? collapsedFolders.has(child.path) : false}
                expandedRequestPaths={expandedRequestPaths}
                activeRequestPath={activeRequestPath}
                sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                movedHighlightPath={movedHighlightPath}
                onToggleFolder={() => child.path && onToggleFolder(child.path)}
                onToggleRequestCases={onToggleRequestCases}
                onRequestClick={onRequestClick}
                onCaseClick={onCaseClick}
                onAddRequest={onAddRequest}
                onAddFolder={onAddFolder}
                onRename={onRename}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onDeleteRequest={onDeleteRequest}
                onCopyRequest={onCopyRequest}
                onAddCase={onAddCase}
                onDuplicateCase={onDuplicateCase}
                onRenameCase={onRenameCase}
                onDeleteCase={onDeleteCase}
                onConfigureFolderScripts={onConfigureFolderScripts}
                onDragStart={onDragStart}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
