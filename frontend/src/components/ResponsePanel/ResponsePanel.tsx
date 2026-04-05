import React, { useMemo } from 'react';
import { Tabs, Empty, Spin } from 'antd';
import { JsonView, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { ResponseHeaders } from './ResponseHeaders';
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
  loading,
}) => {
  const [activeTab, setActiveTab] = React.useState('body');

  const jsonData = useMemo(() => {
    if (!formattedResponse) return null;
    try {
      return JSON.parse(formattedResponse);
    } catch {
      return null;
    }
  }, [formattedResponse]);

  const renderBody = () => {
    if (loading) {
      return (
        <div className="response-loading">
          <Spin tip="加载中..." />
        </div>
      );
    }

    if (!response) {
      return (
        <Empty description="发送请求查看响应" />
      );
    }

    if (response.error) {
      return (
        <div className="response-error">
          <pre>{response.error}</pre>
        </div>
      );
    }

    if (jsonData) {
      return (
        <div className="response-json">
          <JsonView
            data={jsonData}
            style={darkStyles}
          />
        </div>
      );
    }

    return (
      <div className="response-text">
        <pre>{formattedResponse || response.body}</pre>
      </div>
    );
  };

  const renderHeaders = () => {
    if (!response?.headers) return <Empty description="无响应头" />;
    return <ResponseHeaders headers={response.headers} />;
  };

  const passedTests = testResults.filter((t) => t.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="response-panel">
      <div className="response-status-bar">
        {response && (
          <>
            <span className={`status-code ${response.status_code >= 200 && response.status_code < 300 ? 'success' : 'error'}`}>
              {response.status_code}
            </span>
            <span className="duration">{response.duration}ms</span>
            {totalTests > 0 && (
              <span className={`test-results ${passedTests === totalTests ? 'all-passed' : 'some-failed'}`}>
                {passedTests}/{totalTests} tests passed
              </span>
            )}
          </>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="response-tabs"
        items={[
          {
            key: 'body',
            label: 'Body',
            children: renderBody(),
          },
          {
            key: 'headers',
            label: `Headers (${Object.keys(response?.headers || {}).length})`,
            children: renderHeaders(),
          },
          {
            key: 'scripts',
            label: (
              <span onClick={onToggleScriptLogs}>
                脚本日志 {scriptLogsExpanded ? '▼' : '▶'}
              </span>
            ),
            children: scriptLogsExpanded && (
              <div className="script-logs">
                {scriptLogs.length === 0 ? (
                  <Empty description="无日志" />
                ) : (
                  scriptLogs.map((log, i) => (
                    <div key={i} className="log-entry">
                      <pre>{log}</pre>
                    </div>
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'tests',
            label: (
              <span onClick={onToggleTestResults}>
                测试结果 {testResultsExpanded ? '▼' : '▶'}
              </span>
            ),
            children: testResultsExpanded && (
              <div className="test-results-list">
                {testResults.length === 0 ? (
                  <Empty description="无测试结果" />
                ) : (
                  testResults.map((test, i) => (
                    <div key={i} className={`test-item ${test.passed ? 'passed' : 'failed'}`}>
                      <span className="test-icon">{test.passed ? '✓' : '✗'}</span>
                      <span className="test-name">{test.name}</span>
                      {test.message && <span className="test-message">{test.message}</span>}
                    </div>
                  ))
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
