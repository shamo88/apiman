import React, { useState, useCallback } from 'react';
import { Button, Dropdown, Input, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, FolderOutlined, RightOutlined, DownOutlined, MoreOutlined } from '@ant-design/icons';
import { ProjectTree } from '../../store';
import { getMethodColor, formatSidebarMethodLabel } from '../../constants/httpMethods';
import { ApiTreeItem } from './ApiTreeItem';
import { FolderNode } from './FolderNode';
import './ApiTree.css';

interface ApiTreeProps {
  tree: ProjectTree | null;
  collapsedFolders: Set<string>;
  expandedRequestPaths: Set<string>;
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
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  filterMethod: string;
  onFilterMethodChange: (method: string) => void;
}

export const ApiTree: React.FC<ApiTreeProps> = ({
  tree,
  collapsedFolders,
  expandedRequestPaths,
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
  searchKeyword,
  onSearchChange,
  filterMethod,
  onFilterMethodChange,
}) => {
  const [localSearch, setLocalSearch] = useState(searchKeyword);

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
      return (
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
          onRename={() => child.path && onRename('request', child.path, child.name)}
          onDelete={() => child.path && onDeleteRequest(child.path)}
          onCaseClick={onCaseClick}
          onDuplicateCase={onDuplicateCase}
          onRenameCase={onRenameCase}
          onDeleteCase={onDeleteCase}
        />
      );
    }
    return (
      <FolderNode
        key={child.path || child.id}
        folder={child}
        isCollapsed={child.path ? collapsedFolders.has(child.path) : false}
        expandedRequestPaths={expandedRequestPaths}
        sidebarHighlightedCasePath={sidebarHighlightedCasePath}
        movedHighlightPath={movedHighlightPath}
        onToggleFolder={() => child.path && onToggleFolder(child.path)}
        onToggleRequestCases={onToggleRequestCases}
        onRequestClick={onRequestClick}
        onCaseClick={onCaseClick}
        onAddRequest={() => child.path && onAddRequest(child.path)}
        onAddFolder={() => child.path && onAddFolder(child.path)}
        onRenameFolder={() => child.path && onRename('folder', child.path, child.name)}
        onDeleteFolder={() => child.path && onDeleteFolder(child.path)}
        onCopyRequest={onCopyRequest}
        onAddCase={onAddCase}
        onDuplicateCase={onDuplicateCase}
        onRenameCase={onRenameCase}
        onDeleteCase={onDeleteCase}
      />
    );
  };

  return (
    <div className="api-tree">
      <div className="api-tree-toolbar">
        <Input
          placeholder="搜索接口"
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 180 }}
          size="small"
        />
      </div>
      <div className="api-tree-content">
        {rootChildren.map(renderChild)}
      </div>
    </div>
  );
};
