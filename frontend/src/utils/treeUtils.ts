import type { DataNode } from 'antd/es/tree';
import type { ProjectTree } from '../types';

/** Find a tree node by path */
export const findTreeNode = (tree: ProjectTree | null, path: string): ProjectTree | null => {
    if (!tree) return null;
    if ((tree.path || tree.id) === path) return tree;
    if (!tree.children) return null;
    for (const child of tree.children) {
        const found = findTreeNode(child, path);
        if (found) return found;
    }
    return null;
};

/** Collect all folder keys from a tree */
export const collectFolderKeys = (tree: ProjectTree | null): string[] => {
    if (!tree) return [];
    const keys: string[] = [];

    const walk = (node: ProjectTree) => {
        if (node.type === 'folder') {
            keys.push(node.path || node.id);
        }
        if (node.children) {
            node.children.forEach(walk);
        }
    };

    walk(tree);
    return keys;
};

/** Get parent folder path for a given path */
export const getParentFolderPath = (
    tree: ProjectTree | null,
    path: string
): string | null => {
    if (!tree || !tree?.path) return null;

    let foundParent: string | null = null;
    const walk = (node: ProjectTree, parentPath: string) => {
        const nodePath = node.path || node.id;
        if (nodePath === path) {
            foundParent = parentPath;
            return;
        }
        if (!node.children || foundParent) return;

        const nextParent = node.type === 'folder' ? nodePath : parentPath;
        for (const child of node.children) {
            walk(child, nextParent);
            if (foundParent) return;
        }
    };

    walk(tree, tree.path);
    return foundParent;
};

/** Get children by folder path */
export const getChildrenByFolderPath = (
    tree: ProjectTree | null,
    folderPath: string
): ProjectTree[] => {
    if (!tree || !tree?.path) return [];
    if (folderPath === tree.path) {
        return tree.children || [];
    }
    const node = findTreeNode(tree, folderPath);
    if (!node || node.type !== 'folder') return [];
    return node.children || [];
};

/** Replace path prefix */
export const replacePathPrefix = (
    path: string,
    fromPrefix: string,
    toPrefix: string
): string => {
    if (path === fromPrefix) return toPrefix;
    const normalizedFrom = fromPrefix.endsWith('/') || fromPrefix.endsWith('\\') ? fromPrefix : fromPrefix + '/';
    if (path.startsWith(normalizedFrom)) {
        return toPrefix + path.slice(fromPrefix.length);
    }
    return path;
};

/** Check if subtree contains an ID */
export const subtreeContainsId = (tree: ProjectTree | null, folderRefPath: string, needleId: string): boolean => {
    const node = findTreeNode(tree, folderRefPath);
    if (!node) return false;
    const walk = (n: ProjectTree): boolean => {
        if (n.id === needleId) return true;
        return (n.children || []).some(walk);
    };
    return walk(node);
};

/** Convert ProjectTree to DataNode for AntD Tree */
export const treeToDataNode = (
    tree: ProjectTree,
    expandedKeys: string[],
    selectedKeys: string[],
    collapsedFolders: Set<string>,
    onFolderClick?: (folderPath: string) => void,
    onRequestClick?: (requestPath: string, method?: string) => void,
    onRightClick?: (e: React.MouseEvent, node: ProjectTree) => void
): DataNode[] => {
    return tree.children?.map((node) => {
        const nodePath = node.path || node.id;
        const isFolder = node.type === 'folder';
        const isExpanded = expandedKeys.includes(nodePath) && !collapsedFolders.has(nodePath);

        const dataNode: DataNode = {
            key: nodePath,
            title: node.name,
            isLeaf: !isFolder,
            children: isFolder
                ? treeToDataNode(
                      node,
                      expandedKeys,
                      selectedKeys,
                      collapsedFolders,
                      onFolderClick,
                      onRequestClick,
                      onRightClick
                  )
                : undefined,
        };

        return dataNode;
    }) || [];
};

/** Filter tree by keyword */
export const filterTreeByKeyword = (
    tree: ProjectTree,
    keyword: string,
    filterMethod: string
): ProjectTree | null => {
    if (!keyword && filterMethod === 'ALL') return tree;

    const lowerKeyword = keyword.toLowerCase();

    const walk = (node: ProjectTree): ProjectTree | null => {
        if (node.type === 'folder') {
            const filteredChildren = node.children
                ?.map(walk)
                .filter((child): child is ProjectTree => child !== null);

            if (filteredChildren && filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
            }
            return null;
        }

        // Request node
        const matchesKeyword =
            !keyword ||
            node.name.toLowerCase().includes(lowerKeyword) ||
            (node.url && node.url.toLowerCase().includes(lowerKeyword));
        const matchesMethod = filterMethod === 'ALL' || node.method === filterMethod;

        if (matchesKeyword && matchesMethod) {
            return node;
        }
        return null;
    };

    const result = walk(tree);
    return result;
};

/** Drop hint message mapping */
export const getDropHintMessage = (reason?: string): string => {
    const map: Record<string, string> = {
        'self': '不能拖到自己',
        'same-parent': '已在该目录',
        'child': '不能移动到子目录',
        'duplicate-request-name': '同名接口冲突',
        'duplicate-folder-name': '同名文件夹冲突',
        'invalid-target': '目标无效',
        'missing-source': '源节点不存在',
    };
    if (!reason) return '不可放置';
    return map[reason] || '不可放置';
};

/** Check if can drop into folder (at the end) */
export const checkDropAppendIntoFolder = (
    tree: ProjectTree | null,
    dragNode: { type: 'request' | 'folder'; path: string },
    targetFolderPath: string
): { ok: boolean; reason?: string } => {
    if (!tree?.path) return { ok: false, reason: 'invalid-target' };
    if (dragNode.path === targetFolderPath) return { ok: false, reason: 'self' };

    if (dragNode.type === 'folder') {
        let p: string | null = targetFolderPath;
        const seen = new Set<string>();
        while (p) {
            if (p === dragNode.path) {
                return { ok: false, reason: 'child' };
            }
            if (seen.has(p)) break;
            seen.add(p);
            p = getParentFolderPath(tree, p);
        }
    }

    const draggingTreeNode = findTreeNode(tree, dragNode.path);
    if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

    const targetChildren = getChildrenByFolderPath(tree, targetFolderPath);
    if (dragNode.type === 'request') {
        const conflict = targetChildren.some(
            (child) => child.type === 'request' && child.name === draggingTreeNode.name && child.path !== dragNode.path
        );
        if (conflict) return { ok: false, reason: 'duplicate-request-name' };
    } else {
        const conflict = targetChildren.some(
            (child) => child.type === 'folder' && child.name === draggingTreeNode.name && child.path !== dragNode.path
        );
        if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
    }

    return { ok: true };
};

/** Check if can drop in order (before a specific item) */
export const checkDropOrdered = (
    tree: ProjectTree | null,
    dragNode: { type: 'request' | 'folder'; path: string },
    parentContainerPath: string,
    beforeID: string
): { ok: boolean; reason?: string } => {
    if (!tree?.path) return { ok: false, reason: 'invalid-target' };

    const dragParent = getParentFolderPath(tree, dragNode.path);
    if (dragParent === null) return { ok: false, reason: 'missing-source' };

    if (dragNode.type === 'folder' && beforeID) {
        if (subtreeContainsId(tree, dragNode.path, beforeID)) {
            return { ok: false, reason: 'child' };
        }
    }

    const draggingTreeNode = findTreeNode(tree, dragNode.path);
    if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

    if (dragParent !== parentContainerPath) {
        const targetChildren = getChildrenByFolderPath(tree, parentContainerPath);
        if (dragNode.type === 'request') {
            const conflict = targetChildren.some((c) => c.type === 'request' && c.name === draggingTreeNode.name);
            if (conflict) return { ok: false, reason: 'duplicate-request-name' };
        } else {
            const conflict = targetChildren.some(
                (c) => c.type === 'folder' && c.name === draggingTreeNode.name && c.path !== dragNode.path
            );
            if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
        }
    }

    return { ok: true };
};
