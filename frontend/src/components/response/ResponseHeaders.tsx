import React, { useState, useMemo } from 'react';
import { Tag, Tooltip } from 'antd';
import { CaretRightOutlined, CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';

interface ResponseHeadersProps {
    headers: Record<string, string[]> | null;
    height: number | string;
}

// 重要响应头分类
const IMPORTANT_HEADERS = new Set([
    'content-type', 'content-length', 'content-encoding',
    'cache-control', 'etag', 'last-modified', 'expires',
    'authorization', 'www-authenticate', 'x-api-key',
    'set-cookie', 'location', 'refresh',
    'access-control-allow-origin', 'access-control-allow-credentials',
    'access-control-allow-methods', 'access-control-allow-headers',
    'access-control-max-age',
    'strict-transport-security', 'content-security-policy',
]);

const COMMON_HEADERS = new Set([
    'date', 'server', 'connection', 'keep-alive',
    'vary', 'accept-ranges', 'content-range',
    'x-request-id', 'x-correlation-id', 'x-frame-options',
    'x-xss-protection', 'x-content-type-options',
    'transfer-encoding', 'upgrade',
    'x-powered-by', 'x-aspnet-version',
]);

type HeaderCategory = 'important' | 'common' | 'other';

interface HeaderGroup {
    key: string;
    label: string;
    items: Array<{ key: string; value: string }>;
    category: HeaderCategory;
    isExpanded: boolean;
}

function categorizeHeader(key: string): HeaderCategory {
    const lowerKey = key.toLowerCase();
    if (IMPORTANT_HEADERS.has(lowerKey)) return 'important';
    if (COMMON_HEADERS.has(lowerKey)) return 'common';
    return 'other';
}

function getCategoryLabel(category: HeaderCategory): string {
    const labels: Record<HeaderCategory, string> = {
        important: '重要',
        common: '常规',
        other: '其他',
    };
    return labels[category];
}

function getCategoryColor(category: HeaderCategory): string {
    const colors: Record<HeaderCategory, string> = {
        important: 'blue',
        common: 'default',
        other: 'gray',
    };
    return colors[category];
}

export const ResponseHeaders: React.FC<ResponseHeadersProps> = ({ headers, height }) => {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<HeaderCategory>>(
        new Set(['other'])
    );

    // 按类别分组
    const headerGroups = useMemo((): HeaderGroup[] => {
        if (!headers) return [];

        const categorized: Record<HeaderCategory, HeaderGroup> = {
            important: { key: 'important', label: '重要', items: [], category: 'important', isExpanded: true },
            common: { key: 'common', label: '常规', items: [], category: 'common', isExpanded: true },
            other: { key: 'other', label: '其他', items: [], category: 'other', isExpanded: true },
        };

        for (const [key, values] of Object.entries(headers)) {
            // 跳过 set-cookie，它单独处理
            if (key.toLowerCase() === 'set-cookie') continue;

            const category = categorizeHeader(key);
            for (const value of values) {
                categorized[category].items.push({ key, value });
            }
        }

        const result: HeaderGroup[] = [];
        if (categorized.important.items.length > 0) {
            result.push(categorized.important);
        }
        if (categorized.common.items.length > 0) {
            result.push(categorized.common);
        }
        if (categorized.other.items.length > 0) {
            result.push(categorized.other);
        }

        return result;
    }, [headers]);

    // Set-Cookie 单独处理
    const setCookieHeaders = useMemo(() => {
        if (!headers) return [];
        const key = Object.keys(headers).find(k => k.toLowerCase() === 'set-cookie');
        return key ? headers[key] : [];
    }, [headers]);

    const toggleCollapse = (category: HeaderCategory) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const copyHeader = (key: string, value: string) => {
        navigator.clipboard.writeText(`${key}: ${value}`).then(() => {
            message.success('已复制');
        });
    };

    const copyAllHeaders = () => {
        if (!headers) return;
        const text = Object.entries(headers)
            .map(([key, values]) => values.map(v => `${key}: ${v}`).join('\n'))
            .join('\n');
        navigator.clipboard.writeText(text).then(() => {
            message.success('已复制全部响应头');
        });
    };

    const getCategoryCount = (category: HeaderCategory): number => {
        const group = headerGroups.find(g => g.category === category);
        return group?.items.length || 0;
    };

    return (
        <div className="response-body" style={{ height }}>
            {/* 响应头概览 */}
            <div className="response-headers-summary">
                <div className="summary-categories">
                    {headerGroups.map(group => (
                        <Tag
                            key={group.key}
                            color={collapsedGroups.has(group.category) ? 'default' : getCategoryColor(group.category)}
                            className="category-tag clickable"
                            onClick={() => toggleCollapse(group.category)}
                        >
                            {getCategoryLabel(group.category)} ({group.items.length})
                            <CaretRightOutlined
                                style={{
                                    marginLeft: 4,
                                    transform: collapsedGroups.has(group.category) ? 'rotate(0deg)' : 'rotate(90deg)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </Tag>
                    ))}
                    {setCookieHeaders.length > 0 && (
                        <Tag color="orange" className="category-tag">
                            Set-Cookie ({setCookieHeaders.length})
                        </Tag>
                    )}
                </div>
                <Tooltip title="复制全部响应头">
                    <Tag className="copy-all-tag clickable" onClick={copyAllHeaders}>
                        <CopyOutlined /> 复制全部
                    </Tag>
                </Tooltip>
            </div>

            {/* 响应头内容 */}
            <div className="response-headers-content">
                {/* Set-Cookie 特殊展示 */}
                {setCookieHeaders.length > 0 && (
                    <div className="header-group header-group-cookies">
                        <div className="header-group-title">
                            <span className="group-label">Set-Cookie</span>
                            <span className="group-count">({setCookieHeaders.length})</span>
                        </div>
                        <div className="header-group-content">
                            {setCookieHeaders.map((cookie, i) => (
                                <div key={`cookie-${i}`} className="response-header-item cookie-item">
                                    <span className="header-key">Set-Cookie</span>
                                    <span className="header-value set-cookie-value">{cookie}</span>
                                    <Tooltip title="复制">
                                        <CopyOutlined
                                            className="copy-icon"
                                            onClick={() => copyHeader('Set-Cookie', cookie)}
                                        />
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 分组展示 */}
                {headerGroups.map(group => (
                    <div
                        key={group.key}
                        className={`header-group header-group-${group.category}`}
                    >
                        <div
                            className="header-group-title clickable"
                            onClick={() => toggleCollapse(group.category)}
                        >
                            <CaretRightOutlined
                                style={{
                                    transform: collapsedGroups.has(group.category) ? 'rotate(0deg)' : 'rotate(90deg)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                            <span className="group-label">{group.label}</span>
                            <span className="group-count">({group.items.length})</span>
                        </div>

                        {!collapsedGroups.has(group.category) && (
                            <div className="header-group-content">
                                {group.items.map((item, i) => (
                                    <div key={`${item.key}-${i}`} className="response-header-item">
                                        <span className="header-key">{item.key}</span>
                                        <span className="header-value">{item.value}</span>
                                        <Tooltip title="复制">
                                            <CopyOutlined
                                                className="copy-icon"
                                                onClick={() => copyHeader(item.key, item.value)}
                                            />
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
