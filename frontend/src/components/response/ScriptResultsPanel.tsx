import React from 'react';

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
}

interface ScriptResultsPanelProps {
    script_logs?: string[];
    tests?: TestResult[];
    scriptResultsHeight: number | string;
    scriptLogsExpanded: boolean;
    testResultsExpanded: boolean;
    onScriptLogsExpand: () => void;
    onTestResultsExpand: () => void;
}

export const ScriptResultsPanel: React.FC<ScriptResultsPanelProps> = ({
    script_logs,
    tests,
    scriptResultsHeight,
    scriptLogsExpanded,
    testResultsExpanded,
    onScriptLogsExpand,
    onTestResultsExpand,
}) => {
    // Parse workflow items from logs
    const workflowItems: { name: string; type: 'pre' | 'post' | 'http'; status: 'running' | 'success' | 'failed'; duration?: number }[] = [];
    if (script_logs) {
        let currentScript = '';
        let currentType: 'pre' | 'post' | 'http' = 'pre';
        let currentStatus: 'running' | 'success' | 'failed' = 'running';

        for (const log of script_logs) {
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
            }
        }
    }

    return (
        <div className="script-results-panel" style={{ height: scriptResultsHeight }}>
            {workflowItems.length > 0 && (
                <div className="script-workflow">
                    {workflowItems.map((item, idx) => (
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
                            {idx < workflowItems.length - 1 && <div className="script-workflow-line"></div>}
                        </React.Fragment>
                    ))}
                </div>
            )}
            {script_logs && script_logs.length > 0 && (
                <div className="script-logs-section" style={{ marginTop: 16 }}>
                    <div
                        className="section-header clickable"
                        onClick={onScriptLogsExpand}
                    >
                        <span className={`expand-icon ${scriptLogsExpanded ? 'expanded' : ''}`}>▶</span>
                        <span className="section-title">Console Logs</span>
                        <span className="section-count">{script_logs.length}</span>
                    </div>
                    {scriptLogsExpanded && (
                        <div className="script-logs-content">
                            {script_logs.map((log: string, index: number) => {
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
            )}
            {tests && tests.length > 0 && (
                <div className="test-results-section">
                    <div
                        className="section-header clickable"
                        onClick={onTestResultsExpand}
                    >
                        <span className={`expand-icon ${testResultsExpanded ? 'expanded' : ''}`}>▶</span>
                        <span className="section-title">Test Results</span>
                        <span className="test-summary">
                            ({tests.filter((t: TestResult) => t.passed).length}/{tests.length} passed)
                        </span>
                    </div>
                    {testResultsExpanded && (
                        <div className="test-results-list">
                            {tests.map((test: TestResult, index: number) => (
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
};
