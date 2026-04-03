import React from 'react';
import type { ProjectTree, Environment, ProjectScript } from '../../types';
import { SidebarMenuHeader, ApiTree, ApiListFilters, SidebarList } from '../sidebar';

interface ProjectSidebarProps {
    // Sidebar state
    sidebarMenu: 'apis' | 'environments' | 'scripts';
    currentTree: ProjectTree | null;
    treeLoading: boolean;
    expandedKeys: string[];
    collapsedFolders: Set<string>;
    expandedRequestPaths: Set<string>;
    sidebarHighlightedCasePath: string;
    searchKeyword: string;
    filterMethod: string;
    environments: Environment[];
    projectScripts: ProjectScript[];
    editingEnvironmentId: string;
    editingScriptId: string;
    envLoading: boolean;
    scriptsLoading: boolean;
    scriptSaving: boolean;

    // Drag state
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    movedHighlightPath: string | null;
    animationEnabled: boolean;
    forceListAnimation: boolean;

    // Current request path for highlighting
    currentRequestPath?: string;

    // Callbacks - Sidebar menu
    onSidebarMenuChange: (menu: 'apis' | 'environments' | 'scripts') => void;
    onCreateFolder: () => void;
    onCreateRequest: () => void;
    onCreateEnvironment: () => void;
    onCreateScript: () => void;
    onEnvironmentSelect: (env: Environment) => void;
    onScriptSelect: (script: ProjectScript) => void;

    // Callbacks - Filters
    onSearchChange: (keyword: string) => void;
    onMethodChange: (method: string) => void;

    // Callbacks - Tree
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
    onClearDragState: () => void;
    onSetDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
    onSetDropTargetFolderPath: (path: string | null) => void;
    onSetInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
    onCheckDropAppendIntoFolder: (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string) => { ok: boolean; reason?: string };
    onCheckDropOrdered: (dragNode: { type: 'request' | 'folder'; path: string }, parentContainerPath: string, beforeID: string) => { ok: boolean; reason?: string };
    onGetDropHintMessage: (reason?: string) => string;
    onMoveRequestNode: (requestPath: string, targetFolderPath: string, beforeID: string) => Promise<void>;
    onMoveFolderNode: (folderPath: string, targetParentPath: string, beforeID: string) => Promise<void>;
    onGetParentFolderPath: (path: string) => string | null;
    onGetChildrenByFolderPath: (folderPath: string) => ProjectTree[];
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    sidebarMenu,
    currentTree,
    treeLoading,
    expandedKeys,
    collapsedFolders,
    expandedRequestPaths,
    sidebarHighlightedCasePath,
    searchKeyword,
    filterMethod,
    environments,
    projectScripts,
    editingEnvironmentId,
    editingScriptId,
    envLoading,
    scriptsLoading,
    scriptSaving,
    draggingNode,
    dropTargetFolderPath,
    movedHighlightPath,
    animationEnabled,
    forceListAnimation,
    currentRequestPath,
    onSidebarMenuChange,
    onCreateFolder,
    onCreateRequest,
    onCreateEnvironment,
    onCreateScript,
    onEnvironmentSelect,
    onScriptSelect,
    onSearchChange,
    onMethodChange,
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
}) => {
    return (
        <div className="project-sidebar">
            <SidebarMenuHeader
                activeMenu={sidebarMenu}
                onMenuChange={onSidebarMenuChange}
                onCreateFolder={onCreateFolder}
                onCreateRequest={onCreateRequest}
                onCreateEnvironment={onCreateEnvironment}
                onCreateScript={onCreateScript}
                scriptSaving={scriptSaving}
            />

            {sidebarMenu === 'apis' ? (
                <>
                    <ApiListFilters
                        searchKeyword={searchKeyword}
                        filterMethod={filterMethod}
                        onSearchChange={onSearchChange}
                        onMethodChange={onMethodChange}
                    />
                    <ApiTree
                        tree={currentTree}
                        loading={treeLoading}
                        expandedKeys={expandedKeys}
                        selectedKeys={[]}
                        collapsedFolders={collapsedFolders}
                        expandedRequestPaths={expandedRequestPaths}
                        sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                        draggingNode={draggingNode}
                        dropTargetFolderPath={dropTargetFolderPath}
                        invalidDropHint={null}
                        movedHighlightPath={movedHighlightPath}
                        animationEnabled={animationEnabled}
                        forceListAnimation={forceListAnimation}
                        currentRequestPath={currentRequestPath}
                        onToggleExpand={onToggleExpand}
                        onFolderCollapse={onFolderCollapse}
                        onItemClick={onItemClick}
                        onAddRequest={onAddRequest}
                        onAddFolder={onAddFolder}
                        onRename={onRename}
                        onDelete={onDelete}
                        onCopy={onCopy}
                        onCaseClick={onCaseClick}
                        onToggleCasesExpanded={onToggleCasesExpanded}
                        onAddCase={onAddCase}
                        onDeleteCase={onDeleteCase}
                        onDuplicateCase={onDuplicateCase}
                        onRenameCase={onRenameCase}
                        onDragStart={() => {}}
                        onFolderDragStart={() => {}}
                        onClearDragState={onClearDragState}
                        onSetDraggingNode={onSetDraggingNode}
                        onSetDropTargetFolderPath={onSetDropTargetFolderPath}
                        onSetInvalidDropHint={onSetInvalidDropHint}
                        onCheckDropAppendIntoFolder={onCheckDropAppendIntoFolder}
                        onCheckDropOrdered={onCheckDropOrdered}
                        onGetDropHintMessage={onGetDropHintMessage}
                        onMoveRequestNode={onMoveRequestNode}
                        onMoveFolderNode={onMoveFolderNode}
                        onGetParentFolderPath={onGetParentFolderPath}
                        onGetChildrenByFolderPath={onGetChildrenByFolderPath}
                        searchKeyword={searchKeyword}
                        filterMethod={filterMethod}
                    />
                </>
            ) : sidebarMenu === 'environments' ? (
                <SidebarList
                    items={environments}
                    activeId={editingEnvironmentId}
                    type="environment"
                    loading={envLoading}
                    onSelect={onEnvironmentSelect}
                    emptyText={'暂无环境，点击右上角"新建"创建'}
                />
            ) : (
                <SidebarList
                    items={projectScripts}
                    activeId={editingScriptId}
                    type="script"
                    loading={scriptsLoading}
                    onSelect={onScriptSelect}
                    emptyText={'暂无脚本，点击右上角"新建"创建'}
                />
            )}
        </div>
    );
};
