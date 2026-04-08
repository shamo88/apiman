import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import 'react-json-view-lite/dist/index.css';

interface EnhancedJsonViewProps {
    data: unknown;
    theme?: 'light' | 'dark';
}

interface JsonNodeProps {
    keyName: string | number | null;
    value: unknown;
    path: string;
    theme: 'light' | 'dark';
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
    isArrayChild: boolean;
    arrayIndex?: number;
}

const TYPE_ICONS: Record<string, string> = {
    string: '"',
    number: '#',
    boolean: '◆',
    null: '∅',
    object: '{}',
    array: '[]',
};

type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array' | 'undefined';

const getValueType = (value: unknown): JsonValueType => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value as JsonValueType;
};

const copyToClipboard = async (text: string, type: 'path' | 'value') => {
    try {
        await navigator.clipboard.writeText(text);
        message.success(`已复制 ${type === 'path' ? '路径' : '值'}`);
    } catch {
        message.error('复制失败');
    }
};

const JsonValue: React.FC<{
    value: string | number | boolean | null;
    path: string;
    theme: 'light' | 'dark';
}> = ({ value, path, theme }) => {
    const [showActions, setShowActions] = useState(false);
    const type = getValueType(value);

    const renderValue = () => {
        if (type === 'string') {
            return <span className={`json-value json-string ${theme}`}>"{value as string}"</span>;
        }
        if (type === 'number') {
            return <span className={`json-value json-number ${theme}`}>{value}</span>;
        }
        if (type === 'boolean') {
            return <span className={`json-value json-boolean ${theme}`}>{value ? 'true' : 'false'}</span>;
        }
        return <span className={`json-value json-null ${theme}`}>null</span>;
    };

    return (
        <span
            className="json-value-wrapper"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <span className={`json-type-icon json-type-${type} ${theme}`}>
                {TYPE_ICONS[type]}
            </span>
            {renderValue()}
            {showActions && (
                <span className="json-value-actions">
                    <button
                        className={`json-action-btn ${theme}`}
                        onClick={() => copyToClipboard(path, 'path')}
                        title="复制路径"
                    >
                        ⧉
                    </button>
                    <button
                        className={`json-action-btn ${theme}`}
                        onClick={() => copyToClipboard(String(value), 'value')}
                        title="复制值"
                    >
                        ⎘
                    </button>
                </span>
            )}
        </span>
    );
};

const JsonNode: React.FC<JsonNodeProps> = ({
    keyName,
    value,
    path,
    theme,
    expandedPaths,
    onToggle,
    isArrayChild,
    arrayIndex,
}) => {
    const type = getValueType(value);
    const isExpandable = type === 'object' || type === 'array';
    const isExpanded = expandedPaths.has(path);

    const toggleExpand = useCallback(() => {
        onToggle(path);
    }, [path, onToggle]);

    const handleCopyPath = useCallback(() => {
        copyToClipboard(path, 'path');
    }, [path]);

    if (!isExpandable) {
        return (
            <div className="json-node json-leaf">
                {isArrayChild && (
                    <span className={`json-array-index ${theme}`}>[{arrayIndex}]</span>
                )}
                {keyName !== null && (
                    <>
                        <span className={`json-key ${theme}`}>"{keyName}"</span>
                        <span className={`json-colon ${theme}`}>: </span>
                    </>
                )}
                <JsonValue value={value as string | number | boolean | null} path={path} theme={theme} />
            </div>
        );
    }

    const entries: [string | number, unknown][] = type === 'array' 
        ? (value as unknown[]).map((v, i) => [i, v] as [number, unknown])
        : Object.entries(value as Record<string, unknown>);

    const itemCount = entries.length;
    const collapsedPreview = type === 'array' 
        ? `Array(${itemCount})` 
        : `Object(${itemCount})`;

    return (
        <div className="json-node json-branch">
            <span
                className={`json-expand-icon ${theme} ${isExpanded ? 'expanded' : 'collapsed'}`}
                onClick={toggleExpand}
            >
                {isExpanded ? '▾' : '▸'}
            </span>
            {isArrayChild && (
                <span className={`json-array-index ${theme}`}>[{arrayIndex}]</span>
            )}
            {keyName !== null && (
                <>
                    <span className={`json-key ${theme}`}>"{keyName}"</span>
                    <span className={`json-colon ${theme}`}>: </span>
                </>
            )}
            <span className={`json-bracket ${theme}`}>
                {type === 'array' ? '[' : '{'}
            </span>
            {!isExpanded && (
                <span className={`json-collapsed-preview ${theme}`}>
                    {collapsedPreview}
                </span>
            )}
            {!isExpanded && (
                <span className={`json-bracket ${theme}`}>
                    {type === 'array' ? ']' : '}'}
                </span>
            )}
            <button
                className={`json-path-btn ${theme}`}
                onClick={handleCopyPath}
                title="复制路径"
            >
                {path.split('.').pop() || path}
            </button>
            {isExpanded && (
                <div className={`json-children ${theme}`}>
                    {entries.map(([key, val], idx) => (
                        <JsonNode
                            key={key}
                            keyName={key}
                            value={val}
                            path={type === 'array' ? `${path}[${key}]` : `${path}.${key}`}
                            theme={theme}
                            expandedPaths={expandedPaths}
                            onToggle={onToggle}
                            isArrayChild={type === 'array'}
                            arrayIndex={type === 'array' ? idx : undefined}
                        />
                    ))}
                </div>
            )}
            {isExpanded && (
                <>
                    <span
                        className={`json-expand-icon ${theme} expanded`}
                        onClick={toggleExpand}
                        style={{ visibility: 'hidden' }}
                    >
                        ▾
                    </span>
                    <span className={`json-bracket ${theme}`}>
                        {type === 'array' ? ']' : '}'}
                    </span>
                </>
            )}
        </div>
    );
};

export const EnhancedJsonView: React.FC<EnhancedJsonViewProps> = ({
    data,
    theme = 'light',
}) => {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
        const initialExpanded = new Set<string>();
        const collectPaths = (obj: unknown, currentPath: string) => {
            if (obj && typeof obj === 'object') {
                initialExpanded.add(currentPath);
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        collectPaths(item, `${currentPath}[${index}]`);
                    });
                } else {
                    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
                        collectPaths(value, `${currentPath}.${key}`);
                    });
                }
            }
        };
        collectPaths(data, 'root');
        return initialExpanded;
    });

    const handleToggle = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    return (
        <div className={`enhanced-json-view ${theme}`}>
            <JsonNode
                keyName={null}
                value={data}
                path="root"
                theme={theme}
                expandedPaths={expandedPaths}
                onToggle={handleToggle}
                isArrayChild={false}
            />
        </div>
    );
};
