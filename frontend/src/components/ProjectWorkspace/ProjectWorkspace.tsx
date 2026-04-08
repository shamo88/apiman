import React, { useState, useEffect, useCallback } from 'react';
import { Button, Dropdown, Empty, Input, message, Select, Space, Tabs } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileOutlined, FolderOutlined, PlusOutlined, SearchOutlined, CodeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { ApiTree } from '../ApiTree';
import { RequestPanel } from '../RequestPanel';
import { ResponsePanel } from '../ResponsePanel';
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
  const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [searchVersion, setSearchVersion] = useState(0);

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

  const requestTabs = workspace.requestTabs || [];
  const activeRequestTab = workspace.activeRequestTab || '';
  const activeTab = requestTabs.find(t => t.id === activeRequestTab);
  const activeRequestPath = activeTab?.path || '';

  // Render environment editor
  const renderEnvironmentEditor = () => (
    <div className="request-panel">
      {environmentTabs.length > 0 ? (
        <>
          <Tabs
            activeKey={activeEnvironmentTab}
            onChange={(key) => setActiveEnvironmentTab(key)}
            type="editable-card"
            hideAdd
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                handleCloseEnvironmentTab(targetKey as string);
              }
            }}
            items={environmentTabs.map(tab => ({
              key: tab.key,
              label: tab.title,
            }))}
            size="small"
            style={{ marginBottom: 12 }}
          />
          <div className="environment-panel">
            <Input
              placeholder="环境名称"
              value={environmentFormName}
              onChange={(e) => setEnvironmentFormName(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div className="environment-vars-header">
              <span>变量</span>
              <Button
                size="small"
                type="link"
                icon={<PlusOutlined />}
                onClick={() => setEnvironmentFormVariables([...environmentFormVariables, { id: `${Date.now()}`, key: '', value: '' } as EnvironmentVariableRow])}
              >
                添加
              </Button>
            </div>
            <div className="environment-vars-list">
              {environmentFormVariables.map((item) => (
                <div className="environment-var-row" key={item.id}>
                  <Input
                    placeholder="变量名"
                    value={item.key}
                    onChange={(e) => {
                      setEnvironmentFormVariables(environmentFormVariables.map((row) => row.id === item.id ? { ...row, key: e.target.value } : row));
                    }}
                  />
                  <Input
                    placeholder="变量值"
                    value={item.value}
                    onChange={(e) => {
                      setEnvironmentFormVariables(environmentFormVariables.map((row) => row.id === item.id ? { ...row, value: e.target.value } : row));
                    }}
                  />
                  <Button
                    type="text"
                    danger
                    onClick={() => {
                      const next = environmentFormVariables.filter((row) => row.id !== item.id);
                      setEnvironmentFormVariables(next.length > 0 ? next : [{ id: `${Date.now()}`, key: '', value: '' } as EnvironmentVariableRow]);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
              <Button onClick={resetEnvironmentEditor}>清空</Button>
              <Space>
                {editingEnvironmentId && (
                  <Button danger onClick={handleDeleteEnvironment}>删除</Button>
                )}
                <Button type="primary" onClick={handleSaveEnvironment}>保存</Button>
              </Space>
            </Space>
          </div>
        </>
      ) : (
        <Empty description="请先在左侧选择环境，或点击新建" />
      )}
    </div>
  );

  // Render script editor
  const renderScriptEditor = () => {
    const appTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

    return (
      <div className="request-panel">
        {editingScriptId || scriptFormName ? (
          <div className="environment-panel script-panel">
            <div className="script-editor-header">
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Input
                  placeholder="脚本名称"
                  value={scriptFormName}
                  onChange={(e) => setScriptFormName(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <Input.TextArea
                  placeholder="描述（可选）"
                  value={scriptFormDescription}
                  onChange={(e) => setScriptFormDescription(e.target.value)}
                  style={{ maxWidth: 300, minWidth: 200, minHeight: 60, maxHeight: 120 }}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </div>
              <Space>
                <Button danger onClick={handleDeleteScript}>删除</Button>
                <Button type="primary" onClick={handleSaveScript}>保存脚本</Button>
              </Space>
            </div>
            <div className="script-editor-wrapper">
              <CodeMirror
                value={scriptFormContent}
                height="100%"
                theme={appTheme}
                extensions={[javascript()]}
                onChange={(value) => setScriptFormContent(value)}
              />
            </div>
          </div>
        ) : (
          <Empty description="请先在左侧选择脚本，或点击新建" />
        )}
      </div>
    );
  };

  return (
    <div className="project-workspace">
      <div className="project-sidebar">
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
              <div className="workspace-response">
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
            renderEnvironmentEditor()
          ) : (
            renderScriptEditor()
          )}
        </div>
      </div>
    </div>
  );
};
