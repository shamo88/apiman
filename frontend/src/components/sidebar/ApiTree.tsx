import React from 'react';
import { Dropdown, Spin } from 'antd';
import {
    ApiOutlined, CopyOutlined, EditOutlined, FileOutlined, FolderOutlined,
    MoreOutlined, PlusOutlined, RightOutlined, DownOutlined, CloseOutlined, ExperimentOutlined
} from '@ant-design/icons';
import type { ProjectTree } from '../../types';

interface ApiTreeProps {
    tree: ProjectTree | null;
    loading: boolean;
    expandedKeys: string[];
    selectedKeys: string[];
    collapsedFolders: Set<string>;
    expandedRequestPaths: Set<string>;
    sidebarHighlightedCasePath: string;
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    invalidDropHint: { message: string; x: number; y: number } | null;
    movedHighlightPath: string | null;
    animationEnabled: boolean;
    forceListAnimation: boolean;
    currentProjectId?: string;
    currentRequestPath?: string;
    // Callbacks
    onToggleExpand: (key: string) => void;
    onFolderCollapse: (folderPath: string) => void;
    onItemClick: (key: string, node: ProjectTree) => void;
    onAddRequest: (folderPath: string) => void;
    onAddFolder: (folderPath: string) => void;
    onRename: (type: 'request' | 'folder', path: string, name: string) => void;
    onDelete: (type: 'request' | 'folder', path: string) => void;
    onCopy: (path: string) => void;
    onCaseClick: (casePath: string) => void;
    onToggleCasesExpanded: (requestPath: string) => void;
    onAddCase: (targetPath: string) => void;
    onDeleteCase: (casePath: string) => void;
    onDuplicateCase: (casePath: string) => void;
    onRenameCase: (casePath: string, currentName: string) => void;
    onDragStart: (path: string) => void;
    onFolderDragStart: (path: string) => void;
    onClearDragState: () => void;
    onDragOver?: (e: React.DragEvent, node: ProjectTree) => void;
    onDrop?: (e: React.DragEvent, node: ProjectTree) => void;
    // Drag and drop state setters
    onSetDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
    onSetDropTargetFolderPath: (path: string | null) => void;
    onSetInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
    // Tree helpers
    onCheckDropAppendIntoFolder: (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string) => { ok: boolean; reason?: string };
    onCheckDropOrdered: (dragNode: { type: 'request' | 'folder'; path: string }, parentContainerPath: string, beforeID: string) => { ok: boolean; reason?: string };
    onGetDropHintMessage: (reason?: string) => string;
    onMoveRequestNode: (requestPath: string, targetFolderPath: string, beforeID: string) => Promise<void>;
    onMoveFolderNode: (folderPath: string, targetParentPath: string, beforeID: string) => Promise<void>;
    onGetParentFolderPath: (path: string) => string | null;
    onGetChildrenByFolderPath: (folderPath: string) => ProjectTree[];
    // Filters
    searchKeyword: string;
    filterMethod: string;
}

const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
        GET: '#61affe',
        POST: '#49cc90',
        PUT: '#fca130',
        DELETE: '#f93e3e',
        PATCH: '#50e3c2',
        OPTIONS: '#0d5aa7',
        HEAD: '#9012fe',
    };
    return colors[method.toUpperCase()] || '#999';
};

const formatSidebarMethodLabel = (method: string): string => {
    return method.toUpperCase();
};

const parseRequestCaseRef = (path: string): { projectId: string; requestId: string; caseId: string } | null => {
    if (!path.startsWith('requestCase|')) return null;
    const parts = path.slice('requestCase|'.length).split('|');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return { projectId: parts[0], requestId: parts[1], caseId: parts[2] };
};

const requestRefFromIds = (projectId: string, requestId: string) => `request|${projectId}|${requestId}`;

export const ApiTree: React.FC<ApiTreeProps> = ({
    tree,
    loading,
    expandedKeys,
    selectedKeys,
    collapsedFolders,
    expandedRequestPaths,
    sidebarHighlightedCasePath,
    draggingNode,
    dropTargetFolderPath,
    movedHighlightPath,
    animationEnabled,
    forceListAnimation,
    currentRequestPath,
    onToggleExpand,
    onFolderCollapse,
    onItemClick,
    onAddRequest,
    onAddFolder,
    onRename,
    onDelete,
    onCopy,
    onCaseClick,
    onToggleCasesExpanded,
    onAddCase,
    onDeleteCase,
    onDuplicateCase,
    onRenameCase,
    onDragStart,
    onFolderDragStart,
    onClearDragState,
    onSetDraggingNode,
    onSetDropTargetFolderPath,
    onSetInvalidDropHint,
    onCheckDropAppendIntoFolder,
    onCheckDropOrdered,
    onGetDropHintMessage,
    onMoveRequestNode,
    onMoveFolderNode,
    onGetParentFolderPath,
    onGetChildrenByFolderPath,
    searchKeyword,
    filterMethod,
}) => {
    // Filter tree based on search keyword and method
    const filterTree = (node: ProjectTree, keyword: string, method: string): ProjectTree | null => {
        const keywordLower = keyword.toLowerCase();
        const matchesKeyword = !keyword ||
            node.name.toLowerCase().includes(keywordLower) ||
            (node.url && node.url.toLowerCase().includes(keywordLower));
        const matchesMethod = method === 'ALL' || !node.method || node.method === method;

        const filteredChildren = (node.children || [])
            .map(child => filterTree(child, keyword, method))
            .filter((child): child is ProjectTree => child !== null);

        // Include node if it matches or has matching children
        if (matchesKeyword && matchesMethod) {
            return { ...node, children: filteredChildren };
        }

        // If children have matches, include parent with filtered children
        if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
        }

        return null;
    };

    const filteredTree = searchKeyword || filterMethod !== 'ALL'
        ? (tree ? filterTree(tree, searchKeyword, filterMethod) : null)
        : tree;

    const renderCaseRow = (c: ProjectTree) => {
        const caseActive = sidebarHighlightedCasePath !== '' && sidebarHighlightedCasePath === c.path;
        return (
            <div
                key={c.path}
                className={`api-case-item ${caseActive ? 'active' : ''} ${movedHighlightPath === c.path ? 'moved-highlight' : ''}`}
                onClick={() => onCaseClick(c.path!)}
            >
                <div className="api-request-expand-cell" aria-hidden>
                    <span className="api-request-expand-placeholder" />
                </div>
                <div className="api-item-main">
                    <span className="api-method-col api-method-col--case-icon" title="用例" aria-hidden>
                        <ExperimentOutlined className="api-case-type-icon" />
                    </span>
                    <span className="api-case-name">{c.name}</span>
                </div>
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'dup',
                                icon: <CopyOutlined />,
                                label: '复制',
                                onClick: () => { onDuplicateCase(c.path!); },
                            },
                            {
                                key: 'ren',
                                icon: <EditOutlined />,
                                label: '重命名',
                                onClick: () => { onRenameCase(c.path!, c.name); },
                            },
                            { type: 'divider' },
                            {
                                key: 'del',
                                icon: <CloseOutlined />,
                                label: '删除',
                                danger: true,
                                onClick: () => { onDeleteCase(c.path!); },
                            },
                        ],
                    }}
                    trigger={['click']}
                >
                    <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
                        <MoreOutlined />
                    </button>
                </Dropdown>
            </div>
        );
    };

    const renderRequestItem = (api: ProjectTree) => {
        const caseKids = (api.children || []).filter((c): c is ProjectTree => c.type === 'case');
        const hasCases = caseKids.length > 0;
        const expanded = !!(api.path && expandedRequestPaths.has(api.path));
        const caseHighlightRef = sidebarHighlightedCasePath
            ? parseRequestCaseRef(sidebarHighlightedCasePath)
            : null;
        const caseHighlightReqPath = caseHighlightRef
            ? requestRefFromIds(caseHighlightRef.projectId, caseHighlightRef.requestId)
            : '';
        const parentOpen = currentRequestPath === api.path && caseHighlightReqPath !== api.path;
        const method = formatSidebarMethodLabel(api.method || 'GET');
        const mc = getMethodColor(api.method || 'GET');

        return (
            <div key={api.path} className="api-request-block">
                <div
                    className={`api-item ${parentOpen ? 'is-parent-open' : ''} ${movedHighlightPath === api.path ? 'moved-highlight' : ''}`}
                    onClick={() => onItemClick(api.path!, api)}
                    onDragOver={(e) => {
                        e.stopPropagation();
                        if (!draggingNode) return;
                        const parentPath = onGetParentFolderPath(api.path!);
                        if (parentPath === null) return;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const topHalf = e.clientY < rect.top + rect.height / 2;
                        const sibs = onGetChildrenByFolderPath(parentPath).filter((c) => c.type === 'folder' || c.type === 'request');
                        const idx = sibs.findIndex((c) => c.path === api.path);
                        const beforeID = topHalf ? api.id : (idx >= 0 && sibs[idx + 1] ? sibs[idx + 1].id : '');
                        const check = onCheckDropOrdered(draggingNode, parentPath, beforeID);
                        if (!check.ok) {
                            e.dataTransfer.dropEffect = 'none';
                            onSetInvalidDropHint({
                                message: onGetDropHintMessage(check.reason),
                                x: e.clientX + 14,
                                y: e.clientY + 14,
                            });
                            return;
                        }
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        onSetInvalidDropHint(null);
                    }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!draggingNode) return;
                        const parentPath = onGetParentFolderPath(api.path!);
                        if (parentPath === null) {
                            onClearDragState();
                            return;
                        }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const topHalf = e.clientY < rect.top + rect.height / 2;
                        const sibs = onGetChildrenByFolderPath(parentPath).filter((c) => c.type === 'folder' || c.type === 'request');
                        const idx = sibs.findIndex((c) => c.path === api.path);
                        const beforeID = topHalf ? api.id : (idx >= 0 && sibs[idx + 1] ? sibs[idx + 1].id : '');
                        const check = onCheckDropOrdered(draggingNode, parentPath, beforeID);
                        if (!check.ok) {
                            onClearDragState();
                            return;
                        }
                        if (draggingNode.type === 'request') {
                            await onMoveRequestNode(draggingNode.path, parentPath, beforeID);
                        } else {
                            await onMoveFolderNode(draggingNode.path, parentPath, beforeID);
                        }
                        onClearDragState();
                    }}
                >
                    <div className="api-request-expand-cell">
                        {hasCases ? (
                            <button
                                type="button"
                                className="api-request-expand"
                                aria-expanded={expanded}
                                aria-label={expanded ? '折叠用例' : '展开用例'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleCasesExpanded(api.path!);
                                }}
                            >
                                {expanded ? <DownOutlined /> : <RightOutlined />}
                            </button>
                        ) : (
                            <span className="api-request-expand-placeholder" aria-hidden />
                        )}
                    </div>
                    <div
                        className="api-item-main"
                        draggable
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onItemClick(api.path!, api);
                            }
                        }}
                        onDragStart={(e) => {
                            e.stopPropagation();
                            onSetDraggingNode({ type: 'request', path: api.path! });
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={onClearDragState}
                    >
                        <span className="api-method-col">
                            <span
                                className="api-method-tag"
                                style={{ backgroundColor: `${mc}20`, color: mc }}
                            >
                                {method}
                            </span>
                        </span>
                        <span className="api-name">{(api.name || '').replace(/\.curl$/i, '')}</span>
                    </div>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'add-case',
                                    icon: <PlusOutlined />,
                                    label: '新增用例',
                                    onClick: () => { onAddCase(api.path!); },
                                },
                                { type: 'divider' },
                                {
                                    key: 'copy',
                                    icon: <CopyOutlined />,
                                    label: '复制',
                                    onClick: () => { onCopy(api.path!); },
                                },
                                {
                                    key: 'rename',
                                    icon: <EditOutlined />,
                                    label: '重命名',
                                    onClick: () => { onRename('request', api.path!, api.name); },
                                },
                                {
                                    key: 'delete',
                                    icon: <CloseOutlined />,
                                    label: '删除',
                                    danger: true,
                                    onClick: () => { onDelete('request', api.path!); },
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
                            <MoreOutlined />
                        </button>
                    </Dropdown>
                </div>
                {hasCases && expanded && (
                    <div className="api-case-list">
                        {caseKids.map((c) => renderCaseRow(c))}
                    </div>
                )}
            </div>
        );
    };

    const renderFolder = (folder: ProjectTree) => {
        const folderChildren = folder.children || [];
        const orderedKids = folderChildren.filter((child) => child.type === 'folder' || child.type === 'request');
        const isCollapsed = collapsedFolders.has(folder.path || folder.id);
        const totalCount = folderChildren.length;

        return (
            <div key={folder.path || folder.id} className="api-folder">
                <div
                    className={`api-folder-header ${dropTargetFolderPath === (folder.path || folder.id) ? 'drop-target' : ''} ${movedHighlightPath === (folder.path || folder.id) ? 'moved-highlight' : ''}`}
                    draggable
                    onClick={() => onFolderCollapse(folder.path || folder.id)}
                    onDragStart={(e) => {
                        e.stopPropagation();
                        onSetDraggingNode({ type: 'folder', path: folder.path! });
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={onClearDragState}
                    onDragOver={(e) => {
                        e.stopPropagation();
                        if (!draggingNode) return;
                        const targetPath = folder.path || folder.id;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const intoFolderHalf = e.clientY >= rect.top + rect.height / 2;
                        const check = intoFolderHalf
                            ? onCheckDropAppendIntoFolder(draggingNode, targetPath)
                            : (() => {
                                const p = onGetParentFolderPath(folder.path!);
                                if (p === null) return { ok: false as const, reason: 'invalid-target' };
                                return onCheckDropOrdered(draggingNode, p, folder.id);
                            })();
                        if (!check.ok) {
                            e.dataTransfer.dropEffect = 'none';
                            onSetDropTargetFolderPath(null);
                            onSetInvalidDropHint({
                                message: onGetDropHintMessage(check.reason),
                                x: e.clientX + 14,
                                y: e.clientY + 14,
                            });
                            return;
                        }
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        onSetDropTargetFolderPath(targetPath);
                        onSetInvalidDropHint(null);
                    }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!draggingNode) return;
                        const targetPath = folder.path || folder.id;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const intoFolderHalf = e.clientY >= rect.top + rect.height / 2;
                        if (intoFolderHalf) {
                            const check = onCheckDropAppendIntoFolder(draggingNode, targetPath);
                            if (!check.ok) {
                                onClearDragState();
                                return;
                            }
                            if (draggingNode.type === 'request') {
                                await onMoveRequestNode(draggingNode.path, targetPath, '');
                            } else {
                                await onMoveFolderNode(draggingNode.path, targetPath, '');
                            }
                        } else {
                            const parentPath = onGetParentFolderPath(folder.path!);
                            if (parentPath === null) {
                                onClearDragState();
                                return;
                            }
                            const check = onCheckDropOrdered(draggingNode, parentPath, folder.id);
                            if (!check.ok) {
                                onClearDragState();
                                return;
                            }
                            if (draggingNode.type === 'request') {
                                await onMoveRequestNode(draggingNode.path, parentPath, folder.id);
                            } else {
                                await onMoveFolderNode(draggingNode.path, parentPath, folder.id);
                            }
                        }
                        onClearDragState();
                    }}
                >
                    <span className="folder-toggle-icon">
                        {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                    </span>
                    <FolderOutlined className="folder-icon" />
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">{totalCount}</span>
                    <Dropdown
                        menu={{
                            items: [
                                { key: 'add-request', icon: <PlusOutlined />, label: '新建请求', onClick: () => { onAddRequest(folder.path || ''); } },
                                { key: 'add-folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => { onAddFolder(folder.path || ''); } },
                                { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => onRename('folder', folder.path!, folder.name) },
                                { type: 'divider' },
                                {
                                    key: 'delete',
                                    icon: <CloseOutlined />,
                                    label: '删除',
                                    danger: true,
                                    onClick: () => { onDelete('folder', folder.path!); },
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
                            <MoreOutlined />
                        </button>
                    </Dropdown>
                </div>
                {!isCollapsed && orderedKids.length > 0 && (
                    <div className="api-folder-children">
                        {orderedKids.map((child) =>
                            child.type === 'folder'
                                ? renderFolder(child)
                                : child.type === 'request'
                                    ? renderRequestItem(child)
                                    : null
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderTree = () => {
        if (!filteredTree) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        const allChildren = filteredTree.children || [];
        if (allChildren.length === 0) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        return allChildren.map((child) =>
            child.type === 'folder'
                ? renderFolder(child)
                : child.type === 'request'
                    ? renderRequestItem(child)
                    : null
        );
    };

    return (
        <div
            className={`sidebar-content${(animationEnabled || forceListAnimation) ? ' animations-enabled' : ''}${dropTargetFolderPath === tree?.path ? ' root-drop-target' : ''}`}
            onDragOver={(e) => {
                if (!draggingNode || !tree?.path) return;
                const check = onCheckDropAppendIntoFolder(draggingNode, tree.path);
                if (!check.ok) {
                    e.dataTransfer.dropEffect = 'none';
                    onSetDropTargetFolderPath(null);
                    onSetInvalidDropHint({
                        message: onGetDropHintMessage(check.reason),
                        x: e.clientX + 14,
                        y: e.clientY + 14,
                    });
                    return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onSetDropTargetFolderPath(tree.path);
                onSetInvalidDropHint(null);
            }}
            onDrop={async (e) => {
                e.preventDefault();
                if (!draggingNode || !tree?.path) return;
                const check = onCheckDropAppendIntoFolder(draggingNode, tree.path);
                if (!check.ok) {
                    onClearDragState();
                    return;
                }
                if (draggingNode.type === 'request') {
                    await onMoveRequestNode(draggingNode.path, tree.path, '');
                } else {
                    await onMoveFolderNode(draggingNode.path, tree.path, '');
                }
                onClearDragState();
            }}
        >
            {loading && <Spin style={{ display: 'block', margin: '20px auto' }} />}
            {!loading && !tree && (
                <div className="empty-sidebar">
                    <ApiOutlined style={{ fontSize: 32, color: '#d0d0db', marginBottom: 12 }} />
                    <div>暂无接口</div>
                </div>
            )}
            {!loading && tree && renderTree()}
        </div>
    );
};
