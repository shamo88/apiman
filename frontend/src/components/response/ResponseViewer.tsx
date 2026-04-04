import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import { ResponseCookies, ResponseHeaders, ResponseStatus, ResponseBodyViewer, ScriptResultsPanel } from '../response';

interface ResponseViewerProps {
    response: any;
    formattedResponse: string;
    scriptLogsExpanded: boolean;
    testResultsExpanded: boolean;
    animationEnabled: boolean;
    forceListAnimation: boolean;
    appTheme: 'light' | 'dark';
    onScriptLogsExpand: () => void;
    onTestResultsExpand: () => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
    response,
    formattedResponse,
    scriptLogsExpanded,
    testResultsExpanded,
    animationEnabled,
    forceListAnimation,
    appTheme,
    onScriptLogsExpand,
    onTestResultsExpand,
}) => {
    const [responseBodyHeight, setResponseBodyHeight] = useState(300);
    const [scriptResultsHeight, setScriptResultsHeight] = useState(200);

    useEffect(() => {
        const calculateHeights = () => {
            const responsePanel = document.querySelector('.response-panel') as HTMLElement;
            const responseHeader = document.querySelector('.response-panel .response-header') as HTMLElement;
            if (responsePanel && responseHeader) {
                const panelHeight = responsePanel.offsetHeight;
                const headerHeight = responseHeader.offsetHeight;
                const bodyHeight = panelHeight - headerHeight - 40;
                setResponseBodyHeight(Math.max(100, bodyHeight));
                setScriptResultsHeight(Math.max(100, bodyHeight));
            }
        };

        calculateHeights();
        window.addEventListener('resize', calculateHeights);
        return () => window.removeEventListener('resize', calculateHeights);
    }, [response]);

    if (!response) return null;

    const scriptTabs = response.script_logs?.length || response.tests?.length
        ? [{
            key: 'scripts',
            label: '脚本结果',
            children: (
                <ScriptResultsPanel
                    script_logs={response.script_logs}
                    tests={response.tests}
                    scriptResultsHeight={scriptResultsHeight}
                    scriptLogsExpanded={scriptLogsExpanded}
                    testResultsExpanded={testResultsExpanded}
                    onScriptLogsExpand={onScriptLogsExpand}
                    onTestResultsExpand={onTestResultsExpand}
                />
            ),
        }]
        : [];

    return (
        <div className="response-panel">
            <ResponseStatus statusCode={response.status_code} duration={response.duration} />
            <Tabs
                defaultActiveKey="body"
                items={[
                    {
                        key: 'body',
                        label: 'Body',
                        children: (
                            <ResponseBodyViewer
                                body={response.body}
                                error={response.error}
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
                            <ResponseHeaders headers={response.headers} height={responseBodyHeight} />
                        ),
                    },
                    {
                        key: 'formatted',
                        label: 'JsonView',
                        children: (
                            <ResponseBodyViewer
                                body={response.body}
                                formattedResponse={formattedResponse}
                                height={responseBodyHeight}
                                appTheme={appTheme}
                                viewMode="json"
                            />
                        ),
                    },
                    {
                        key: 'cookies',
                        label: 'Cookie',
                        children: (
                            <ResponseCookies cookies={response.cookies || []} height={responseBodyHeight} />
                        ),
                    },
                    ...scriptTabs,
                ]}
                animated={(animationEnabled || forceListAnimation)}
            />
        </div>
    );
};
