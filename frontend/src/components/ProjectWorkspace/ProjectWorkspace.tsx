import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileTextOutlined } from '@ant-design/icons';
import { ApiTree } from '../ApiTree';
import { RequestEditor } from '../RequestEditor';
import { ResponsePanel } from '../ResponsePanel';
import { CurlResponse } from '../../types';
import { useWorkspace, useWorkspaceHandlers, useEnvironments, useScripts } from '../../hooks';
import { useUIStore, useWorkspaceStore } from '../../store';
import './ProjectWorkspace.css';

interface ProjectWorkspaceProps {
  projectId: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  const uiStore = useUIStore();
  const workspaceStore = useWorkspaceStore();
  const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');

  const { workspace, projectTree } = useWorkspace(projectId);
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

  const handleAddRequest = (folderPath: string) => {
    uiStore.openCreateRequestModal();
  };

  const handleAddFolder = (folderPath: string) => {
    uiStore.openCreateFolderModal();
  };

  const handleAddCase = (requestPath: string) => {
    uiStore.openAddCaseModal(requestPath);
  };

  return (
    <div className="project-workspace">
      <div className="workspace-sidebar">
        <div className="sidebar-tabs">
          <Button
            type={sidebarMenu === 'apis' ? 'primary' : 'text'}
            icon={<ApiOutlined />}
            onClick={() => setSidebarMenu('apis')}
          >
            接口
          </Button>
          <Button
            type={sidebarMenu === 'environments' ? 'primary' : 'text'}
            icon={<EnvironmentOutlined />}
            onClick={() => setSidebarMenu('environments')}
          >
            环境
          </Button>
          <Button
            type={sidebarMenu === 'scripts' ? 'primary' : 'text'}
            icon={<FileTextOutlined />}
            onClick={() => setSidebarMenu('scripts')}
          >
            脚本
          </Button>
        </div>

        <div className="sidebar-content">
          {sidebarMenu === 'apis' && (
            <ApiTree
              tree={projectTree}
              collapsedFolders={new Set()}
              expandedRequestPaths={workspace.expandedRequestPaths || new Set()}
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

          {sidebarMenu === 'environments' && (
            <div className="environments-panel">
              <div className="env-selector">
                <select
                  value={workspace.selectedEnvironmentId}
                  onChange={(e) =>
                    handleUpdateWorkspace({ selectedEnvironmentId: e.target.value })
                  }
                  className="env-select"
                >
                  <option value="">不使用环境</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEnvironment && (
                <div className="env-variables">
                  <h4>环境变量</h4>
                  {Object.entries(selectedEnvironment.variables).map(([key, value]) => (
                    <div key={key} className="env-var-row">
                      <span className="env-var-key">{key}</span>
                      <span className="env-var-value">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sidebarMenu === 'scripts' && (
            <div className="scripts-panel">
              <h4>项目脚本</h4>
              {scripts.length === 0 ? (
                <div className="empty-hint">暂无脚本</div>
              ) : (
                scripts.map((script) => (
                  <div key={script.id} className="script-item">
                    <span className="script-name">{script.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="workspace-main">
        <div className="workspace-request">
          <RequestEditor
            apiConfig={workspace.apiConfig}
            onApiConfigChange={(config) => handleUpdateWorkspace({ apiConfig: config })}
            executing={false}
            onExecute={handleExecuteRequest}
            onSave={handleSaveRequest}
            environmentVariables={environmentVariables}
            projectScripts={scripts.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
        <div className="workspace-response">
          <ResponsePanel
            response={workspace.response as CurlResponse | null}
            formattedResponse=""
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
  );
};
