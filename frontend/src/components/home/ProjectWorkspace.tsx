import React, { useState } from 'react';
import { SidebarMenuHeader, ApiTree, ApiListFilters, SidebarList } from '../sidebar';
import { useProject } from '../../hooks/useProject';
import { CreateFolderModal, CreateRequestModal } from '../modals';
import { useRequest } from '../../hooks/useRequest';

interface ProjectSidebarProps {
    projectId: string | undefined;
    sidebarMenu: 'apis' | 'environments' | 'scripts';
    onSidebarMenuChange: (menu: 'apis' | 'environments' | 'scripts') => void;
    onCreateEnvironment: () => void;
    onCreateScript: () => void;
    currentRequestPath?: string;
    animationEnabled: boolean;
    forceListAnimation: boolean;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    projectId,
    sidebarMenu,
    onSidebarMenuChange,
    onCreateEnvironment,
    onCreateScript,
    currentRequestPath,
    animationEnabled,
    forceListAnimation,
}) => {
    // Search/filter state - managed locally in sidebar
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState('ALL');
    const [searchVersion, setSearchVersion] = useState(0);

    // Modal state - managed locally in sidebar
    const [createFolderModal, setCreateFolderModal] = useState(false);
    const [createRequestModal, setCreateRequestModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newRequestName, setNewRequestName] = useState('');

    // Project hook - provides environments, scripts, tree data
    const project = useProject(projectId);

    // Request operations
    const { handleCreateFolder, handleCreateRequest } = useRequest({
        onTreeRefresh: () => { project.refreshTree(); },
    });

    const handleSearchChange = (keyword: string) => {
        setSearchKeyword(keyword);
        setSearchVersion(v => v + 1);
    };

    const handleOpenCreateFolder = () => {
        setNewFolderName('');
        setCreateFolderModal(true);
    };

    const handleOpenCreateRequest = () => {
        setNewRequestName('');
        setCreateRequestModal(true);
    };

    return (
        <div className="project-sidebar">
            <SidebarMenuHeader
                activeMenu={sidebarMenu}
                onMenuChange={onSidebarMenuChange}
                onCreateFolder={handleOpenCreateFolder}
                onCreateRequest={handleOpenCreateRequest}
                onCreateEnvironment={onCreateEnvironment}
                onCreateScript={onCreateScript}
                projectId={projectId}
                scriptSaving={project.scriptSaving}
            />

            {sidebarMenu === 'apis' ? (
                <>
                    <ApiListFilters
                        searchKeyword={searchKeyword}
                        filterMethod={filterMethod}
                        onSearchChange={handleSearchChange}
                        onMethodChange={setFilterMethod}
                    />
                    <ApiTree
                        tree={project.tree}
                        loading={project.loading}
                        expandedKeys={project.expandedKeys}
                        selectedKeys={[]}
                        collapsedFolders={project.collapsedFolders}
                        expandedRequestPaths={project.expandedRequestPaths}
                        sidebarHighlightedCasePath={project.sidebarHighlightedCasePath}
                        draggingNode={project.draggingNode}
                        dropTargetFolderPath={project.dropTargetFolderPath}
                        invalidDropHint={null}
                        movedHighlightPath={project.movedHighlightPath}
                        animationEnabled={animationEnabled}
                        forceListAnimation={forceListAnimation}
                        currentRequestPath={currentRequestPath}
                        onToggleExpand={project.toggleExpand}
                        onFolderCollapse={project.toggleFolderCollapse}
                        onItemClick={project.handleTreeItemClick}
                        onAddRequest={(folderPath) => {}}
                        onAddFolder={(folderPath) => {}}
                        onRename={project.openRenameModal}
                        onDelete={project.handleDeleteFolder}
                        onCopy={project.handleCopyRequest}
                        onCaseClick={project.handleCaseTreeClick}
                        onToggleCasesExpanded={project.toggleRequestCasesExpanded}
                        onAddCase={project.openAddCaseModal}
                        onDeleteCase={project.handleDeleteCaseFromTree}
                        onDuplicateCase={project.handleDuplicateCaseFromTree}
                        onRenameCase={project.openCaseRenameFromTree}
                        onDragStart={() => {}}
                        onFolderDragStart={() => {}}
                        onClearDragState={project.clearDragState}
                        onSetDraggingNode={project.setDraggingNode}
                        onSetDropTargetFolderPath={project.setDropTargetFolderPath}
                        onSetInvalidDropHint={project.setInvalidDropHint}
                        onCheckDropAppendIntoFolder={project.checkDropAppendIntoFolder}
                        onCheckDropOrdered={project.checkDropOrdered}
                        onGetDropHintMessage={project.getDropHintMessage}
                        onMoveRequestNode={project.moveRequestNode}
                        onMoveFolderNode={project.moveFolderNode}
                        onGetParentFolderPath={project.getParentFolderPath}
                        onGetChildrenByFolderPath={project.getChildrenByFolderPath}
                        searchKeyword={searchKeyword}
                        filterMethod={filterMethod}
                    />
                </>
            ) : sidebarMenu === 'environments' ? (
                <SidebarList
                    items={project.environments}
                    activeId={project.editingEnvironmentId}
                    type="environment"
                    loading={project.envLoading}
                    onSelect={project.openEnvironmentEditor}
                    emptyText={'暂无环境，点击右上角"新建"创建'}
                />
            ) : (
                <SidebarList
                    items={project.projectScripts}
                    activeId={project.editingScriptId}
                    type="script"
                    loading={project.scriptsLoading}
                    onSelect={project.selectScript}
                    emptyText={'暂无脚本，点击右上角"新建"创建'}
                />
            )}

            <CreateFolderModal
                visible={createFolderModal}
                onClose={() => { setCreateFolderModal(false); setNewFolderName(''); }}
                onConfirm={() => { if (projectId) return handleCreateFolder(projectId, newFolderName); return Promise.resolve(); }}
            />

            <CreateRequestModal
                visible={createRequestModal}
                onClose={() => { setCreateRequestModal(false); setNewRequestName(''); }}
                onConfirm={() => { if (projectId) return handleCreateRequest(projectId, newRequestName); return Promise.resolve(); }}
            />
        </div>
    );
};
