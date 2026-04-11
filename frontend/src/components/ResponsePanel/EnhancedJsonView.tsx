import React, { useState, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import './EnhancedJsonView.css';

interface EnhancedJsonViewProps {
    data: unknown;
}

interface JsonNodeProps {
    keyName: string | number | null;
    value: unknown;
    path: string;
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
    isArrayChild: boolean;
    arrayIndex?: number;
    depth: number;
    isLast: boolean;
    searchQuery: string;
    matchedPaths: string[];
    currentMatchPath: string | null;
    isParentMatched: boolean;
}

type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'array';

const getValueType = (value: unknown): JsonValueType => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'undefined') return 'undefined';
    return typeof value as JsonValueType;
};

const copyToClipboard = async (text: string, type: 'path' | 'value' | 'key') => {
    try {
        await navigator.clipboard.writeText(text);
        const label = type === 'path' ? '路径' : type === 'key' ? '键名' : '值';
        message.success(`已复制 ${label}`);
    } catch {
        message.error('复制失败');
    }
};

// 复制按钮组件
const CopyButton: React.FC<{
    text: string;
    type: 'path' | 'value' | 'key';
    title: string;
}> = ({ text, type, title }) => {
    const [visible, setVisible] = useState(false);

    return (
        <span
            className="json-copy-btn"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(text, type);
            }}
            title={title}
            style={{ opacity: visible ? 1 : 0 }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        </span>
    );
};

// 高亮文本组件
const HighlightText: React.FC<{
    text: string;
    highlight: string;
    className: string;
}> = ({ text, highlight, className }) => {
    if (!highlight) {
        return <span className={className}>{text}</span>;
    }

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
        <span className={className}>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className="json-highlight">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

// 叶子节点（值）
const JsonLeaf: React.FC<JsonNodeProps> = ({
    keyName, value, path, isArrayChild, arrayIndex, isLast, depth,
    searchQuery, matchedPaths, currentMatchPath, isParentMatched
}) => {
    const type = getValueType(value);
    const [hovered, setHovered] = useState(false);

    const stringValue = useMemo(() => {
        if (type === 'string') return value as string;
        return String(value ?? '');
    }, [value, type]);

    const keyMatch = searchQuery && keyName !== null &&
        String(keyName).toLowerCase().includes(searchQuery.toLowerCase());
    const valueMatch = searchQuery &&
        stringValue.toLowerCase().includes(searchQuery.toLowerCase());

    const isMatched = matchedPaths.includes(path);
    const isCurrentMatch = isMatched && currentMatchPath === path;
    const isHighlight = isMatched;

    const renderValue = () => {
        switch (type) {
            case 'string':
                return (
                    <HighlightText
                        text={`"${stringValue}"`}
                        highlight={searchQuery}
                        className="json-string"
                    />
                );
            case 'number':
                return (
                    <HighlightText
                        text={stringValue}
                        highlight={searchQuery}
                        className="json-number"
                    />
                );
            case 'boolean':
                return (
                    <HighlightText
                        text={stringValue}
                        highlight={searchQuery}
                        className="json-boolean"
                    />
                );
            case 'null':
                return <span className="json-null">null</span>;
            case 'undefined':
                return <span className="json-undefined">undefined</span>;
            default:
                return <span className="json-value">{stringValue}</span>;
        }
    };

    return (
        <div
            className={`json-leaf ${hovered ? 'json-leaf-hovered' : ''} ${isHighlight ? 'json-highlight-row' : ''} ${isCurrentMatch ? 'json-current-match' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ paddingLeft: `${depth * 16}px` }}
            data-path={path}
        >
            {isArrayChild && (
                <span className="json-array-index">[{arrayIndex}]</span>
            )}
            {keyName !== null && (
                <>
                    <span className="json-key">
                        <HighlightText
                            text={`"${keyName}"`}
                            highlight={searchQuery}
                            className=""
                        />
                    </span>
                    <span className="json-colon">: </span>
                </>
            )}
            {renderValue()}
            {hovered && (
                <span className="json-leaf-actions">
                    <CopyButton text={path} type="path" title="复制路径" />
                    <CopyButton text={String(value ?? '')} type="value" title="复制值" />
                </span>
            )}
            {!isLast && <span className="json-comma">,</span>}
        </div>
    );
};

// 树枝节点（对象/数组）
const JsonBranch: React.FC<JsonNodeProps> = ({
    keyName, value, path, expandedPaths, onToggle, isArrayChild, arrayIndex,
    depth, isLast, searchQuery, matchedPaths, currentMatchPath, isParentMatched
}) => {
    const type = getValueType(value);
    const isExpandable = type === 'object' || type === 'array';
    const isExpanded = expandedPaths.has(path);
    const [hovered, setHovered] = useState(false);

    const entries = useMemo(() => {
        if (type === 'array') {
            return (value as unknown[]).map((v, i) => [i, v] as [number, unknown]);
        }
        return Object.entries(value as Record<string, unknown>);
    }, [value, type]);

    const itemCount = entries.length;

    const toggleExpand = useCallback(() => {
        onToggle(path);
    }, [path, onToggle]);

    if (!isExpandable) {
        return (
            <JsonLeaf
                keyName={keyName}
                value={value}
                path={path}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                isArrayChild={isArrayChild}
                arrayIndex={arrayIndex}
                depth={depth}
                isLast={isLast}
                searchQuery={searchQuery}
                matchedPaths={matchedPaths}
                currentMatchPath={currentMatchPath}
                isParentMatched={isParentMatched}
            />
        );
    }

    const isMatched = matchedPaths.includes(path);
    const isCurrentMatch = isMatched && currentMatchPath === path;
    const isHighlight = isMatched;

    return (
        <div
            className={`json-branch ${hovered ? 'json-branch-hovered' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-path={path}
        >
            <div
                className={`json-branch-header ${isHighlight ? 'json-highlight-row' : ''} ${isCurrentMatch ? 'json-current-match' : ''}`}
                style={{ paddingLeft: `${depth * 16}px` }}
            >
                {/* 缩进线 */}
                {Array.from({ length: depth }).map((_, i) => (
                    <span
                        key={i}
                        className="json-indent-line"
                        style={{ left: `${i * 16 + 7}px` }}
                    />
                ))}

                {/* 展开/折叠按钮 */}
                <span className="json-toggle" onClick={toggleExpand}>
                    {isExpanded ? (
                        <svg className="json-toggle-icon" viewBox="0 0 16 16" width="12" height="12">
                            <path fill="currentColor" d="M4 6l4 4 4-4"/>
                        </svg>
                    ) : (
                        <svg className="json-toggle-icon" viewBox="0 0 16 16" width="12" height="12">
                            <path fill="currentColor" d="M6 4l4 4-4 4"/>
                        </svg>
                    )}
                </span>

                {isArrayChild && (
                    <span className="json-array-index">[{arrayIndex}]</span>
                )}

                {keyName !== null && (
                    <>
                        <span className="json-key">
                            <HighlightText
                                text={`"${keyName}"`}
                                highlight={searchQuery}
                                className=""
                            />
                        </span>
                        <span className="json-colon">: </span>
                    </>
                )}

                {/* 括号 */}
                <span className="json-bracket">
                    {type === 'array' ? '[' : '{'}
                </span>

                {/* 折叠预览 */}
                {!isExpanded && (
                    <>
                        <span className="json-preview">
                            {type === 'array'
                                ? `Array(${itemCount})`
                                : `Object(${itemCount})`}
                        </span>
                        <span className="json-bracket">
                            {type === 'array' ? ']' : '}'}
                        </span>
                    </>
                )}

                {/* 悬停时显示操作按钮 */}
                {hovered && (
                    <span className="json-branch-actions">
                        <CopyButton text={path} type="path" title="复制路径" />
                        <CopyButton text={keyName !== null ? String(keyName) : path} type="key" title="复制键名" />
                    </span>
                )}

                {!isLast && !isExpanded && <span className="json-comma">,</span>}
            </div>

            {/* 子节点 */}
            {isExpanded && (
                <div className="json-children">
                    {entries.map(([key, val], idx) => (
                        <JsonNode
                            key={key}
                            keyName={key}
                            value={val}
                            path={type === 'array' ? `${path}[${key}]` : `${path}.${key}`}
                            expandedPaths={expandedPaths}
                            onToggle={onToggle}
                            isArrayChild={type === 'array'}
                            arrayIndex={type === 'array' ? idx : undefined}
                            depth={depth + 1}
                            isLast={idx === entries.length - 1}
                            searchQuery={searchQuery}
                            matchedPaths={matchedPaths}
                            currentMatchPath={currentMatchPath}
                            isParentMatched={isHighlight}
                        />
                    ))}
                    <div
                        className="json-branch-footer"
                        style={{ paddingLeft: `${depth * 16}px` }}
                    >
                        {Array.from({ length: depth }).map((_, i) => (
                            <span
                                key={i}
                                className="json-indent-line"
                                style={{ left: `${i * 16 + 7}px` }}
                            />
                        ))}
                        <span className="json-toggle-placeholder" />
                        <span className="json-bracket">
                            {type === 'array' ? ']' : '}'}
                        </span>
                        {!isLast && <span className="json-comma">,</span>}
                    </div>
                </div>
            )}
        </div>
    );
};

const JsonNode: React.FC<JsonNodeProps> = (props) => {
    const type = getValueType(props.value);
    const isExpandable = type === 'object' || type === 'array';

    if (!isExpandable) {
        return <JsonLeaf {...props} />;
    }

    return <JsonBranch {...props} />;
};

// 搜索组件
const JsonSearch: React.FC<{
    onSearch: (query: string) => void;
    onNext: () => void;
    onPrev: () => void;
    placeholder?: string;
    resultCount?: number;
    currentIndex: number;
}> = ({ onSearch, onNext, onPrev, placeholder = '搜索键名或值...', resultCount, currentIndex }) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onSearch(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setValue('');
            onSearch('');
            inputRef.current?.blur();
        } else if (e.key === 'Enter') {
            // Enter 跳转到下一个
            if (e.shiftKey) {
                onPrev();
            } else {
                onNext();
            }
        }
    };

    const hasResults = resultCount !== undefined && resultCount > 0;

    return (
        <div className="json-search">
            <div className="json-search-input-wrapper">
                <svg className="json-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className="json-search-input"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                />
            </div>
            <div className="json-search-right">
                {value && (
                    <button
                        className="json-search-clear"
                        onClick={() => {
                            setValue('');
                            onSearch('');
                        }}
                        title="清除搜索"
                    >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                )}
                {hasResults && (
                    <div className="json-search-nav">
                        <button
                            className="json-nav-btn"
                            onClick={onPrev}
                            title="上一个 (Shift+Enter)"
                            disabled={currentIndex <= 0}
                        >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M10 3l-5 5 5 5V3z"/>
                            </svg>
                        </button>
                        <span className="json-search-count">
                            {currentIndex + 1}/{resultCount}
                        </span>
                        <button
                            className="json-nav-btn"
                            onClick={onNext}
                            title="下一个 (Enter)"
                            disabled={currentIndex >= resultCount - 1}
                        >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 3l5 5-5 5V3z"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 收集匹配路径
const collectMatchedPaths = (
    obj: unknown,
    path: string,
    query: string,
    results: Set<string>
): boolean => {
    if (!query) return false;

    const type = getValueType(obj);
    const lowerQuery = query.toLowerCase();

    // 检查键名
    const entries = type === 'array'
        ? (obj as unknown[]).map((v, i) => [i, v] as [number, unknown])
        : Object.entries(obj as Record<string, unknown>);

    let hasMatch = false;

    for (const [key, val] of entries) {
        const keyStr = String(key);
        const valType = getValueType(val);
        const childPath = type === 'array' ? `${path}[${key}]` : `${path}.${key}`;

        // 键名匹配
        if (keyStr.toLowerCase().includes(lowerQuery)) {
            results.add(childPath);
            hasMatch = true;
        }

        // 值匹配
        if (valType !== 'object' && valType !== 'array') {
            const valStr = String(val ?? '');
            if (valStr.toLowerCase().includes(lowerQuery)) {
                results.add(childPath);
                hasMatch = true;
            }
        }

        // 递归检查子节点
        if (valType === 'object' || valType === 'array') {
            if (collectMatchedPaths(val, childPath, query, results)) {
                hasMatch = true;
            }
        }
    }

    return hasMatch;
};

export const EnhancedJsonView: React.FC<EnhancedJsonViewProps> = ({ data }) => {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
        const initialExpanded = new Set<string>();
        const collectPaths = (obj: unknown, currentPath: string, depth: number = 0) => {
            if (obj && typeof obj === 'object' && depth < 3) {
                initialExpanded.add(currentPath);
                if (Array.isArray(obj)) {
                    obj.slice(0, 10).forEach((item, index) => {
                        collectPaths(item, `${currentPath}[${index}]`, depth + 1);
                    });
                } else {
                    Object.entries(obj as Record<string, unknown>).slice(0, 10).forEach(([key, value]) => {
                        collectPaths(value, `${currentPath}.${key}`, depth + 1);
                    });
                }
            }
        };
        collectPaths(data, 'root', 0);
        return initialExpanded;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [matchedPaths, setMatchedPaths] = useState<string[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [allExpanded, setAllExpanded] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        if (!query) {
            setMatchedPaths([]);
            return;
        }

        // 收集所有匹配路径
        const results = new Set<string>();
        collectMatchedPaths(data, 'root', query, results);
        const pathArray = Array.from(results);
        setMatchedPaths(pathArray);
        setCurrentMatchIndex(0);

        // 自动展开包含匹配结果的路径
        if (pathArray.length > 0) {
            const pathsToExpand = new Set<string>();
            const addParentPaths = (path: string) => {
                const parts = path.split('.');
                let current = 'root';
                pathsToExpand.add(current);
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.includes('[')) {
                        // 数组索引
                        current = part;
                    } else {
                        current = current ? `${current}.${part}` : part;
                    }
                    pathsToExpand.add(current);
                }
            };

            pathArray.forEach(path => addParentPaths(path));

            setExpandedPaths(prev => {
                const next = new Set(prev);
                pathsToExpand.forEach(p => next.add(p));
                return next;
            });
        }
    }, [data]);

    // 跳转到指定匹配位置
    const scrollToMatch = useCallback((index: number) => {
        if (matchedPaths.length === 0) return;

        const targetPath = matchedPaths[index];
        // 查找对应的 DOM 元素
        const elements = document.querySelectorAll(`[data-path="${targetPath}"]`);
        if (elements.length > 0) {
            elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [matchedPaths]);

    const handleNextMatch = useCallback(() => {
        if (matchedPaths.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % matchedPaths.length;
        setCurrentMatchIndex(nextIndex);
        scrollToMatch(nextIndex);
    }, [currentMatchIndex, matchedPaths.length, scrollToMatch]);

    const handlePrevMatch = useCallback(() => {
        if (matchedPaths.length === 0) return;
        const prevIndex = currentMatchIndex === 0 ? matchedPaths.length - 1 : currentMatchIndex - 1;
        setCurrentMatchIndex(prevIndex);
        scrollToMatch(prevIndex);
    }, [currentMatchIndex, matchedPaths.length, scrollToMatch]);

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

    // 展开/折叠全部
    const toggleAll = useCallback(() => {
        if (allExpanded) {
            setExpandedPaths(new Set<string>());
            setAllExpanded(false);
        } else {
            const allPaths = new Set<string>();
            const collectPaths = (obj: unknown, currentPath: string) => {
                if (obj && typeof obj === 'object') {
                    allPaths.add(currentPath);
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
            setExpandedPaths(allPaths);
            setAllExpanded(true);
        }
    }, [data, allExpanded]);

    return (
        <div className="enhanced-json-view" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="json-toolbar">
                <JsonSearch
                    onSearch={handleSearch}
                    onNext={handleNextMatch}
                    onPrev={handlePrevMatch}
                    placeholder="搜索键名或值..."
                    resultCount={matchedPaths.length}
                    currentIndex={currentMatchIndex}
                />
                <div className="json-toolbar-actions">
                    <button className="json-toolbar-btn" onClick={toggleAll} title={allExpanded ? "折叠全部" : "展开全部"}>
                        {allExpanded ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1 12l7-8 7 8H1z"/>
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1 4l7 8 7-8H1z"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            <div className="json-content">
                <JsonNode
                    keyName={null}
                    value={data}
                    path="root"
                    expandedPaths={expandedPaths}
                    onToggle={handleToggle}
                    isArrayChild={false}
                    depth={0}
                    isLast={true}
                    searchQuery={searchQuery}
                    matchedPaths={matchedPaths}
                    currentMatchPath={matchedPaths.length > 0 ? matchedPaths[currentMatchIndex] : null}
                    isParentMatched={false}
                />
            </div>
        </div>
    );
};
