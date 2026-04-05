import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import type { ProjectTree } from '../types';
import { useRequest } from './useRequest';
import { GetProjectTree } from '../../wailsjs/go/main/App';
import {
    findTreeNode,
    getChildrenByFolderPath,
    getParentFolderPath,
    checkDropAppendIntoFolder,
    checkDropOrdered,
    getDropHintMessage,
} from '../utils/treeUtils';

export interface UseProjectTreeReturn {
    // Tree data
    tree: ProjectTree | null;
    loading: boolean;

    // Tree state
    expandedKeys: string[];
    collapsedFolders: Set<string>;
    expandedRequestPaths: Set<string>;
    sidebarHighlightedCasePath: string;
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    invalidDropHint: { message: string; x: number; y: number } | null;
    movedHighlightPath: string | null;

    // Tree setters
    setExpandedKeys: React.Dispatch<React.SetStateAction<string[]>>;
    setCollapsedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
    setExpandedRequestPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSidebarHighlightedCasePath: React.Dispatch<React.SetStateAction<string>>;
    setDraggingNode: React.Dispatch<React.SetStateAction<{ type: 'request' | 'folder'; path: string } | null>>;
    setDropTargetFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
    setInvalidDropHint: React.Dispatch<React.SetStateAction<{ message: string; x: number; y: number } | null>>;
    setMovedHighlightPath: React.Dispatch<React.SetStateAction<string | null>>;

    // Tree operations
    toggleExpand: (key: string) => void;
    toggleFolderCollapse: (folderPath: string) => void;
    handleTreeItemClick: (key: string, node: ProjectTree) => void;
    handleCaseTreeClick: (casePath: string) => void;
    openRenameModal: (type: 'request' | 'folder', path: string, currentName: string) => void;
    handleDeleteFolder: (path: string) => void;
    handleCopyRequest: (path: string) => void;
    openAddCaseModal: (targetPath: string) => void;
    confirmAddCaseModal: (name?: string) => Promise<void>;
    handleDuplicateCaseFromTree: (casePath: string) => void;
    handleDeleteCaseFromTree: (casePath: string) => void;
    openCaseRenameFromTree: (casePath: string, currentName: string) => void;
    confirmCaseRenameFromTree: () => Promise<void>;
    toggleRequestCasesExpanded: (requestPath: string) => void;
    moveRequestNode: (requestPath: string, targetFolderPath: string, beforeID?: string) => Promise<void>;
    moveFolderNode: (folderPath: string, targetFolderPath: string, beforeID?: string) => Promise<void>;
    refreshTree: () => Promise<void>;

    // Tree helpers
    getNodeByPath: (path: string) => ProjectTree | null;
    getChildrenByFolderPath: (folderPath: string) => ProjectTree[];
    getParentFolderPath: (path: string) => string | null;
    checkDropAppendIntoFolder: (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string) => { ok: boolean; reason?: string };
    checkDropOrdered: (dragNode: { type: 'request' | 'folder'; path: string }, parentContainerPath: string, beforeID: string) => { ok: boolean; reason?: string };
    getDropHintMessage: (reason?: string) => string;

    // Drag state operations
    clearDragState: () => void;
}

export function useProjectTree(projectId: string | undefined): UseProjectTreeReturn {
    // Use a simpler approach - just fetch the tree directly when projectId changes
    const [tree, setTree] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (projectId) {
            setLoading(true);
            GetProjectTree(projectId).then(t => {
                setTree(t);
                setLoading(false);
            }).catch(e => {
                console.error('Failed to load tree:', e);
                setLoading(false);
            });
        } else {
            setTree(null);
        }
    }, [projectId]);

    // Tree state - per project
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [expandedRequestPaths, setExpandedRequestPaths] = useState<Set<string>>(new Set());
    const [sidebarHighlightedCasePath, setSidebarHighlightedCasePath] = useState('');
    const [draggingNode, setDraggingNode] = useState<{ type: 'request' | 'folder'; path: string } | null>(null);
    const [dropTargetFolderPath, setDropTargetFolderPath] = useState<string | null>(null);
    const [invalidDropHint, setInvalidDropHint] = useState<{ message: string; x: number; y: number } | null>(null);
    const [movedHighlightPath, setMovedHighlightPath] = useState<string | null>(null);

    // Use request hook for operations (binds projectId)
    const req = useRequest({
        onTreeRefresh: (projectId, tree) => {
            setTree(tree);
        },
    });

    // Tree helpers
    const getNodeByPath = useCallback((path: string): ProjectTree | null => {
        return findTreeNode(tree, path);
    }, [tree]);

    const handleGetChildrenByFolderPath = useCallback((folderPath: string): ProjectTree[] => {
        return getChildrenByFolderPath(tree, folderPath);
    }, [tree]);

    const handleGetParentFolderPath = useCallback((path: string): string | null => {
        return getParentFolderPath(tree, path);
    }, [tree]);

    const handleCheckDropAppendIntoFolder = useCallback((dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string) => {
        return checkDropAppendIntoFolder(tree, dragNode, targetFolderPath);
    }, [tree]);

    const handleCheckDropOrdered = useCallback((dragNode: { type: 'request' | 'folder'; path: string }, parentContainerPath: string, beforeID: string) => {
        return checkDropOrdered(tree, dragNode, parentContainerPath, beforeID);
    }, [tree]);

    const handleGetDropHintMessage = useCallback((reason?: string) => {
        return getDropHintMessage(reason);
    }, []);

    // Clear drag state
    const clearDragState = useCallback(() => {
        setDraggingNode(null);
        setDropTargetFolderPath(null);
        setInvalidDropHint(null);
    }, []);

    // Tree operations - wrap useRequest methods with bound projectId
    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    }, []);

    const toggleFolderCollapseFn = useCallback((folderPath: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderPath)) {
                next.delete(folderPath);
            } else {
                next.add(folderPath);
            }
            return next;
        });
    }, []);

    const handleTreeItemClickFn = useCallback((key: string, node: ProjectTree) => {
        if (projectId) {
            req.handleTreeItemClick(node);
        }
    }, [req, projectId]);

    const handleCaseTreeClickFn = useCallback((casePath: string) => {
        if (projectId) {
            // Find the case node and call handleCaseTreeClick
            const node = findTreeNode(tree, casePath);
            if (node) {
                req.handleCaseTreeClick(node);
            }
        }
    }, [req, projectId, tree]);

    const openRenameModalFn = useCallback((type: 'request' | 'folder', path: string, currentName: string) => {
        req.openRenameModal(type, path, currentName);
    }, [req]);

    const handleDeleteFolderFn = useCallback((path: string) => {
        if (projectId) {
            req.handleDeleteFolder(path, projectId);
        }
    }, [req, projectId]);

    const handleCopyRequestFn = useCallback((path: string) => {
        if (projectId) {
            req.handleCopyRequest(path, projectId);
        }
    }, [req, projectId]);

    const openAddCaseModalFn = useCallback((targetPath: string) => {
        req.openAddCaseModal(targetPath);
    }, [req]);

    const confirmAddCaseModalFn = useCallback(async (name?: string) => {
        await req.confirmAddCaseModal(name);
    }, [req]);

    const handleDuplicateCaseFromTreeFn = useCallback((casePath: string) => {
        if (projectId) {
            req.handleDuplicateCaseFromTree(casePath, projectId);
        }
    }, [req, projectId]);

    const handleDeleteCaseFromTreeFn = useCallback((casePath: string) => {
        if (projectId) {
            req.handleDeleteCaseFromTree(casePath, projectId);
        }
    }, [req, projectId]);

    const openCaseRenameFromTreeFn = useCallback((casePath: string, currentName: string) => {
        req.openCaseRenameFromTree(casePath, currentName);
    }, [req]);

    const confirmCaseRenameFromTreeFn = useCallback(async () => {
        await req.confirmCaseRenameFromTree();
    }, [req]);

    const toggleRequestCasesExpandedFn = useCallback((requestPath: string) => {
        setExpandedRequestPaths((prev) => {
            const next = new Set(prev);
            if (next.has(requestPath)) {
                next.delete(requestPath);
            } else {
                next.add(requestPath);
            }
            return next;
        });
    }, []);

    const moveRequestNodeFn = useCallback(async (requestPath: string, targetFolderPath: string, beforeID: string = '') => {
        if (!projectId) return;
        try {
            await req.moveRequestNode(requestPath, targetFolderPath, beforeID, projectId);
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    }, [req, projectId]);

    const moveFolderNodeFn = useCallback(async (folderPath: string, targetFolderPath: string, beforeID: string = '') => {
        if (!projectId) return;
        try {
            await req.moveFolderNode(folderPath, targetFolderPath, beforeID, projectId);
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    }, [req, projectId]);

    // Refresh tree - fetches tree data and updates state
    const refreshTreeFn = useCallback(async () => {
        if (!projectId) return;
        try {
            const newTree = await GetProjectTree(projectId);
            setTree(newTree);
        } catch (error: any) {
            console.error('Failed to refresh tree:', error);
        }
    }, [projectId]);

    return {
        // Tree data
        tree,
        loading,

        // Tree state
        expandedKeys,
        collapsedFolders,
        expandedRequestPaths,
        sidebarHighlightedCasePath,
        draggingNode,
        dropTargetFolderPath,
        invalidDropHint,
        movedHighlightPath,

        // Tree setters
        setExpandedKeys,
        setCollapsedFolders,
        setExpandedRequestPaths,
        setSidebarHighlightedCasePath,
        setDraggingNode,
        setDropTargetFolderPath,
        setInvalidDropHint,
        setMovedHighlightPath,

        // Tree operations
        toggleExpand,
        toggleFolderCollapse: toggleFolderCollapseFn,
        handleTreeItemClick: handleTreeItemClickFn,
        handleCaseTreeClick: handleCaseTreeClickFn,
        openRenameModal: openRenameModalFn,
        handleDeleteFolder: handleDeleteFolderFn,
        handleCopyRequest: handleCopyRequestFn,
        openAddCaseModal: openAddCaseModalFn,
        confirmAddCaseModal: confirmAddCaseModalFn,
        handleDuplicateCaseFromTree: handleDuplicateCaseFromTreeFn,
        handleDeleteCaseFromTree: handleDeleteCaseFromTreeFn,
        openCaseRenameFromTree: openCaseRenameFromTreeFn,
        confirmCaseRenameFromTree: confirmCaseRenameFromTreeFn,
        toggleRequestCasesExpanded: toggleRequestCasesExpandedFn,
        moveRequestNode: moveRequestNodeFn,
        moveFolderNode: moveFolderNodeFn,
        refreshTree: refreshTreeFn,

        // Tree helpers
        getNodeByPath,
        getChildrenByFolderPath: handleGetChildrenByFolderPath,
        getParentFolderPath: handleGetParentFolderPath,
        checkDropAppendIntoFolder: handleCheckDropAppendIntoFolder,
        checkDropOrdered: handleCheckDropOrdered,
        getDropHintMessage: handleGetDropHintMessage,

        // Drag state
        clearDragState,
    };
}
