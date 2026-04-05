import React from 'react';
import { Tabs, Button } from 'antd';
import { ApiOutlined, EnvironmentOutlined, FileTextOutlined } from '@ant-design/icons';
import { ApiTree } from '../ApiTree';
import { RequestEditor } from '../RequestEditor';
import { ResponsePanel } from '../ResponsePanel';
import { ApiConfig, ProjectWorkspaceState, ProjectTree as ProjectTreeType, ProjectScript, Environment } from '../../store';
import { CurlResponse } from '../../types';
import './ProjectWorkspace.css';

interface ProjectWorkspaceProps {
  workspaceState: ProjectWorkspaceState;
  projectTree: ProjectTreeType | null;
  environments: Environment[];
  projectScripts: ProjectScript[];
  onUpdateWorkspace: (updates: Partial<ProjectWorkspaceState>) => void;
  onToggleFolder: (folderPath: string) => void;
  onToggleRequestCases: (requestPath: string) => void;
  onRequestClick: (request: ProjectTreeType) => void;
  onCaseClick: (caseItem: ProjectTreeType) => void;
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
  onExecute: () => void;
  onSaveRequest: () => void;
  searchKeyword: string;
  filterMethod: string;
  onSearchChange: (keyword: string) => void;
  onFilterMethodChange: (method: string) => void;
  sidebarMenu: 'apis' | 'environments' | 'scripts';
  onSidebarMenuChange: (menu: 'apis' | 'environments' | 'scripts') => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  workspaceState,
  projectTree,
  environments,
  projectScripts,
  onUpdateWorkspace,
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
  onExecute,
  onSaveRequest,
  searchKeyword,
  filterMethod,
  onSearchChange,
  onFilterMethodChange,
  sidebarMenu,
  onSidebarMenuChange,
}) => {
  const selectedEnvironment = environments.find((e) => e.id === workspaceState.selectedEnvironmentId);
  const environmentVariables = selectedEnvironment?.variables || {};

  const scriptLogs = workspaceState.response?.script_logs || [];
  const testResults = workspaceState.response?.tests || [];

  return (
    <div className="project-workspace">
      <div className="workspace-sidebar">
        <div className="sidebar-tabs">
          <Button
            type={sidebarMenu === 'apis' ? 'primary' : 'text'}
            icon={<ApiOutlined />}
            onClick={() => onSidebarMenuChange('apis')}
          >
            接口
          </Button>
          <Button
            type={sidebarMenu === 'environments' ? 'primary' : 'text'}
            icon={<EnvironmentOutlined />}
            onClick={() => onSidebarMenuChange('environments')}
          >
            环境
          </Button>
          <Button
            type={sidebarMenu === 'scripts' ? 'primary' : 'text'}
            icon={<FileTextOutlined />}
            onClick={() => onSidebarMenuChange('scripts')}
          >
            脚本
          </Button>
        </div>

        <div className="sidebar-content">
          {sidebarMenu === 'apis' && (
            <ApiTree
              tree={projectTree}
              collapsedFolders={new Set()}
              expandedRequestPaths={workspaceState.expandedRequestPaths || new Set()}
              sidebarHighlightedCasePath={workspaceState.sidebarHighlightedCasePath}
              movedHighlightPath={null}
              onToggleFolder={onToggleFolder}
              onToggleRequestCases={onToggleRequestCases}
              onRequestClick={onRequestClick}
              onCaseClick={onCaseClick}
              onAddRequest={onAddRequest}
              onAddFolder={onAddFolder}
              onRename={onRename}
              onDeleteRequest={onDeleteRequest}
              onDeleteFolder={onDeleteFolder}
              onCopyRequest={onCopyRequest}
              onAddCase={onAddCase}
              onDuplicateCase={onDuplicateCase}
              onRenameCase={onRenameCase}
              onDeleteCase={onDeleteCase}
              searchKeyword={searchKeyword}
              onSearchChange={onSearchChange}
              filterMethod={filterMethod}
              onFilterMethodChange={onFilterMethodChange}
            />
          )}

          {sidebarMenu === 'environments' && (
            <div className="environments-panel">
              <div className="env-selector">
                <select
                  value={workspaceState.selectedEnvironmentId}
                  onChange={(e) =>
                    onUpdateWorkspace({ selectedEnvironmentId: e.target.value })
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
              {projectScripts.length === 0 ? (
                <div className="empty-hint">暂无脚本</div>
              ) : (
                projectScripts.map((script) => (
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
            apiConfig={workspaceState.apiConfig}
            onApiConfigChange={(config) => onUpdateWorkspace({ apiConfig: config })}
            executing={false}
            onExecute={onExecute}
            onSave={onSaveRequest}
            environmentVariables={environmentVariables}
            projectScripts={projectScripts.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
        <div className="workspace-response">
          <ResponsePanel
            response={workspaceState.response as CurlResponse | null}
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
