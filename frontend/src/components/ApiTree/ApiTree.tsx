import React, { useCallback, DragEvent } from 'react';
import { Empty, Modal } from 'antd';
import { ProjectTree } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { getMethodColor, formatSidebarMethodLabel } from '../../constants/httpMethods';
import { ApiTreeItem } from './ApiTreeItem';
import { FolderNode } from './FolderNode';
import './ApiTree.css';

interface ApiTreeProps {
  tree: ProjectTree | null;
  collapsedFolders: Set<string>;
  expandedRequestPaths: Set<string>;
  activeRequestPath: string;
  sidebarHighlightedCasePath: string;
  movedHighlightPath: string | null;
  onToggleFolder: (folderPath: string) => void;
  onToggleRequestCases: (requestPath: string) => void;
  onRequestClick: (request: ProjectTree) => void;
  onCaseClick: (caseItem: ProjectTree) => void;
  onAddRequest: (folderPath: string) => void;
  onAddFolder: (folderPath: string) => void;
  onRename: (type: 'request' | 'folder', path: string, currentName: string) => void;
  onDeleteRequest: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onCopyRequest: (path: string) => void;
  onAddCase: (requestPath: string) => void;
  onDuplicateCase: (casePath: string) => void;
  onRenameCase: (casePath: string, currentName: string) => void;
  onDeleteCase: (casePath: string) => void;
  onConfigureFolderScripts?: (folderPath: string, folderName: string) => void;
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  filterMethod: string;
  onFilterMethodChange: (method: string) => void;
  onDragStart?: (e: DragEvent, node: ProjectTree) => void;
  onDragEnter?: (e: DragEvent, targetPath: string, beforeId: string) => void;
  onDragOver?: (e: DragEvent, targetPath: string, beforeId: string) => void;
  onDragLeave?: (e: DragEvent, targetPath: string) => void;
  onDrop?: (e: DragEvent, targetPath: string, beforeId: string) => void;
}

export const ApiTree: React.FC<ApiTreeProps> = ({
  tree,
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
  onDeleteRequest,
  onDeleteFolder,
  onCopyRequest,
  onAddCase,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
  onConfigureFolderScripts,
  searchKeyword,
  onSearchChange,
  filterMethod,
  onFilterMethodChange,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const { dropTargetFolderPath, draggingNode } = useUIStore();

  // 统一包装删除操作，添加二次确认
  const withDeleteConfirm = useCallback((typeLabel: string, name: string, onOk: () => void) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除${typeLabel}「${name}」吗？${typeLabel === '文件夹' ? '文件夹内的所有内容都将被删除。' : ''}`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk,
    });
  }, []);

  const handleDeleteRequest = useCallback((path: string, name: string) => {
    withDeleteConfirm('请求', name, () => onDeleteRequest(path));
  }, [onDeleteRequest, withDeleteConfirm]);

  const handleDeleteFolder = useCallback((path: string, name: string) => {
    withDeleteConfirm('文件夹', name, () => onDeleteFolder(path));
  }, [onDeleteFolder, withDeleteConfirm]);

  const handleDeleteCase = useCallback((casePath: string, caseName: string) => {
    withDeleteConfirm('用例', caseName, () => onDeleteCase(casePath));
  }, [onDeleteCase, withDeleteConfirm]);

  const filterTreeNodes = useCallback((node: ProjectTree | null, keyword: string, method: string): ProjectTree | null => {
    if (!node) return null;
    const normalizedKeyword = keyword.trim().toLowerCase();
    const noSearchOrMethodFilter = normalizedKeyword === '' && method === 'ALL';

    if (node.type === 'case') {
      return node;
    }

    if (node.type === 'request') {
      const nameLower = (node.name || '').toLowerCase();
      const urlLower = (node.url || '').toLowerCase();
      const matchName = normalizedKeyword === '' || nameLower.includes(normalizedKeyword);
      const matchURL = normalizedKeyword === '' || urlLower.includes(normalizedKeyword);
      const matchMethod = method === 'ALL' || node.method === method;
      const caseChildren = (node.children || []).filter((c): c is ProjectTree => c.type === 'case');
      const caseNameMatch = normalizedKeyword === '' || caseChildren.some((c) => (c.name || '').toLowerCase().includes(normalizedKeyword));

      if ((matchName || matchURL || caseNameMatch) && matchMethod) {
        let nextChildren = node.children;
        if (normalizedKeyword !== '' && !matchName && !matchURL && caseNameMatch) {
          nextChildren = caseChildren.filter((c) => (c.name || '').toLowerCase().includes(normalizedKeyword));
        }
        return { ...node, children: nextChildren };
      }
      return null;
    }

    if (node.type === 'folder') {
      const children = node.children ?? [];
      const filteredChildren = children
        .map(child => filterTreeNodes(child, keyword, method))
        .filter((child): child is ProjectTree => child !== null);

      if (filteredChildren.length > 0 || noSearchOrMethodFilter) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }

    if (node.type === 'project') {
      const children = node.children ?? [];
      const filteredChildren = children
        .map(child => filterTreeNodes(child, keyword, method))
        .filter((child): child is ProjectTree => child !== null);

      return { ...node, children: filteredChildren };
    }

    return node;
  }, []);

  const filteredTree = filterTreeNodes(tree, searchKeyword, filterMethod);

  if (!filteredTree || !filteredTree.children || filteredTree.children.length === 0) {
    return (
      <div className="api-tree-empty">
        <Empty description="没有找到匹配的接口" />
      </div>
    );
  }

  const rootChildren = (filteredTree.children || []).filter(
    (child: ProjectTree) => child.type === 'folder' || child.type === 'request'
  );

  const renderChild = (child: ProjectTree) => {
    if (child.type === 'request') {
      // Only suppress request active state if the selected case BELONGS to this request
      const caseChildren = (child.children || []).filter((c): c is ProjectTree => c.type === 'case');
      const selectedCaseBelongsToThisRequest = caseChildren.some(c => c.path === sidebarHighlightedCasePath);
      const isActive = child.path === activeRequestPath && !selectedCaseBelongsToThisRequest;

      return (
        <ApiTreeItem
          request={child}
          isExpanded={child.path ? expandedRequestPaths.has(child.path) : false}
          isActive={isActive}
          sidebarHighlightedCasePath={sidebarHighlightedCasePath}
          movedHighlightPath={movedHighlightPath}
          onToggleCases={() => child.path && onToggleRequestCases(child.path)}
          onClick={() => onRequestClick(child)}
          onAddCase={() => child.path && onAddCase(child.path)}
          onCopy={() => child.path && onCopyRequest(child.path)}
          onRename={() => child.path && onRename('request', child.path, child.name)}
          onDelete={(path, name) => child.path && handleDeleteRequest(path, name)}
          onCaseClick={onCaseClick}
          onDuplicateCase={onDuplicateCase}
          onRenameCase={onRenameCase}
          onDeleteCase={(path, name) => handleDeleteCase(path, name)}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      );
    }
    return (
      <FolderNode
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
        onAddRequest={(path) => child.path && onAddRequest(path)}
        onAddFolder={(path) => child.path && onAddFolder(path)}
        onRename={onRename}
        onRenameFolder={() => child.path && onRename('folder', child.path, child.name)}
        onDeleteFolder={(path, name) => child.path && handleDeleteFolder(path, name)}
        onDeleteRequest={onDeleteRequest}
        onCopyRequest={onCopyRequest}
        onAddCase={onAddCase}
        onDuplicateCase={onDuplicateCase}
        onRenameCase={onRenameCase}
        onDeleteCase={(path, name) => handleDeleteCase(path, name)}
        onConfigureFolderScripts={onConfigureFolderScripts}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
    );
  };

  return (
    <div className="api-tree">
      <div
        className={`api-tree-content ${draggingNode && !dropTargetFolderPath ? 'drop-zone-active' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // For root: targetPath is '' (root), beforeId is '' (append at end)
          onDragEnter?.(e, '', '');
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOver?.(e, '', '');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragLeave?.(e, '');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop?.(e, '', '');
        }}
      >
        {rootChildren.map((child) => (
          <div key={child.path || child.id} className="api-root-sibling">
            {renderChild(child)}
          </div>
        ))}
      </div>
    </div>
  );
};
