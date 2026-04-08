import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Input, Spin, Empty } from 'antd';
import { SearchOutlined, FileOutlined, FolderOutlined, CloseCircleFilled } from '@ant-design/icons';
import { Modal } from 'antd';
import { useUIStore, useProjectStore, useWorkspaceStore, ProjectTree } from '../../store';
import { getMethodColor } from '../../constants/httpMethods';
import './modals.css';

interface SearchResult {
  projectId: string;
  projectName: string;
  node: ProjectTree;
  matchField: 'name' | 'url';
  matchText: string;
}

interface GroupedResults {
  projectId: string;
  projectName: string;
  results: SearchResult[];
}

const highlightText = (text: string, highlight: string): React.ReactNode => {
  if (!highlight) return text;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase()
      ? <span key={i} style={{ background: 'rgba(99, 102, 241, 0.3)', borderRadius: 2 }}>{part}</span>
      : part
  );
};

const searchTreeNodes = (
  tree: ProjectTree,
  keyword: RegExp,
  results: SearchResult[],
  projectId: string,
  projectName: string
): void => {
  if (tree.type === 'request') {
    const nameMatch = tree.name && keyword.test(tree.name);
    const urlMatch = tree.url && keyword.test(tree.url);

    if (nameMatch) {
      results.push({
        projectId,
        projectName,
        node: tree,
        matchField: 'name',
        matchText: tree.name || '',
      });
    }
    if (urlMatch) {
      results.push({
        projectId,
        projectName,
        node: tree,
        matchField: 'url',
        matchText: tree.url || '',
      });
    }
  }

  if (tree.children) {
    for (const child of tree.children) {
      searchTreeNodes(child, keyword, results, projectId, projectName);
    }
  }
};

export const GlobalSearchModal: React.FC = () => {
  const uiStore = useUIStore();
  const projectStore = useProjectStore();
  const workspaceStore = useWorkspaceStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const globalSearchVisible = uiStore.globalSearchVisible;

  const projects = projectStore.projects;
  const projectTrees = projectStore.projectTrees;

  useEffect(() => {
    if (globalSearchVisible) {
      setSearchKeyword('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [globalSearchVisible]);

  const performSearch = useCallback(async (keyword: string, regex: boolean) => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setLoading(true);

    try {
      let pattern: RegExp;
      if (regex) {
        try {
          pattern = new RegExp(keyword, 'i');
        } catch {
          setResults([]);
          setLoading(false);
          setIsSearching(false);
          return;
        }
      } else {
        pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }

      const allResults: SearchResult[] = [];

      const loadAndSearch = async () => {
        for (const project of projects) {
          let tree = projectTrees[project.id];
          if (!tree) {
            try {
              const { GetProjectTree } = await import('../../../wailsjs/go/main/App');
              tree = await GetProjectTree(project.id) as ProjectTree;
              projectStore.setProjectTree(project.id, tree);
            } catch (e) {
              console.error(`Failed to load project tree for ${project.name}:`, e);
              continue;
            }
          }

          if (tree) {
            searchTreeNodes(tree, pattern, allResults, project.id, project.name);
          }
        }
      };

      await loadAndSearch();

      allResults.sort((a, b) => {
        const aIsFolder = a.node.type === 'folder';
        const bIsFolder = b.node.type === 'folder';
        if (aIsFolder !== bIsFolder) return aIsFolder ? 1 : -1;
        return a.projectName.localeCompare(b.projectName);
      });

      setResults(allResults);
      setSelectedIndex(0);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [projects, projectTrees, projectStore]);

  useEffect(() => {
    if (searchKeyword) {
      const timeoutId = setTimeout(() => {
        performSearch(searchKeyword, isRegex);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [searchKeyword, isRegex, performSearch]);

  const groupedResults = useMemo((): GroupedResults[] => {
    const groups: Record<string, GroupedResults> = {};
    for (const result of results) {
      if (!groups[result.projectId]) {
        groups[result.projectId] = {
          projectId: result.projectId,
          projectName: result.projectName,
          results: [],
        };
      }
      groups[result.projectId].results.push(result);
    }
    return Object.values(groups);
  }, [results]);

  const flatResults = useMemo(() => {
    return groupedResults.flatMap(g => g.results);
  }, [groupedResults]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleResultClick(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      uiStore.closeGlobalSearch();
    }
  }, [flatResults, selectedIndex, uiStore]);

  useEffect(() => {
    if (listRef.current && flatResults.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, flatResults.length]);

  const handleResultClick = useCallback(async (result: SearchResult) => {
    const { node, projectId } = result;

    if (node.type !== 'request' || !node.path) return;

    uiStore.closeGlobalSearch();

    if (projectStore.activeTab !== projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        projectStore.openProjectTab(project);
      }
    }

    try {
      const { GetRequest } = await import('../../../wailsjs/go/main/App');
      const request = await GetRequest(node.path);

      const tab = {
        id: node.path,
        title: request.name || node.name,
        path: node.path,
      };

      workspaceStore.openRequestTab(projectId, tab);
      workspaceStore.setCurrentRequest(projectId, request);

      const { apiConfigFromRequest } = await import('../../utils');
      const cfg = apiConfigFromRequest(request, request.name || '');
      workspaceStore.setWorkspaceState(projectId, {
        interfaceApiConfig: { ...cfg },
        requestEditorSurface: 'interface',
      });
      workspaceStore.setApiConfig(projectId, {
        ...cfg,
        preScripts: request.pre_scripts || [],
        postScripts: request.post_scripts || [],
      });
    } catch (e) {
      console.error('Failed to open request:', e);
    }
  }, [projects, projectStore, workspaceStore, uiStore]);

  const handleClose = () => {
    uiStore.closeGlobalSearch();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (flatResults[selectedIndex]) {
        handleResultClick(flatResults[selectedIndex]);
      }
    }
    e.stopPropagation();
  };

  return (
    <Modal
      title="全局搜索"
      open={globalSearchVisible}
      onCancel={handleClose}
      footer={null}
      width={680}
      className="global-search-modal"
      destroyOnClose
      maskClosable
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Input
            ref={inputRef as React.Ref<any>}
            placeholder="搜索 API 名称、URL... (支持正则表达式)"
            prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
            suffix={
              searchKeyword && (
                <CloseCircleFilled
                  style={{ color: '#8b8b9a', cursor: 'pointer' }}
                  onClick={() => setSearchKeyword('')}
                />
              )
            }
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleInputKeyDown}
            allowClear
            autoFocus
            size="large"
          />
        </div>

        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            使用正则表达式
          </label>
          <span style={{ marginLeft: 16 }}>
            共找到 {results.length} 个匹配结果
            {isSearching && <Spin size="small" style={{ marginLeft: 8 }} />}
          </span>
        </div>

        <div
          ref={listRef}
          style={{
            maxHeight: 400,
            overflow: 'auto',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}
        >
          {results.length === 0 && searchKeyword && !loading && (
            <Empty
              description="未找到匹配的请求"
              style={{ padding: '40px 0' }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}

          {results.length === 0 && !searchKeyword && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              输入关键词开始搜索
            </div>
          )}

          {groupedResults.map((group) => (
            <div key={group.projectId}>
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {group.projectName}
              </div>
              {group.results.map((result) => {
                const globalIndex = flatResults.indexOf(result);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <div
                    key={`${result.projectId}-${result.node.path}-${result.matchField}`}
                    data-index={globalIndex}
                    onClick={() => handleResultClick(result)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    {result.node.method ? (
                      <span
                        style={{
                          color: getMethodColor(result.node.method),
                          fontWeight: 600,
                          fontSize: 12,
                          minWidth: 50,
                        }}
                      >
                        {result.node.method}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', width: 50 }}>
                        {result.node.type === 'folder' ? <FolderOutlined /> : <FileOutlined />}
                      </span>
                    )}

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.matchField === 'name'
                          ? highlightText(result.node.name || '', searchKeyword)
                          : result.node.name}
                      </div>
                      {result.matchField === 'url' && result.node.url && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {highlightText(result.node.url, searchKeyword)}
                        </div>
                      )}
                      {result.matchField === 'name' && result.node.url && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {result.node.url}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            gap: 16,
          }}
        >
          <span>↑↓ 导航</span>
          <span>Enter 打开</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </Modal>
  );
};
