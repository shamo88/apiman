import type { DataNode } from 'antd/es/tree';

export interface ProjectTree {
    id: string;
    name: string;
    type: string;
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

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
