import React, { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'antd';
import { ResponseBodyViewer, ResponseCookies, ResponseHeaders, ResponseStatus } from './index';
import { CurlResponse } from '../../types';
import './ResponsePanel.css';

interface ResponsePanelProps {
  response: CurlResponse | null;
  formattedResponse: string;
  scriptLogs: string[];
  testResults: Array<{ name: string; passed: boolean; message?: string }>;
  scriptLogsExpanded: boolean;
  testResultsExpanded: boolean;
  onToggleScriptLogs: () => void;
  onToggleTestResults: () => void;
  loading?: boolean;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  formattedResponse,
  scriptLogs,
  testResults,
  scriptLogsExpanded,
  testResultsExpanded,
  onToggleScriptLogs,
  onToggleTestResults,
}) => {
  const [responseBodyHeight, setResponseBodyHeight] = useState(200);
  const [scriptResultsHeight, setScriptResultsHeight] = useState(200);
  const appTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

  // Calculate response-body height dynamically
  const calculateResponseBodyHeight = useCallback(() => {
    const responsePanel = document.querySelector('.response-panel') as HTMLElement;
    const responseHeader = document.querySelector('.response-panel .response-header') as HTMLElement;
    if (responsePanel && responseHeader) {
      const panelHeight = responsePanel.offsetHeight;
      const headerHeight = responseHeader.offsetHeight;
      const bodyHeight = panelHeight - headerHeight - 40; // 40 = tabs height
      setResponseBodyHeight(Math.max(100, bodyHeight));
    }
  }, []);

  // Calculate script-results-panel height dynamically
  const calculateScriptResultsHeight = useCallback(() => {
    const responsePanel = document.querySelector('.response-panel') as HTMLElement;
    const responseHeader = document.querySelector('.response-panel .response-header') as HTMLElement;
    if (responsePanel && responseHeader) {
      const panelHeight = responsePanel.offsetHeight;
      const headerHeight = responseHeader.offsetHeight;
      const bodyHeight = panelHeight - headerHeight - 40; // 40 = tabs height
      setScriptResultsHeight(Math.max(100, bodyHeight));
    }
  }, []);

  // Auto-calculate heights on response change and window resize
  useEffect(() => {
    calculateResponseBodyHeight();
    calculateScriptResultsHeight();

    window.addEventListener('resize', calculateResponseBodyHeight);
    window.addEventListener('resize', calculateScriptResultsHeight);

    // Use ResizeObserver to detect panel size changes (including window drag)
    // Listen on .workspace-response instead of .response-panel
    const workspaceResponse = document.querySelector('.workspace-response');
    const responsePanel = document.querySelector('.response-panel');
    const observer = new ResizeObserver(() => {
      calculateResponseBodyHeight();
      calculateScriptResultsHeight();
    });
    if (workspaceResponse) {
      observer.observe(workspaceResponse);
    }
    if (responsePanel) {
      observer.observe(responsePanel);
    }

    return () => {
      window.removeEventListener('resize', calculateResponseBodyHeight);
      window.removeEventListener('resize', calculateScriptResultsHeight);
      observer.disconnect();
    };
  }, [response, calculateResponseBodyHeight, calculateScriptResultsHeight]);

  // Parse workflow items from logs
  const parseWorkflowItems = () => {
    const workflowItems: { name: string; type: 'pre' | 'post' | 'http'; status: 'running' | 'success' | 'failed' }[] = [];
    const logs = response?.script_logs || [];
    let currentScript = '';
    let currentType: 'pre' | 'post' | 'http' = 'pre';
    let currentStatus: 'running' | 'success' | 'failed' = 'running';

    for (const log of logs) {
      const startMatch = log.match(/\[([^\]]+)\] ▶ START/);
      if (startMatch) {
        currentScript = startMatch[1];
        currentType = currentScript.toLowerCase().includes('pre') ? 'pre' : 'post';
        currentStatus = 'running';
        workflowItems.push({ name: currentScript, type: currentType, status: currentStatus });
        continue;
      }
      const successMatch = log.match(/\[([^\]]+)\] ✓ SUCCESS/);
      if (successMatch) {
        currentStatus = 'success';
        if (workflowItems.length > 0 && workflowItems[workflowItems.length - 1].status === 'running') {
          workflowItems[workflowItems.length - 1].status = 'success';
        } else {
          workflowItems.push({ name: successMatch[1], type: 'http', status: 'success' });
        }
        continue;
      }
      const failedMatch = log.match(/\[([^\]]+)\] ✗ FAILED/);
      if (failedMatch) {
        currentStatus = 'failed';
        if (workflowItems.length > 0 && workflowItems[workflowItems.length - 1].status === 'running') {
          workflowItems[workflowItems.length - 1].status = 'failed';
        } else {
          workflowItems.push({ name: failedMatch[1], type: 'http', status: 'failed' });
        }
        continue;
      }
    }
    return workflowItems;
  };

  const renderScriptResults = () => (
    <div className="script-results-panel" style={{ height: scriptResultsHeight }}>
      {response?.script_logs && response.script_logs.length > 0 && (
        <>
          <div className="script-workflow">
            {parseWorkflowItems().map((item, idx) => (
              <React.Fragment key={idx}>
                <div className={`script-workflow-item ${item.type === 'pre' ? 'pre-script' : 'post-script'} ${item.status}`}>
                  <div className="script-workflow-icon">
                    {item.status === 'success' ? '✓' : item.status === 'failed' ? '✗' : '▶'}
                  </div>
                  <div className="script-workflow-content">
                    <div className="script-workflow-name">{item.name}</div>
                    <div className="script-workflow-status">
                      {item.status === 'success' ? '执行成功' : item.status === 'failed' ? '执行失败' : '执行中...'}
                    </div>
                  </div>
                </div>
                {idx < parseWorkflowItems().length - 1 && <div className="script-workflow-line"></div>}
              </React.Fragment>
            ))}
          </div>
          <div className="script-logs-section" style={{ marginTop: 16 }}>
            <div
              className="section-header clickable"
              onClick={onToggleScriptLogs}
            >
              <span className={`expand-icon ${scriptLogsExpanded ? 'expanded' : ''}`}>▶</span>
              <span className="section-title">Console Logs</span>
              <span className="section-count">{response.script_logs.length}</span>
            </div>
            {scriptLogsExpanded && (
              <div className="script-logs-content">
                {response.script_logs.map((log: string, index: number) => {
                  let className = 'script-log-entry';
                  if (log.includes('▶ START')) className += ' script-start';
                  else if (log.includes('✓ SUCCESS')) className += ' script-success';
                  else if (log.includes('✗ FAILED')) className += ' script-failed';
                  return (
                    <div key={index} className={className}>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {response?.tests && response.tests.length > 0 && (
        <div className="test-results-section">
          <div
            className="section-header clickable"
            onClick={onToggleTestResults}
          >
            <span className={`expand-icon ${testResultsExpanded ? 'expanded' : ''}`}>▶</span>
            <span className="section-title">Test Results</span>
            <span className="test-summary">
              ({response.tests.filter((t: any) => t.passed).length}/{response.tests.length} passed)
            </span>
          </div>
          {testResultsExpanded && (
            <div className="test-results-list">
              {response.tests.map((test: any, index: number) => (
                <div key={index} className={`test-result-item ${test.passed ? 'passed' : 'failed'}`}>
                  <span className="test-status-icon">{test.passed ? '✓' : '✗'}</span>
                  <span className="test-name">{test.name}</span>
                  {!test.passed && test.message && (
                    <span className="test-message">{test.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const scriptTabItems = response?.script_logs?.length || response?.tests?.length
    ? [{
        key: 'scripts',
        label: '脚本结果',
        children: renderScriptResults(),
      }]
    : [];

  return (
    <div className="response-panel">
      {response && (
        <ResponseStatus statusCode={response.status_code} duration={response.duration} />
      )}
      <Tabs
        defaultActiveKey="body"
        items={[
          {
            key: 'body',
            label: 'Body',
            children: (
              <ResponseBodyViewer
                body={response?.body || ''}
                error={response?.error}
                height={responseBodyHeight}
                appTheme={appTheme}
                viewMode="body"
              />
            ),
          },
          {
            key: 'headers',
            label: 'Header',
            children: (
              <ResponseHeaders headers={response?.headers || null} />
            ),
          },
          {
            key: 'formatted',
            label: 'JsonView',
            children: (
              <ResponseBodyViewer
                body={response?.body || ''}
                formattedResponse={formattedResponse}
                height={responseBodyHeight}
                appTheme={appTheme}
                viewMode="json"
              />
            ),
          },
          ...scriptTabItems,
        ]}
      />
    </div>
  );
};