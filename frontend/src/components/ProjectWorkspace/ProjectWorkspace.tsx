import React, { useState, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { Button, Dropdown, Input, message, Select, Space, Tabs } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileOutlined, FolderOutlined, PlusOutlined, SearchOutlined, CodeOutlined, QuestionCircleOutlined, EditOutlined, DeleteOutlined, CopyOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';

import { ApiTree } from '../ApiTree';
import { RequestPanel } from '../RequestPanel';
import { ResponsePanel } from '../ResponsePanel';
import { EnvironmentEditor } from './EnvironmentEditor';
import { EnvironmentListItem } from './EnvironmentListItem';
import { ScriptEditor } from './ScriptEditor';
import { ProjectScriptPanel } from './ProjectScriptPanel';
import { FolderScriptPanel } from './FolderScriptPanel';
import { ResizeHandle } from './ResizeHandle';
import { ResizeSplitter } from './ResizeSplitter';
import { CurlResponse } from '../../types';
import { GetProjectScriptsResult } from '../../../wailsjs/go/main/App';
import { Environment, ProjectScript, useEnvironmentStore, useScriptStore, EnvironmentVariableRow, ProjectTree } from '../../store';
import { useWorkspace, useWorkspaceHandlers, useEnvironments, useScripts } from '../../hooks';
import { useUIStore, useWorkspaceStore, useProjectStore } from '../../store';
import './ProjectWorkspace.css';

interface ProjectWorkspaceProps {
  projectId: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  const uiStore = useUIStore();
  const workspaceStore = useWorkspaceStore();
  const projectStore = useProjectStore();
  const { sidebarWidth, setSidebarWidth } = uiStore;
  // 四个模块的折叠状态
  const [collapsedModules, setCollapsedModules] = useState({
    apis: false,
    environments: true,
    scripts: true,
    projectSettings: true,
  });
  const [activeModule, setActiveModule] = useState<'apis' | 'environments' | 'scripts' | 'project-settings'>('apis');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [searchVersion, setSearchVersion] = useState(0);
  // 响应面板高度 - 不缓存，每次重新计算，默认占50%
  const [responseHeight, setResponseHeight] = useState(() => {
    const screenHeight = window.innerHeight;
    const titleBarHeight = 40;
    const tabsRowHeight = 40;
    const splitterHeight = 6;
    const otherHeight = 100; // 底部边距等
    const availableHeight = screenHeight - titleBarHeight - tabsRowHeight - splitterHeight - otherHeight;
    return Math.floor(availableHeight / 2); // 各占50%
  });

  // 监听窗口变化，重新计算高度
  useEffect(() => {
    const handleResize = () => {
      const screenHeight = window.innerHeight;
      const titleBarHeight = 40;
      const tabsRowHeight = 40;
      const splitterHeight = 6;
      const otherHeight = 100;
      const availableHeight = screenHeight - titleBarHeight - tabsRowHeight - splitterHeight - otherHeight;
      setResponseHeight(Math.floor(availableHeight / 2));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [selectedFolder, setSelectedFolder] = useState<{ path: string; name: string; preScripts: string[]; postScripts: string[] } | null>(null);
  const [projectScripts, setProjectScripts] = useState<{ preScripts: string[]; postScripts: string[] }>({ preScripts: [], postScripts: [] });

  const { workspace, projectTree } = useWorkspace(projectId);
  const { collapsedFolders } = projectStore;
  const { formattedResponse, executing } = workspaceStore;

  // Environment store state
  const {
    environmentFormName,
    environmentFormVariables,
    setEnvironmentFormName,
    setEnvironmentFormVariables,
    openEnvironmentEditor,
    openCreateEnvironmentEditor,
    resetEnvironmentEditor,
    rowsToEnvironmentVariables,
    editingEnvironmentId,
    setEditingEnvironmentId,
  } = useEnvironmentStore();

  // Script store state
  const {
    scriptFormName,
    scriptFormDescription,
    scriptFormContent,
    setScriptFormName,
    setScriptFormDescription,
    setScriptFormContent,
    selectScript,
    resetScriptForm,
    editingScriptId,
  } = useScriptStore();

  // Load project scripts when project settings tab is opened
  useEffect(() => {
    if (activeModule === 'project-settings' && projectId) {
      console.log('[DEBUG] Loading project scripts for:', projectId);
      GetProjectScriptsResult(projectId).then((result: any) => {
        console.log('[DEBUG] GetProjectScriptsResult result:', JSON.stringify(result, null, 2));
        if (result) {
          setProjectScripts({ preScripts: result.preScripts || [], postScripts: result.postScripts || [] });
        } else {
          console.log('[DEBUG] GetProjectScriptsResult returned null, setting empty');
          setProjectScripts({ preScripts: [], postScripts: [] });
        }
      }).catch((err: any) => {
        console.error('[DEBUG] GetProjectScriptsResult error:', err);
        setProjectScripts({ preScripts: [], postScripts: [] });
      });
    }
  }, [activeModule, projectId]);

  // Handle folder script configuration
  const handleConfigureFolderScripts = useCallback(async (folderPath: string, folderName: string) => {
    try {
      const { GetFolderScriptsResult } = await import('../../../wailsjs/go/main/App');
      const result: any = await GetFolderScriptsResult(folderPath);
      if (result) {
        setSelectedFolder({ path: folderPath, name: folderName, preScripts: result.preScripts || [], postScripts: result.postScripts || [] });
      } else {
        setSelectedFolder({ path: folderPath, name: folderName, preScripts: [], postScripts: [] });
      }
    } catch (error) {
      console.error('Failed to load folder scripts:', error);
      setSelectedFolder({ path: folderPath, name: folderName, preScripts: [], postScripts: [] });
    }
  }, []);

  const { environments, loadEnvironments, createEnvironment, updateEnvironment, deleteEnvironment } = useEnvironments();
  const { scripts, loadScripts, createScript, updateScript, deleteScript } = useScripts();

  // Load data when projectId changes
  useEffect(() => {
    if (projectId) {
      loadEnvironments(projectId);
    }
  }, [projectId, loadEnvironments]);

  // Load script list when scripts tab or project settings is opened
  useEffect(() => {
    if ((activeModule === 'scripts' || activeModule === 'project-settings') && projectId) {
      loadScripts(projectId);
    }
  }, [activeModule, projectId, loadScripts]);

  const {
    handleTreeItemClick,
    handleCaseClick,
    handleExecuteRequest,
    handleSaveRequest,
    handleSaveCase,
    handleDeleteRequest,
    handleCopyRequest,
    handleRename,
    handleDeleteFolder,
    handleMoveRequest,
    handleMoveFolder,
    handleDuplicateCase,
    handleRenameCase,
    handleDeleteCase,
    handleRequestTabChange,
    handleCloseRequestTab,
    handleCreateFolder,
    handleToggleFolder,
    handleToggleRequestCases,
  } = useWorkspaceHandlers(projectId);

  const handleUpdateWorkspace = (updates: any) => {
    workspaceStore.setWorkspaceState(projectId, updates);
  };

  // Environment handlers - 带模块激活
  const handleOpenEnvironmentEditor = useCallback((env: Environment) => {
    activateModule('environments');
    openEnvironmentEditor(env);
  }, [openEnvironmentEditor]);

  const handleCreateEnvironment = useCallback(() => {
    openCreateEnvironmentEditor(environments.length);
    setCollapsedModules(prev => ({ ...prev, environments: false }));
    setActiveModule('environments');
  }, [openCreateEnvironmentEditor, environments.length]);

  const handleSaveEnvironment = useCallback(async () => {
    if (!projectId) {
      message.warning('请先打开项目');
      return;
    }
    const name = environmentFormName.trim();
    if (!name) {
      message.warning('请输入环境名称');
      return;
    }
    const variables = rowsToEnvironmentVariables(environmentFormVariables);
    try {
      if (editingEnvironmentId) {
        await updateEnvironment(projectId, editingEnvironmentId, name, variables);
        setEditingEnvironmentId('');
        await loadEnvironments(projectId);
      } else {
        await createEnvironment(projectId, name, variables);
        setEditingEnvironmentId('');
        await loadEnvironments(projectId);
      }
    } catch (error) {
      console.error('Failed to save environment:', error);
    }
  }, [projectId, editingEnvironmentId, environmentFormName, environmentFormVariables, createEnvironment, updateEnvironment, rowsToEnvironmentVariables, setEditingEnvironmentId, loadEnvironments]);

  const handleDeleteEnvironment = useCallback(async () => {
    if (!editingEnvironmentId) return;
    try {
      await deleteEnvironment(projectId, editingEnvironmentId);
      resetEnvironmentEditor();
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  }, [projectId, editingEnvironmentId, deleteEnvironment, resetEnvironmentEditor]);

  const handleDeleteEnvironmentById = useCallback(async (envId: string) => {
    try {
      await deleteEnvironment(projectId, envId);
      resetEnvironmentEditor();
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  }, [projectId, deleteEnvironment, resetEnvironmentEditor]);

  const handleDuplicateEnvironment = useCallback(async (env: Environment) => {
    try {
      await createEnvironment(projectId, `${env.name} (副本)`, env.variables);
      await loadEnvironments(projectId);
    } catch (error) {
      console.error('Failed to duplicate environment:', error);
    }
  }, [projectId, createEnvironment, loadEnvironments]);

  // Script handlers - 带模块激活
  const handleSelectScript = useCallback((script: ProjectScript) => {
    activateModule('scripts');
    selectScript(script);
  }, [selectScript]);

  const handleCreateScript = useCallback(async () => {
    activateModule('scripts');
    const scriptName = `脚本${scripts.length + 1}`;
    try {
      const created = await createScript(projectId, scriptName, '', '// 在这里编写 JavaScript 脚本\n');
      await loadScripts(projectId);
      selectScript(created);
    } catch (error) {
      console.error('Failed to create script:', error);
    }
  }, [projectId, scripts.length, createScript, loadScripts, selectScript]);

  // ApiTree handlers - 带模块激活
  const handleApiTreeRequestClick = useCallback((treeNode: ProjectTree) => {
    activateModule('apis');
    handleTreeItemClick(treeNode);
  }, [handleTreeItemClick]);

  const handleApiTreeCaseClick = useCallback((caseNode: ProjectTree) => {
    activateModule('apis');
    handleCaseClick(caseNode);
  }, [handleCaseClick]);

  const handleSaveScript = useCallback(async () => {
    if (!scriptFormName.trim()) return;
    try {
      if (editingScriptId) {
        await updateScript(projectId, editingScriptId, scriptFormName.trim(), scriptFormDescription.trim(), scriptFormContent);
      } else {
        await createScript(projectId, scriptFormName.trim(), scriptFormDescription.trim(), scriptFormContent);
      }
    } catch (error) {
      console.error('Failed to save script:', error);
    }
  }, [projectId, editingScriptId, scriptFormName, scriptFormDescription, scriptFormContent, createScript, updateScript]);

  const handleDeleteScript = useCallback(async () => {
    if (!editingScriptId) return;
    try {
      await deleteScript(projectId, editingScriptId);
      resetScriptForm();
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  }, [projectId, editingScriptId, deleteScript, resetScriptForm]);

  const handleAddRequest = (parentPath: string = '') => {
    uiStore.openCreateRequestModal(parentPath);
  };

  const handleAddFolder = (parentPath: string = '') => {
    uiStore.openCreateFolderModal(parentPath);
  };

  const handleAddCase = (requestPath: string) => {
    uiStore.openAddCaseModal(requestPath);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setSearchVersion(v => v + 1);
  };

  const handleSidebarResize = (deltaX: number) => {
    setSidebarWidth(Math.min(500, Math.max(200, sidebarWidth + deltaX)));
  };

  const handleSidebarResizeEnd = () => {
  };

  const handleResponseHeightChange = (height: number) => {
    setResponseHeight(height);
  };

  // 拖拽处理函数
  // 使用 timer 来延迟清除 drop target，避免在拖拽到兄弟节点时闪烁
  const dropTargetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDropTargetWithDelay = useCallback(() => {
    dropTargetTimerRef.current = setTimeout(() => {
      uiStore.setDropTarget(null);
      uiStore.setDropBeforeId(null);
    }, 100);
  }, [uiStore]);

  const cancelDropTargetTimer = useCallback(() => {
    if (dropTargetTimerRef.current) {
      clearTimeout(dropTargetTimerRef.current);
      dropTargetTimerRef.current = null;
    }
  }, []);

  const handleDragStart = useCallback((e: DragEvent, node: ProjectTree) => {
    cancelDropTargetTimer();
    uiStore.setDraggingNode({ type: node.type as 'request' | 'folder', path: node.path || '' });
    uiStore.setDropTarget(null);
    uiStore.setDropBeforeId(null);
  }, [uiStore, cancelDropTargetTimer]);

  // 当拖拽进入一个元素时，设置 drop target 并取消 pending 的清除
  const handleDragEnter = useCallback((e: DragEvent, targetPath: string, beforeId: string = '') => {
    e.preventDefault();
    e.stopPropagation();
    cancelDropTargetTimer();
    uiStore.setDropTarget(targetPath);
    uiStore.setDropBeforeId(beforeId);
  }, [uiStore, cancelDropTargetTimer]);

  const handleDragOver = useCallback((e: DragEvent, targetPath: string, beforeId: string = '') => {
    e.preventDefault();
    uiStore.setDropTarget(targetPath);
    uiStore.setDropBeforeId(beforeId);
  }, [uiStore]);

  // 延迟清除 drop target，因为 dragLeave 会在 dragEnter 之前触发（当拖拽到兄弟节点时）
  // 但是：如果 relatedTarget 为 null（移动到空白区域），立即清除而不是延迟
  const handleDragLeave = useCallback((e: DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && e.currentTarget instanceof HTMLElement) {
      if (e.currentTarget.contains(relatedTarget)) {
        return;
      }
      // relatedTarget 存在且不在当前元素内，说明移动到了另一个有效目标
      // 不要清除，等 enter 事件处理
      return;
    }
    // relatedTarget 为 null（移动到空白区域）或 currentTarget 无效，立即清除
    cancelDropTargetTimer();
    uiStore.setDropTarget(null);
    uiStore.setDropBeforeId(null);
  }, [uiStore, cancelDropTargetTimer]);

  const handleDrop = useCallback((e: DragEvent, targetPath: string, beforeId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    cancelDropTargetTimer();
    const draggingNode = uiStore.draggingNode;
    if (!draggingNode) return;

    // 使用 store 中的 dropTargetFolderPath 和 dropBeforeId
    const finalTargetPath = uiStore.dropTargetFolderPath ?? targetPath;
    const finalBeforeId = uiStore.dropBeforeId ?? beforeId ?? '';

    if (draggingNode.type === 'request') {
      handleMoveRequest(draggingNode.path, finalTargetPath, finalBeforeId);
    } else if (draggingNode.type === 'folder') {
      handleMoveFolder(draggingNode.path, finalTargetPath, finalBeforeId);
    }
    uiStore.clearDragState();
  }, [uiStore, cancelDropTargetTimer, handleMoveRequest, handleMoveFolder]);

  // 使用 useMemo 缓存计算结果，避免每次渲染重新计算
  const requestTabs = useMemo(() => workspace.requestTabs || [], [workspace.requestTabs]);
  const activeRequestTab = useMemo(() => workspace.activeRequestTab || '', [workspace.activeRequestTab]);
  const activeTab = useMemo(() => requestTabs.find(t => t.id === activeRequestTab), [requestTabs, activeRequestTab]);
  const activeRequestPath = useMemo(() => activeTab?.path || '', [activeTab]);

  // 缓存环境和脚本相关数据
  const selectedEnvironment = useMemo(() => environments.find((e) => e.id === workspace.selectedEnvironmentId), [environments, workspace.selectedEnvironmentId]);
  const environmentVariables = useMemo(() => selectedEnvironment?.variables || {}, [selectedEnvironment]);
  const scriptLogs = useMemo(() => workspace.response?.script_logs || [], [workspace.response]);
  const testResults = useMemo(() => workspace.response?.tests || [], [workspace.response]);

  // 展开/折叠模块 - 只切换展开状态，不切换右侧工作区
  const toggleModule = (module: 'apis' | 'environments' | 'scripts' | 'project-settings') => {
    setCollapsedModules({
      apis: module === 'apis' ? !collapsedModules.apis : collapsedModules.apis,
      environments: module === 'environments' ? !collapsedModules.environments : collapsedModules.environments,
      scripts: module === 'scripts' ? !collapsedModules.scripts : collapsedModules.scripts,
      projectSettings: module === 'project-settings' ? !collapsedModules.projectSettings : collapsedModules.projectSettings,
    });
  };

  // 切换右侧工作区到指定模块
  const activateModule = (module: 'apis' | 'environments' | 'scripts' | 'project-settings') => {
    setActiveModule(module);
    // 确保目标模块展开
    setCollapsedModules(prev => ({
      ...prev,
      [module]: false
    }));
    // 关闭文件夹脚本配置
    setSelectedFolder(null);
  };

  return (
    <div className="project-workspace">
      <div className="project-sidebar" style={{ width: sidebarWidth }}>
        {/* 接口列表模块 */}
        <div className={`sidebar-module ${collapsedModules.apis ? 'collapsed' : ''}`} data-module="apis">
          <div className="sidebar-module-header" onClick={() => toggleModule('apis')}>
            <div className="sidebar-module-title">
              {collapsedModules.apis ? <RightOutlined /> : <DownOutlined />}
              <ApiOutlined />
              <span>接口列表</span>
            </div>
            {!collapsedModules.apis && (
              <Space size="small">
                <Dropdown
                  menu={{
                    items: [
                      { key: 'folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => handleAddFolder('') },
                      { key: 'request', icon: <FileOutlined />, label: '新建请求', onClick: () => handleAddRequest('') },
                    ]
                  }}
                  trigger={['click']}
                >
                  <Button size="small" icon={<PlusOutlined />} onClick={(e) => e.stopPropagation()} />
                </Dropdown>
              </Space>
            )}
          </div>
          {!collapsedModules.apis && (
            <div className="sidebar-module-content">
              <div className="sidebar-search">
                <Input
                  prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                  placeholder="搜索接口..."
                  value={searchKeyword}
                  onChange={handleSearchChange}
                  allowClear
                  size="small"
                />
              </div>
              <div className="sidebar-filters">
                <Select
                  value={filterMethod}
                  onChange={setFilterMethod}
                  size="small"
                  style={{ width: '100%' }}
                  options={[
                    { value: 'ALL', label: '全部方法' },
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' },
                  ]}
                />
              </div>
              <div className="sidebar-content">
                {!projectTree && (
                  <div className="empty-sidebar">
                    <ApiOutlined style={{ fontSize: 32, color: '#d0d0db', marginBottom: 12 }} />
                    <div>暂无接口</div>
                  </div>
                )}
                {projectTree && (
                  <ApiTree
                    tree={projectTree}
                    collapsedFolders={collapsedFolders}
                    expandedRequestPaths={workspace.expandedRequestPaths || new Set()}
                    activeRequestPath={activeRequestPath}
                    sidebarHighlightedCasePath={workspace.sidebarHighlightedCasePath}
                    movedHighlightPath={null}
                    onToggleFolder={handleToggleFolder}
                    onToggleRequestCases={handleToggleRequestCases}
                    onRequestClick={handleApiTreeRequestClick}
                    onCaseClick={handleApiTreeCaseClick}
                    onAddRequest={handleAddRequest}
                    onAddFolder={handleAddFolder}
                    onRename={handleRename}
                    onDeleteRequest={handleDeleteRequest}
                    onDeleteFolder={handleDeleteFolder}
                    onCopyRequest={handleCopyRequest}
                    onAddCase={handleAddCase}
                    onDuplicateCase={handleDuplicateCase}
                    onRenameCase={handleRenameCase}
                    onDeleteCase={handleDeleteCase}
                    onConfigureFolderScripts={handleConfigureFolderScripts}
                    searchKeyword={searchKeyword}
                    onSearchChange={setSearchKeyword}
                    filterMethod={filterMethod}
                    onFilterMethodChange={setFilterMethod}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 环境变量模块 */}
        <div className={`sidebar-module ${collapsedModules.environments ? 'collapsed' : ''}`}>
          <div className="sidebar-module-header" onClick={() => toggleModule('environments')}>
            <div className="sidebar-module-title">
              {collapsedModules.environments ? <RightOutlined /> : <DownOutlined />}
              <EnvironmentOutlined />
              <span>环境变量</span>
            </div>
            {!collapsedModules.environments && (
              <Button size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleCreateEnvironment(); }} />
            )}
          </div>
          {!collapsedModules.environments && (
            <div className="sidebar-module-content">
              <div className="sidebar-content environment-sidebar-content">
                <div className="environment-list">
                  {environments.length === 0 ? (
                    <div className="empty-sidebar">暂无环境，点击右上角"新建"创建</div>
                  ) : (
                    environments.map(env => (
                      <EnvironmentListItem
                        key={env.id}
                        env={env}
                        isActive={editingEnvironmentId === env.id}
                        onClick={handleOpenEnvironmentEditor}
                        onDelete={handleDeleteEnvironmentById}
                        onDuplicate={handleDuplicateEnvironment}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 脚本模块 */}
        <div className={`sidebar-module ${collapsedModules.scripts ? 'collapsed' : ''}`}>
          <div className="sidebar-module-header" onClick={() => toggleModule('scripts')}>
            <div className="sidebar-module-title">
              {collapsedModules.scripts ? <RightOutlined /> : <DownOutlined />}
              <CodeOutlined />
              <span>脚本</span>
            </div>
            {!collapsedModules.scripts && (
              <Button size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleCreateScript(); }} />
            )}
          </div>
          {!collapsedModules.scripts && (
            <div className="sidebar-module-content">
              <div className="sidebar-content environment-sidebar-content">
                <div className="environment-list">
                  {scripts.length === 0 ? (
                    <div className="empty-sidebar">暂无脚本，点击右上角"新建"创建</div>
                  ) : (
                    scripts.map(script => (
                      <button
                        key={script.id}
                        className={`environment-list-item ${editingScriptId === script.id ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleSelectScript(script); }}
                      >
                        <span className="environment-list-item-icon">
                          <CodeOutlined />
                        </span>
                        <span className="environment-list-item-name">{script.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 项目设置模块 */}
        <div className={`sidebar-module ${collapsedModules.projectSettings ? 'collapsed' : ''}`}>
          <div className="sidebar-module-header" onClick={() => toggleModule('project-settings')}>
            <div className="sidebar-module-title">
              {collapsedModules.projectSettings ? <RightOutlined /> : <DownOutlined />}
              <FileOutlined />
              <span>项目设置</span>
            </div>
          </div>
          {!collapsedModules.projectSettings && (
            <div className="sidebar-module-content">
              <div className="environment-list">
                <button
                  className={`environment-list-item ${activeModule === 'project-settings' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); activateModule('project-settings'); }}
                >
                  <span className="environment-list-item-icon">
                    <CodeOutlined />
                  </span>
                  <span className="environment-list-item-name">全局脚本</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ResizeHandle sidebarWidth={sidebarWidth} onResize={handleSidebarResize} onResizeEnd={handleSidebarResizeEnd} />

      <div className="project-main">
        {activeModule === 'apis' && requestTabs.length > 0 && (
          <div className="request-tabs-row">
            <div className="request-tabs-scroll-wrap">
              <Tabs
                activeKey={activeRequestTab}
                onChange={(key) => handleRequestTabChange(key)}
                type="editable-card"
                hideAdd
                onEdit={(targetKey, action) => {
                  if (action === 'remove') {
                    handleCloseRequestTab(targetKey as string);
                  }
                }}
                items={requestTabs.map(tab => ({
                  key: tab.id,
                  label: tab.title,
                }))}
                size="small"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        )}

        <div className="workspace-main">
          {selectedFolder ? (
            <FolderScriptPanel
              folderPath={selectedFolder.path}
              folderName={selectedFolder.name}
              preScripts={selectedFolder.preScripts}
              postScripts={selectedFolder.postScripts}
              projectScripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
              onSave={(pre, post) => {
                // Update the selected folder state with new scripts
                setSelectedFolder({ ...selectedFolder, preScripts: pre, postScripts: post });
              }}
              onClose={() => setSelectedFolder(null)}
            />
          ) : activeModule === 'apis' && requestTabs.length > 0 ? (
            <>
              <div className="workspace-request">
                <RequestPanel
                  apiConfig={workspace.apiConfig}
                  onApiConfigChange={(config) => handleUpdateWorkspace({ apiConfig: config })}
                  executing={executing}
                  onExecute={handleExecuteRequest}
                  onSave={workspace.requestEditorSurface === 'case' ? handleSaveCase : handleSaveRequest}
                  environmentVariables={environmentVariables}
                  projectScripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
                />
              </div>
              {workspace.response && (
                <>
                  <ResizeSplitter
                    height={responseHeight}
                    onHeightChange={handleResponseHeightChange}
                    minHeight={100}
                    maxHeight={800}
                  />
                  <div className="workspace-response" style={{ height: responseHeight }}>
                    <ResponsePanel
                      response={workspace.response as CurlResponse | null}
                      formattedResponse={formattedResponse}
                      scriptLogs={scriptLogs}
                      testResults={testResults}
                      scriptLogsExpanded={workspaceStore.scriptLogsExpanded}
                      testResultsExpanded={workspaceStore.testResultsExpanded}
                      onToggleScriptLogs={() => workspaceStore.setScriptLogsExpanded(!workspaceStore.scriptLogsExpanded)}
                      onToggleTestResults={() => workspaceStore.setTestResultsExpanded(!workspaceStore.testResultsExpanded)}
                    />
                  </div>
                </>
              )}
            </>
          ) : activeModule === 'environments' ? (
            <EnvironmentEditor
              onSave={handleSaveEnvironment}
              onDelete={handleDeleteEnvironment}
            />
          ) : activeModule === 'project-settings' ? (
            <ProjectScriptPanel
              projectId={projectId}
              projectName={projectTree?.name || '项目'}
              preScripts={projectScripts.preScripts}
              postScripts={projectScripts.postScripts}
              projectScripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
              onSave={(pre, post) => setProjectScripts({ preScripts: pre, postScripts: post })}
            />
          ) : (
            <ScriptEditor />
          )}
        </div>
      </div>
    </div>
  );
};
