import React, { useState, useEffect, useCallback } from 'react';
import { Button, Dropdown, Input, message, Select, Space, Tabs } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileOutlined, FolderOutlined, PlusOutlined, SearchOutlined, CodeOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import { ApiTree } from '../ApiTree';
import { RequestPanel } from '../RequestPanel';
import { ResponsePanel } from '../ResponsePanel';
import { EnvironmentEditor } from './EnvironmentEditor';
import { ScriptEditor } from './ScriptEditor';
import { ResizeHandle } from './ResizeHandle';
import { ResizeSplitter } from './ResizeSplitter';
import { CurlResponse } from '../../types';
import { Environment, ProjectScript, useEnvironmentStore, useScriptStore, EnvironmentVariableRow } from '../../store';
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
  const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [searchVersion, setSearchVersion] = useState(0);
  const [responseHeight, setResponseHeight] = useState(() => {
    const saved = localStorage.getItem('apiman-response-height');
    return saved ? parseInt(saved, 10) : 300;
  });

  const { workspace, projectTree } = useWorkspace(projectId);
  const { collapsedFolders } = projectStore;
  const { formattedResponse, executing } = workspaceStore;

  // Environment store state
  const {
    environmentFormName,
    environmentFormVariables,
    setEnvironmentFormName,
    setEnvironmentFormVariables,
    openEnvironmentTab,
    openCreateEnvironmentTab,
    closeEnvironmentTab,
    resetEnvironmentEditor,
    environmentToRows,
    rowsToEnvironmentVariables,
    environmentTabs,
    activeEnvironmentTab,
    setActiveEnvironmentTab,
    setEditingEnvironmentId,
    setEnvironmentTabs,
    editingEnvironmentId,
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
    handleDuplicateCase,
    handleRenameCase,
    handleDeleteCase,
    handleRequestTabChange,
    handleCloseRequestTab,
    handleCreateFolder,
    handleToggleFolder,
    handleToggleRequestCases,
  } = useWorkspaceHandlers(projectId);

  const { environments, loadEnvironments, createEnvironment, updateEnvironment, deleteEnvironment } = useEnvironments();
  const { scripts, loadScripts, createScript, updateScript, deleteScript } = useScripts();

  // Load data when projectId changes
  useEffect(() => {
    if (projectId) {
      loadEnvironments(projectId);
      loadScripts(projectId);
    }
  }, [projectId, loadEnvironments, loadScripts]);

  const selectedEnvironment = environments.find((e) => e.id === workspace.selectedEnvironmentId);
  const environmentVariables = selectedEnvironment?.variables || {};
  const scriptLogs = workspace.response?.script_logs || [];
  const testResults = workspace.response?.tests || [];

  const handleUpdateWorkspace = (updates: any) => {
    workspaceStore.setWorkspaceState(projectId, updates);
  };

  // Environment handlers
  const handleOpenEnvironmentEditor = useCallback((env: Environment) => {
    openEnvironmentTab(env);
  }, [openEnvironmentTab]);

  const handleCreateEnvironment = useCallback(() => {
    openCreateEnvironmentTab(environments.length);
    setSidebarMenu('environments');
  }, [openCreateEnvironmentTab, environments.length]);

  const handleCloseEnvironmentTab = useCallback((tabKey: string) => {
    closeEnvironmentTab(tabKey);
  }, [closeEnvironmentTab]);

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
        message.success('环境已更新');
      } else {
        const created = await createEnvironment(projectId, name, variables);
        message.success('环境已创建');
        // Update the tab to use the real env ID
        setEnvironmentTabs(environmentTabs.map(tab =>
          tab.key === activeEnvironmentTab
            ? { key: `env-${created.id}`, title: created.name, environmentId: created.id }
            : tab
        ));
        setActiveEnvironmentTab(`env-${created.id}`);
        setEditingEnvironmentId(created.id);
        await loadEnvironments(projectId);
      }
    } catch (error) {
      console.error('Failed to save environment:', error);
    }
  }, [projectId, editingEnvironmentId, environmentFormName, environmentFormVariables, createEnvironment, updateEnvironment, rowsToEnvironmentVariables, environmentTabs, activeEnvironmentTab, setEnvironmentTabs, setActiveEnvironmentTab, setEditingEnvironmentId, loadEnvironments]);

  const handleDeleteEnvironment = useCallback(async () => {
    if (!editingEnvironmentId) return;
    try {
      await deleteEnvironment(projectId, editingEnvironmentId);
      resetEnvironmentEditor();
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  }, [projectId, editingEnvironmentId, deleteEnvironment, resetEnvironmentEditor]);

  // Script handlers
  const handleSelectScript = useCallback((script: ProjectScript) => {
    selectScript(script);
  }, [selectScript]);

  const handleCreateScript = useCallback(async () => {
    const scriptName = `脚本${scripts.length + 1}`;
    try {
      const created = await createScript(projectId, scriptName, '', '// 在这里编写 JavaScript 脚本\n');
      await loadScripts(projectId);
      selectScript(created);
    } catch (error) {
      console.error('Failed to create script:', error);
    }
  }, [projectId, scripts.length, createScript, loadScripts, selectScript]);

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
    localStorage.setItem('apiman-response-height', height.toString());
  };

  const requestTabs = workspace.requestTabs || [];
  const activeRequestTab = workspace.activeRequestTab || '';
  const activeTab = requestTabs.find(t => t.id === activeRequestTab);
  const activeRequestPath = activeTab?.path || '';

  return (
    <div className="project-workspace">
      <div className="project-sidebar" style={{ width: sidebarWidth }}>
        <div className="sidebar-header sidebar-menu-header">
          <div className="sidebar-top-menu">
            <button
              className={`sidebar-menu-item ${sidebarMenu === 'apis' ? 'active' : ''}`}
              onClick={() => setSidebarMenu('apis')}
            >
              接口列表
            </button>
            <button
              className={`sidebar-menu-item ${sidebarMenu === 'environments' ? 'active' : ''}`}
              onClick={() => setSidebarMenu('environments')}
            >
              环境变量
            </button>
            <button
              className={`sidebar-menu-item ${sidebarMenu === 'scripts' ? 'active' : ''}`}
              onClick={() => setSidebarMenu('scripts')}
            >
              脚本
            </button>
          </div>
          {sidebarMenu === 'apis' ? (
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
                <Button size="small" icon={<PlusOutlined />} />
              </Dropdown>
            </Space>
          ) : sidebarMenu === 'environments' ? (
            <Button size="small" icon={<PlusOutlined />} onClick={handleCreateEnvironment} />
          ) : (
            <Button size="small" icon={<PlusOutlined />} onClick={handleCreateScript} />
          )}
        </div>

        {sidebarMenu === 'apis' && (
          <>
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
                  onRequestClick={handleTreeItemClick}
                  onCaseClick={handleCaseClick}
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
                  searchKeyword={searchKeyword}
                  onSearchChange={setSearchKeyword}
                  filterMethod={filterMethod}
                  onFilterMethodChange={setFilterMethod}
                />
              )}
            </div>
          </>
        )}

        {sidebarMenu === 'environments' && (
          <div className="sidebar-content environment-sidebar-content">
            <div className="environment-list">
              {environments.length === 0 ? (
                <div className="empty-sidebar">暂无环境，点击右上角"新建"创建</div>
              ) : (
                environments.map(env => (
                  <button
                    key={env.id}
                    className={`environment-list-item ${editingEnvironmentId === env.id ? 'active' : ''}`}
                    onClick={() => handleOpenEnvironmentEditor(env)}
                  >
                    <span className="environment-list-item-icon">
                      <EnvironmentOutlined />
                    </span>
                    <span className="environment-list-item-name">{env.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {sidebarMenu === 'scripts' && (
          <div className="sidebar-content environment-sidebar-content">
            <div className="environment-list">
              {scripts.length === 0 ? (
                <div className="empty-sidebar">暂无脚本，点击右上角"新建"创建</div>
              ) : (
                scripts.map(script => (
                  <button
                    key={script.id}
                    className={`environment-list-item ${editingScriptId === script.id ? 'active' : ''}`}
                    onClick={() => handleSelectScript(script)}
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
        )}
      </div>

      <ResizeHandle sidebarWidth={sidebarWidth} onResize={handleSidebarResize} onResizeEnd={handleSidebarResizeEnd} />

      <div className="project-main">
        {sidebarMenu === 'apis' && requestTabs.length > 0 && (
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
            <div className="request-tabs-environment-select">
              <Select
                size="small"
                value={workspace.selectedEnvironmentId || '__none__'}
                onChange={(value) => handleUpdateWorkspace({ selectedEnvironmentId: value === '__none__' ? '' : value })}
                options={[
                  { label: '不使用环境', value: '__none__' },
                  ...environments.map(env => ({ label: env.name, value: env.id }))
                ]}
                style={{ width: 133 }}
              />
            </div>
          </div>
        )}

        <div className="workspace-main">
          {sidebarMenu === 'apis' ? (
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
              <ResizeSplitter
                onRatioChange={handleResponseHeightChange}
                initialRatio={responseHeight}
                minRatio={100}
                maxRatio={800}
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
          ) : sidebarMenu === 'environments' ? (
            <EnvironmentEditor
              onSave={handleSaveEnvironment}
              onDelete={handleDeleteEnvironment}
              onCloseTab={handleCloseEnvironmentTab}
            />
          ) : (
            <ScriptEditor />
          )}
        </div>
      </div>
    </div>
  );
};
