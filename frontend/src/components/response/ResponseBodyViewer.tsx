import React from 'react';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface ResponseBodyViewerProps {
    body: string;
    error?: string;
    formattedResponse?: string;
    height: number | string;
    appTheme: 'light' | 'dark';
    viewMode: 'body' | 'json';
}

export const ResponseBodyViewer: React.FC<ResponseBodyViewerProps> = ({
    body,
    error,
    formattedResponse,
    height,
    appTheme,
    viewMode,
}) => {
    if (viewMode === 'json') {
        return (
            <div className="response-body response-json" style={{ height }}>
                {(() => {
                    try {
                        const data = JSON.parse(body || '{}');
                        return (
                            <div className="json-view-container">
                                <JsonView
                                    data={data}
                                    style={appTheme === 'dark' ? darkStyles : undefined}
                                    shouldExpandNode={allExpanded}
                                    clickToExpandNode
                                />
                            </div>
                        );
                    } catch {
                        return <pre className="response-content">{formattedResponse || '非 JSON 格式或无响应内容'}</pre>;
                    }
                })()}
            </div>
        );
    }

    return (
        <div className="response-body" style={{ height }}>
            <pre className="response-content">
                {body || error || 'No response body'}
            </pre>
        </div>
    );
};
