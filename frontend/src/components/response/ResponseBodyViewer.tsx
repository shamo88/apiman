import React, { useMemo, useCallback } from 'react';
import { JsonView, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Button, Tooltip, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import {
    detectResponseType,
    getContentType,
    formatXML,
    highlightHTML,
    type ResponseType,
} from '../../utils/responseUtils';

interface ResponseBodyViewerProps {
    body: string;
    headers?: Record<string, string[]> | null;
    error?: string;
    formattedResponse?: string;
    height: number | string;
    appTheme: 'light' | 'dark';
    /** 视图模式：raw=原始文本, formatted=格式化视图 */
    viewMode: 'raw' | 'formatted';
    onViewModeChange?: (mode: 'raw' | 'formatted') => void;
    /** 二进制数据 base64 编码 */
    bodyBase64?: string;
    /** 是否为二进制响应 */
    isBinary?: boolean;
}

// 二进制响应占位组件
const BinaryPlaceholder: React.FC<{ contentType: string | null; onDownload?: () => void }> = ({
    contentType,
    onDownload,
}) => {
    const isImage = contentType?.startsWith('image/');
    const isPDF = contentType === 'application/pdf';

    return (
        <div className="binary-placeholder">
            <div className="binary-icon">
                {isImage ? '🖼️' : isPDF ? '📄' : '📦'}
            </div>
            <div className="binary-title">Binary Response</div>
            <div className="binary-info">
                Content-Type: {contentType || 'application/octet-stream'}
            </div>
            <div className="binary-hint">
                {isImage ? '图片响应，可点击下方按钮预览' : isPDF ? 'PDF 文档，可点击下载查看' : '此响应为二进制格式，无法在浏览器中预览'}
            </div>
            {onDownload && (
                <Button icon={<DownloadOutlined />} onClick={onDownload} type="primary">
                    下载原始文件
                </Button>
            )}
        </div>
    );
};

export const ResponseBodyViewer: React.FC<ResponseBodyViewerProps> = ({
    body,
    headers,
    error,
    formattedResponse,
    height,
    appTheme,
    viewMode,
    onViewModeChange,
    bodyBase64,
    isBinary,
}) => {
    // 自动检测响应类型
    const contentType = useMemo(() => getContentType(headers || null), [headers]);
    const detected = useMemo(
        () => detectResponseType(body, contentType),
        [body, contentType]
    );

    // 复制到剪贴板
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(body).then(() => {
            message.success('已复制到剪贴板');
        });
    }, [body]);

    // 下载响应
    const handleDownload = useCallback(() => {
        if (bodyBase64) {
            const link = document.createElement('a');
            link.href = `data:${contentType || 'application/octet-stream'};base64,${bodyBase64}`;
            link.download = `response_${Date.now()}`;
            link.click();
        } else {
            const blob = new Blob([body], { type: contentType || 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `response_${Date.now()}.${detected.type === 'json' ? 'json' : 'txt'}`;
            link.click();
            URL.revokeObjectURL(url);
        }
    }, [body, bodyBase64, contentType, detected.type]);

    // 渲染格式化内容
    const renderFormattedContent = () => {
        switch (detected.type) {
            case 'json':
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
                    return <pre className="response-content">{body}</pre>;
                }

            case 'xml':
            case 'html':
                const formatted = detected.type === 'xml' ? formatXML(body) : body;
                const highlighted = highlightHTML(formatted);
                return (
                    <pre
                        className="response-content html-content"
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                    />
                );

            case 'binary':
                return (
                    <BinaryPlaceholder
                        contentType={detected.contentType}
                        onDownload={handleDownload}
                    />
                );

            case 'text':
            case 'unknown':
            default:
                return <pre className="response-content">{body}</pre>;
        }
    };

    // 渲染原始内容
    const renderRawContent = () => {
        if (detected.type === 'binary') {
            return (
                <BinaryPlaceholder
                    contentType={detected.contentType}
                    onDownload={handleDownload}
                />
            );
        }
        return <pre className="response-content">{body || error || 'No response body'}</pre>;
    };

    // 类型标签
    const typeLabel = useMemo(() => {
        const labels: Record<ResponseType, string> = {
            json: 'JSON',
            xml: 'XML',
            html: 'HTML',
            text: 'Text',
            binary: 'Binary',
            unknown: 'Unknown',
        };
        return labels[detected.type] || 'Unknown';
    }, [detected.type]);

    return (
        <div className="response-body" style={{ height }}>
            {/* 工具栏 */}
            <div className="response-body-toolbar">
                <div className="toolbar-left">
                    {/* Raw/Formatted 切换 */}
                    <div className="view-mode-toggle">
                        <button
                            className={`mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
                            onClick={() => onViewModeChange?.('raw')}
                        >
                            Raw
                        </button>
                        <button
                            className={`mode-btn ${viewMode === 'formatted' ? 'active' : ''}`}
                            onClick={() => onViewModeChange?.('formatted')}
                        >
                            Formatted
                        </button>
                    </div>
                    {/* 类型标签 */}
                    <span className={`response-type-badge type-${detected.type}`}>
                        {typeLabel}
                    </span>
                </div>

                <div className="toolbar-right">
                    <Tooltip title="复制响应体">
                        <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={handleCopy}
                            size="small"
                        />
                    </Tooltip>
                    <Tooltip title="下载响应">
                        <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={handleDownload}
                            size="small"
                        />
                    </Tooltip>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="response-body-content">
                {viewMode === 'raw' ? renderRawContent() : renderFormattedContent()}
            </div>
        </div>
    );
};
