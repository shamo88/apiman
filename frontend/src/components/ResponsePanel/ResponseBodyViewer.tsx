import React from 'react';
import { EnhancedJsonView } from './EnhancedJsonView';

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
                                <EnhancedJsonView data={data} theme={appTheme} />
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