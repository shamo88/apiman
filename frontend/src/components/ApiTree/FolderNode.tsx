import React from 'react';
import { Dropdown } from 'antd';
import { FolderOutlined, RightOutlined, DownOutlined, PlusOutlined, MoreOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { ProjectTree } from '../../store';
import { ApiTreeItem } from './ApiTreeItem';
import './ApiTree.css';

interface FolderNodeProps {
  folder: ProjectTree;
  isCollapsed: boolean;
  expandedRequestPaths: Set<string>;
  sidebarHighlightedCasePath: string;
  movedHighlightPath: string | null;
  onToggleFolder: () => void;
  onToggleRequestCases: (requestPath: string) => void;
  onRequestClick: (request: ProjectTree) => void;
  onCaseClick: (c: ProjectTree) => void;
  onAddRequest: () => void;
  onAddFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
  onCopyRequest: (path: string) => void;
  onAddCase: (requestPath: string) => void;
  onDuplicateCase: (casePath: string) => void;
  onRenameCase: (casePath: string, currentName: string) => void;
  onDeleteCase: (casePath: string) => void;
}

export const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  isCollapsed,
  expandedRequestPaths,
  sidebarHighlightedCasePath,
  movedHighlightPath,
  onToggleFolder,
  onToggleRequestCases,
  onRequestClick,
  onCaseClick,
  onAddRequest,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onCopyRequest,
  onAddCase,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
}) => {
  const folderChildren = folder.children || [];
  const orderedKids = folderChildren.filter((child: ProjectTree) => child.type === 'folder' || child.type === 'request');
  const totalCount = folderChildren.length;

  return (
    <div className="api-folder">
      <div
        className={`api-folder-header ${movedHighlightPath === (folder.path || folder.id) ? 'moved-highlight' : ''}`}
        onClick={onToggleFolder}
      >
        <span className="folder-toggle-icon">
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
                onClick: (e) => { e.domEvent.stopPropagation(); onAddRequest(); },
              },
              {
                key: 'add-folder',
                icon: <FolderOutlined />,
                label: '新建文件夹',
                onClick: (e) => { e.domEvent.stopPropagation(); onAddFolder(); },
              },
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名',
                onClick: (e) => { e.domEvent.stopPropagation(); onRenameFolder(); },
              },
              { type: 'divider' as const },
              {
                key: 'delete',
                icon: <CloseOutlined />,
                label: '删除文件夹',
                danger: true,
                onClick: (e) => { e.domEvent.stopPropagation(); onDeleteFolder(); },
              },
            ],
          }}
          trigger={['click']}
        >
          <button className="folder-action-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>

      {!isCollapsed && orderedKids.length > 0 && (
        <div className="api-folder-content">
          {orderedKids.map((child: ProjectTree) =>
            child.type === 'request' ? (
              <ApiTreeItem
                key={child.path || child.id}
                request={child}
                isExpanded={child.path ? expandedRequestPaths.has(child.path) : false}
                isActive={false}
                sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                movedHighlightPath={movedHighlightPath}
                onToggleCases={() => child.path && onToggleRequestCases(child.path)}
                onClick={() => onRequestClick(child)}
                onAddCase={() => child.path && onAddCase(child.path)}
                onCopy={() => child.path && onCopyRequest(child.path)}
                onRename={() => child.path && onRenameCase(child.path, child.name)}
                onDelete={() => child.path && onDeleteCase(child.path)}
                onCaseClick={onCaseClick}
                onDuplicateCase={onDuplicateCase}
                onRenameCase={onRenameCase}
                onDeleteCase={onDeleteCase}
              />
            ) : (
              <FolderNode
                key={child.path || child.id}
                folder={child}
                isCollapsed={child.path ? false : true}
                expandedRequestPaths={expandedRequestPaths}
                sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                movedHighlightPath={movedHighlightPath}
                onToggleFolder={() => {}}
                onToggleRequestCases={onToggleRequestCases}
                onRequestClick={onRequestClick}
                onCaseClick={onCaseClick}
                onAddRequest={() => {}}
                onAddFolder={() => {}}
                onRenameFolder={() => {}}
                onDeleteFolder={() => {}}
                onCopyRequest={onCopyRequest}
                onAddCase={onAddCase}
                onDuplicateCase={onDuplicateCase}
                onRenameCase={onRenameCase}
                onDeleteCase={onDeleteCase}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
