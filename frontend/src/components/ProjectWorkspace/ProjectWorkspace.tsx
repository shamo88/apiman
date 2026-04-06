import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Input, Select, Spin, Tabs } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileOutlined, FolderOutlined, PlusOutlined, SearchOutlined, CodeOutlined } from '@ant-design/icons';
import { ApiTree } from '../ApiTree';
import { RequestEditor } from '../RequestEditor';
import { ResponsePanel } from '../ResponsePanel';
import { CurlResponse } from '../../types';
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
  const {
    handleTreeItemClick,
    handleCaseClick,
    handleExecuteRequest,
    handleSaveRequest,
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

  const { environments, loadEnvironments } = useEnvironments();
  const { scripts, loadScripts } = useScripts();

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
            <Button size="small" icon={<PlusOutlined />} />
          ) : (
            <Button size="small" icon={<PlusOutlined />} onClick={() => {}} />
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
                    className={`environment-list-item ${workspace.selectedEnvironmentId === env.id ? 'active' : ''}`}
                    onClick={() => handleUpdateWorkspace({ selectedEnvironmentId: env.id })}
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
                    className="environment-list-item"
                    onClick={() => {}}
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
          <div className="workspace-request">
            <RequestEditor
              apiConfig={workspace.apiConfig}
              onApiConfigChange={(config) => handleUpdateWorkspace({ apiConfig: config })}
              executing={executing}
              onExecute={handleExecuteRequest}
              onSave={handleSaveRequest}
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
              scriptLogsExpanded={true}
              testResultsExpanded={true}
              onToggleScriptLogs={() => {}}
              onToggleTestResults={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
