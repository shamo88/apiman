import { useState, useEffect, useCallback } from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { useProjectTree } from './useProjectTree';
import { ProjectScript } from '../types';
import { GetProjectTree } from '../../wailsjs/go/main/App';

export interface UseProjectReturn {
    // Project identity
    projectId: string;

    // Environment (from context)
    environments: any[];
    selectedEnvironmentId: string;
    editingEnvironmentId: string;
    envLoading: boolean;
    environmentTabs: any[];
    activeEnvironmentTab: string;
    currentEnvironmentVariables: Record<string, string>;
    openEnvironmentEditor: (env: any) => void;
    openCreateEnvironmentTab: (projectTabs: any[], activeTab: string) => void;
    closeEnvironmentTab: (tabKey: string) => void;
    setActiveEnvironmentTab: (tabKey: string) => void;
    setSelectedEnvironmentId: (id: string) => void;
    resetEnvironmentEditor: () => void;
    updateEnvironmentName: (name: string) => void;
    addVariable: () => void;
    removeVariable: (id: string) => void;
    updateVariable: (id: string, field: 'key' | 'value', value: string) => void;
    saveEnvironment: (projectId: string) => Promise<void>;
    deleteEnvironment: (projectId: string) => Promise<void>;
    openImportModal: () => void;
    openCompareModal: () => void;
    exportEnvironments: (projectId: string) => Promise<void>;

    // Scripts (from context)
    projectScripts: ProjectScript[];
    editingScriptId: string;
    scriptsLoading: boolean;
    scriptSaving: boolean;
    scriptFormName: string;
    scriptFormDescription: string;
    scriptFormContent: string;
    selectScript: (script: ProjectScript) => void;
    updateScriptName: (name: string) => void;
    updateScriptDescription: (description: string) => void;
    updateScriptContent: (content: string) => void;
    saveScript: (projectId: string) => Promise<void>;
    deleteScript: (projectId: string, a: any[], b: any[], c: () => void) => Promise<void>;

    // Project tree (from useProjectTree)
    tree: any;
    loading: boolean;
    expandedKeys: string[];
    collapsedFolders: Set<string>;
    expandedRequestPaths: Set<string>;
    sidebarHighlightedCasePath: string;
    draggingNode: { type: 'request' | 'folder'; path: string } | null;
    dropTargetFolderPath: string | null;
    invalidDropHint: { message: string; x: number; y: number } | null;
    movedHighlightPath: string | null;
    toggleExpand: (key: string) => void;
    toggleFolderCollapse: (folderPath: string) => void;
    handleTreeItemClick: (key: string, node: any) => void;
    openRenameModal: (type: 'request' | 'folder', path: string, currentName: string) => void;
    handleDeleteFolder: (path: string) => void;
    handleCopyRequest: (path: string) => void;
    handleCaseTreeClick: (casePath: string) => void;
    toggleRequestCasesExpanded: (requestPath: string) => void;
    openAddCaseModal: (targetPath: string) => void;
    handleDeleteCaseFromTree: (casePath: string) => void;
    handleDuplicateCaseFromTree: (casePath: string) => void;
    openCaseRenameFromTree: (casePath: string, currentName: string) => void;
    clearDragState: () => void;
    setDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
    setDropTargetFolderPath: (path: string | null) => void;
    setInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
    checkDropAppendIntoFolder: (dragNode: any, targetFolderPath: string) => any;
    checkDropOrdered: (dragNode: any, parentContainerPath: string, beforeID: string) => any;
    getDropHintMessage: (reason?: string) => string;
    moveRequestNode: (requestPath: string, targetFolderPath: string, beforeID?: string) => Promise<void>;
    moveFolderNode: (folderPath: string, targetFolderPath: string, beforeID?: string) => Promise<void>;
    getParentFolderPath: (path: string) => string | null;
    getChildrenByFolderPath: (folderPath: string) => any[];

    // Actions
    refreshTree: () => Promise<void>;
}

export function useProject(projectId: string | undefined): UseProjectReturn {
    // Get shared state from context
    const { environment, script } = useProjectContext();

    // Project tree hook - handles tree loading internally
    const treeHook = useProjectTree(projectId);

    // Save script helper
    const saveScript = useCallback(async (projId: string) => {
        await script.saveScript(projId);
    }, [script.saveScript]);

    const deleteScript = useCallback(async (projId: string, a: any[], b: any[], c: () => void) => {
        await script.deleteScript(projId, a, b, c);
    }, [script.deleteScript]);

    // Refresh tree - fetches tree data and updates state
    const refreshTree = useCallback(async () => {
        await treeHook.refreshTree();
    }, [treeHook]);

    // Load environments and scripts when projectId changes
    useEffect(() => {
        if (projectId) {
            environment.loadEnvironmentsData(projectId);
            script.loadProjectScriptsData(projectId);
        }
    }, [projectId]);

    return {
        projectId: projectId || '',

        // Environment (from context)
        environments: environment.environments,
        selectedEnvironmentId: environment.selectedEnvironmentId,
        editingEnvironmentId: environment.editingEnvironmentId,
        envLoading: environment.envLoading,
        environmentTabs: environment.environmentTabs,
        activeEnvironmentTab: environment.activeEnvironmentTab,
        currentEnvironmentVariables: environment.currentEnvironmentVariables,
        openEnvironmentEditor: environment.openEnvironmentEditor,
        openCreateEnvironmentTab: environment.openCreateEnvironmentTab,
        closeEnvironmentTab: environment.closeEnvironmentTab,
        setActiveEnvironmentTab: environment.setActiveEnvironmentTab,
        setSelectedEnvironmentId: environment.setSelectedEnvironmentId,
        resetEnvironmentEditor: environment.resetEnvironmentEditor,
        updateEnvironmentName: environment.updateEnvironmentName,
        addVariable: environment.addVariable,
        removeVariable: environment.removeVariable,
        updateVariable: environment.updateVariable,
        saveEnvironment: environment.saveEnvironment,
        deleteEnvironment: environment.deleteEnvironment,
        openImportModal: environment.openImportModal,
        openCompareModal: environment.openCompareModal,
        exportEnvironments: environment.exportEnvironments,

        // Scripts (from context)
        projectScripts: script.projectScripts,
        editingScriptId: script.editingScriptId,
        scriptsLoading: script.scriptsLoading,
        scriptSaving: script.scriptSaving,
        scriptFormName: script.scriptFormName,
        scriptFormDescription: script.scriptFormDescription,
        scriptFormContent: script.scriptFormContent,
        selectScript: script.selectScript,
        updateScriptName: script.updateScriptName,
        updateScriptDescription: script.updateScriptDescription,
        updateScriptContent: script.updateScriptContent,
        saveScript,
        deleteScript,

        // Project tree (from useProjectTree)
        tree: treeHook.tree,
        loading: treeHook.loading,
        expandedKeys: treeHook.expandedKeys,
        collapsedFolders: treeHook.collapsedFolders,
        expandedRequestPaths: treeHook.expandedRequestPaths,
        sidebarHighlightedCasePath: treeHook.sidebarHighlightedCasePath,
        draggingNode: treeHook.draggingNode,
        dropTargetFolderPath: treeHook.dropTargetFolderPath,
        invalidDropHint: treeHook.invalidDropHint,
        movedHighlightPath: treeHook.movedHighlightPath,
        toggleExpand: treeHook.toggleExpand,
        toggleFolderCollapse: treeHook.toggleFolderCollapse,
        handleTreeItemClick: treeHook.handleTreeItemClick,
        openRenameModal: treeHook.openRenameModal,
        handleDeleteFolder: treeHook.handleDeleteFolder,
        handleCopyRequest: treeHook.handleCopyRequest,
        handleCaseTreeClick: treeHook.handleCaseTreeClick,
        toggleRequestCasesExpanded: treeHook.toggleRequestCasesExpanded,
        openAddCaseModal: treeHook.openAddCaseModal,
        handleDeleteCaseFromTree: treeHook.handleDeleteCaseFromTree,
        handleDuplicateCaseFromTree: treeHook.handleDuplicateCaseFromTree,
        openCaseRenameFromTree: treeHook.openCaseRenameFromTree,
        clearDragState: treeHook.clearDragState,
        setDraggingNode: treeHook.setDraggingNode,
        setDropTargetFolderPath: treeHook.setDropTargetFolderPath,
        setInvalidDropHint: treeHook.setInvalidDropHint,
        checkDropAppendIntoFolder: treeHook.checkDropAppendIntoFolder,
        checkDropOrdered: treeHook.checkDropOrdered,
        getDropHintMessage: treeHook.getDropHintMessage,
        moveRequestNode: treeHook.moveRequestNode,
        moveFolderNode: treeHook.moveFolderNode,
        getParentFolderPath: treeHook.getParentFolderPath,
        getChildrenByFolderPath: treeHook.getChildrenByFolderPath,

        // Actions
        refreshTree,
    };
}
