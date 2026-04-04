import { HomeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Empty, InputRef, message, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import { CreateProject, InitProjectsDir, LoadAppConfig, LoadGlobalCookies, RenameProject } from '../wailsjs/go/main/App';
import './App.css';
import { ScriptHelpWindow, TitleBar } from './components/layout';
import { MCPSettingsModal, HistoryModal, CookieModal, AddCaseModal, RenameCaseModal, CreateFolderModal, CreateRequestModal, RenameModal, CreateProjectModal, CreateGroupModal, RenameProjectModal, RenameGroupModal } from './components/modals';
import { AppFooter, EmptyState, EnvironmentPanel, HomePage, ProjectSidebar, ScriptPanel } from './components/home';
import { RequestTabsBar } from './components/sidebar';
import { ResponseViewer } from './components/response';
import { VariableEditableInput, RequestEditor } from './components/request';
import { buildCurlCommand, parseCurlToApiConfig } from './utils/curlUtils';
import {
    findTreeNode,
    getChildrenByFolderPath,
    getParentFolderPath,
    checkDropAppendIntoFolder,
    checkDropOrdered,
    getDropHintMessage,
    replacePathPrefix,
} from './utils/treeUtils';
import {
    Project,
    ProjectWorkspaceState,
    ProjectGroupStore,
    createEmptyWorkspaceState,
    DEFAULT_PROJECT_GROUP,
} from './types';
import { useScriptContext } from './contexts/ScriptContext';
import { useEnvironment } from './hooks/useEnvironment';
import { useMCP } from './hooks/useMCP';
import { useProjects } from './hooks/useProjects';
import { useRequest } from './hooks/useRequest';

// ProjectTree interface - uses string type to match Wails generated model
interface ProjectTree {
    id: string;
    name: string;
    type: string;
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

function App() {
    const [status, setStatus] = useState('初始化中...');
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [cookieModalVisible, setCookieModalVisible] = useState(false);
    const [cookieInput, setCookieInput] = useState('');
    const [globalCookies, setGlobalCookies] = useState<any[]>([]);
    const [mcpModalVisible, setMCpModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    const {
        projectScripts,
        editingScriptId,
        scriptsLoading,
        scriptSaving,
        scriptHelpVisible,
        setProjectScripts,
        setEditingScriptId,
        setScriptFormName,
        setScriptFormDescription,
        setScriptFormContent,
        setScriptSaving,
        setScriptHelpVisible,
        loadProjectScriptsData,
        selectScript,
        createScript,
    } = useScriptContext();

    // Use environment hook to replace duplicate local state
    const useEnv = useEnvironment();
    const {
        environments,
        selectedEnvironmentId,
        editingEnvironmentId,
        envLoading,
        environmentTabs,
        activeEnvironmentTab,
        loadEnvironmentsData,
        openEnvironmentEditor,
        openCreateEnvironmentTab,
        closeEnvironmentTab,
        setSelectedEnvironmentId,
        setActiveEnvironmentTab,
    } = useEnv;

    const {
        mcpConfig,
        mcpStatus,
        mcpEnvironments,
        loadMCPConfig,
        saveAndApplyMCPConfig,
        loadMCPEnvironments,
        checkMCPStatus,
    } = useMCP();

    const useProjs = useProjects();

    const useReq = useRequest({
        onTreeRefresh: (projectId, tree) => {
            setProjectTrees(prev => ({ ...prev, [projectId]: tree }));
        }
    });

    // Destructure state from useReq to replace duplicate local state
    const {
        // Request tabs
        requestTabs,
        activeRequestTab,
        currentRequest,
        response,
        formattedResponse,
        scriptLogsExpanded,
        testResultsExpanded,
        executing,
        apiConfig,
        interfaceApiConfig,
        curlPreview,
        requestCases,
        activeCaseId,
        requestEditorSurface,
        sidebarHighlightedCasePath,
        expandedRequestPaths,
        caseRenameModalOpen,
        caseRenameCasePath,
        caseRenameInput,
        addCaseModalOpen,
        addCaseTargetPath,
        addCaseNameInput,
        createFolderModal,
        newFolderName,
        createRequestModal,
        newRequestName,
        renameModal,
        renameType,
        renamePath,
        renameValue,
        selectedFolder,
        selectedKeys,
        searchKeyword,
        filterMethod,
        collapsedFolders,
        draggingNode,
        dropTargetFolderPath,
        invalidDropHint,
        movedHighlightPath,
        expandedKeys,
        importing,
        forceListAnimation,
        // Setters
        setRequestTabs,
        setActiveRequestTab,
        setCurrentRequest,
        setResponse,
        setFormattedResponse,
        setScriptLogsExpanded,
        setTestResultsExpanded,
        setExecuting,
        setApiConfig,
        setInterfaceApiConfig,
        setCurlPreview,
        setRequestCases,
        setActiveCaseId,
        setRequestEditorSurface,
        setSidebarHighlightedCasePath,
        setExpandedRequestPaths,
        setCaseRenameModalOpen,
        setCaseRenameCasePath,
        setCaseRenameInput,
        setAddCaseModalOpen,
        setAddCaseTargetPath,
        setAddCaseNameInput,
        setCreateFolderModal,
        setNewFolderName,
        setCreateRequestModal,
        setNewRequestName,
        setRenameModal,
        setRenameType,
        setRenamePath,
        setRenameValue,
        setSelectedFolder,
        setSelectedKeys,
        setSearchKeyword,
        setFilterMethod,
        setCollapsedFolders,
        setDraggingNode,
        setDropTargetFolderPath,
        setInvalidDropHint,
        setMovedHighlightPath,
        setExpandedKeys,
        setImporting,
        setSearchVersion,
        setForceListAnimation,
    } = useReq;

    // Use state and functions from useProjects hook
    const {
        loading,
        projects,
        projectTabs,
        activeTab,
        setActiveTab,
        projectTrees,
        setProjectTrees,
        collapsedFolders: projectCollapsedFolders,
        setCollapsedFolders: setProjectCollapsedFolders,
        expandedKeys: projectExpandedKeys,
        setExpandedKeys: setProjectExpandedKeys,
        projectGroups,
        projectGroupAssignments,
        collapsedProjectGroups,
        setCollapsedProjectGroups,
        draggingProjectId,
        projectDropTargetGroup,
        setDraggingProjectId,
        setProjectDropTargetGroup,
        draggingGroupName,
        groupSortDropTarget,
        createGroupModal,
        newGroupName,
        setCreateGroupModal,
        setNewGroupName,
        renameProjectModal,
        renameProjectId,
        renameProjectValue,
        setRenameProjectModal,
        setRenameProjectId,
        setRenameProjectValue,
        renameGroupModal,
        renameGroupValue,
        editingGroupName,
        setRenameGroupModal,
        setRenameGroupValue,
        setEditingGroupName,
        projectSearchKeyword,
        setProjectSearchKeyword,
        projectGroupsLoaded,
        setProjectGroupsLoaded,
        setProjectTabs,
        // Raw setters for group state
        setProjectGroups,
        setProjectGroupAssignments,
        setDraggingGroupName,
        setGroupSortDropTarget,
        // Group operations
        createGroupWithName,
        renameGroupWithName,
        handleAssignProjectGroup,
        toggleProjectGroupCollapse,
        openRenameProjectGroupModal,
        handleDeleteProjectGroup,
        // Drag and drop
        handleGroupDragStart,
        handleGroupDragOver,
        handleGroupDrop,
        // Project operations
        loadProjects,
        handleOpenProject,
        handleCloseProjectTab,
    } = useProjs;

    const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, ProjectWorkspaceState>>({});
    const [animationEnabled, setListAnimationEnabled] = useState(false);
    const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
        // 尝试从 localStorage 读取主题，避免闪烁
        const saved = localStorage.getItem('apiman-theme');
        return saved === 'dark' || saved === 'light' ? saved : 'light';
    });
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
    const forceAnimationTimerRef = React.useRef<number | null>(null);
    const renameInputRef = React.useRef<InputRef>(null);
    const renameSelectionEndRef = React.useRef<number>(0);

    // Ant Design 的下拉弹层会挂载到 body（portal）。因此需要把主题 class 挂到 html 上，
    // 才能让弹层也吃到深色主题的 CSS 变量与覆盖样式。
    React.useEffect(() => {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('theme-dark', appTheme === 'dark');
    }, [appTheme]);

    // Derived value: current active project
    const activeProject = projectTabs.find(t => t.id === activeTab)?.project;

    const clearDragState = () => {
        useReq.setDraggingNode(null);
        useReq.setDropTargetFolderPath(null);
        useReq.setInvalidDropHint(null);
    };

    // Re-export workspace state functions from useRequest
    const resetWorkspaceState = useReq.resetWorkspaceState;
    const captureCurrentWorkspaceState = useReq.captureCurrentWorkspaceState;
    const applyWorkspaceState = useReq.applyWorkspaceState;

    const handleCreateScript = async () => {
        if (activeProject) {
            await createScript(activeProject.id);
            setSidebarMenu('scripts');
        }
    };

    const switchProjectTab = (targetTab: string, skipSaveCurrent: boolean = false) => {
        if (targetTab === activeTab) {
            return;
        }

        if (!skipSaveCurrent && activeTab !== 'home') {
            const currentState = captureCurrentWorkspaceState();
            setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
        }

        setActiveTab(targetTab);
        if (targetTab === 'home') {
            resetWorkspaceState();
            return;
        }

        const targetState = projectWorkspaceStates[targetTab] || createEmptyWorkspaceState();
        applyWorkspaceState(targetState);
    };


    useEffect(() => {
        const init = async () => {
            try {
                await InitProjectsDir();
            } catch (e) {
                console.error('Failed to init projects dir:', e);
            }
            loadProjects();
            loadUiConfig();
            loadProjectGroupsState();
            checkMCPStatus();
            loadMCPConfig();
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeProject?.id) {
            setProjectScripts([]);
            setEditingScriptId('');
            setScriptFormName('');
            setScriptFormDescription('');
            setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            return;
        }
        loadProjectScriptsData(activeProject.id);
        loadEnvironmentsData(activeProject.id);
    }, [activeTab, projectTabs, activeProject]);

    useEffect(() => {
        const projectIds = new Set(projects.map(p => p.id));
        setProjectGroupAssignments(prev => {
            let changed = false;
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([projectId, groupName]) => {
                if (projectIds.has(projectId)) {
                    next[projectId] = groupName;
                } else {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [projects]);

    useEffect(() => {
        return () => {
            if (forceAnimationTimerRef.current) {
                window.clearTimeout(forceAnimationTimerRef.current);
            }
        };
    }, []);

    const loadUiConfig = async () => {
        try {
            const cfg = await LoadAppConfig() as any;
            setListAnimationEnabled(Boolean(cfg?.ui?.enableListAnimation));
            setAppTheme(cfg?.ui?.theme || 'light');
        } catch (error) {
            console.error('Failed to load UI config:', error);
        }
    };

    const loadProjectGroupsState = async () => {
        try {
            const state = await (window as any).go.main.App.LoadProjectGroupsState() as ProjectGroupStore;
            setProjectGroups(Array.isArray(state?.groups) ? state.groups.filter(Boolean) : []);
            setProjectGroupAssignments(state?.assignments || {});
            setCollapsedProjectGroups(new Set(Array.isArray(state?.collapsedGroups) ? state.collapsedGroups : []));
        } catch (error) {
            console.error('Failed to load project groups state:', error);
        } finally {
            setProjectGroupsLoaded(true);
        }
    };

    useEffect(() => {
        if (!projectGroupsLoaded) return;
        const persist = async () => {
            try {
                await (window as any).go.main.App.SaveProjectGroupsState({
                    groups: projectGroups,
                    assignments: projectGroupAssignments,
                    collapsedGroups: Array.from(collapsedProjectGroups),
                });
            } catch (error) {
                console.error('Failed to save project groups state:', error);
            }
        };
        persist();
    }, [projectGroups, projectGroupAssignments, collapsedProjectGroups, projectGroupsLoaded]);

    // Update curl preview when apiConfig changes
    useEffect(() => {
        setCurlPreview(buildCurlCommand(apiConfig));
    }, [apiConfig.method, apiConfig.url, apiConfig.headers, apiConfig.params, apiConfig.body, apiConfig.bodyType, apiConfig.formData, apiConfig.urlencoded]);

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.json',
        showUploadList: false,
        beforeUpload: (file) => {
            useProjs.handleImportPostman(file);
            return false;
        },
    };

    const createProjectWithName = async (name: string) => {
        try {
            await CreateProject(name);
            message.success('项目创建成功');
            loadProjects();
        } catch (error: any) {
            console.error('Failed to create project:', error);
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const openRenameProjectModal = (project: Project, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRenameProjectId(project.id);
        setRenameProjectValue(project.name);
        setRenameProjectModal(true);
    };

    const loadGlobalCookies = async () => {
        try {
            const data = await LoadGlobalCookies();
            if (data) {
                setGlobalCookies(JSON.parse(data));
            } else {
                setGlobalCookies([]);
            }
        } catch (err) {
            console.error('Failed to load cookies:', err);
            setGlobalCookies([]);
        }
    };

    // Tree utility wrappers that pass currentTree
    const getNodeByPath = (path: string): ProjectTree | null => {
        return findTreeNode(currentTree, path);
    };

    // Environment action wrappers - convert () => void interface for EnvironmentPanel
    const handleCreateEnvironment = () => {
        useEnv.openCreateEnvironmentTab(projectTabs, activeTab);
    };

    useEffect(() => {
        if (!renameModal) return;
        setTimeout(() => {
            const input = renameInputRef.current?.input;
            if (!input) return;
            input.focus();
            const end = Math.max(0, Math.min(renameSelectionEndRef.current, input.value.length));
            input.setSelectionRange(0, end);
        }, 0);
    }, [renameModal]);


    const currentTree = activeProject ? projectTrees[activeProject.id] : null;
    const tabItems = [
        {
            key: 'home',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <HomeOutlined style={{ marginRight: 0 }} />
                    <span>主页</span>
                </span>
            ),
            closable: false,
        },
        ...projectTabs.map(tab => ({
            key: tab.id,
            label: tab.title,
        }))
    ];

    return (
        <div className={`app-container ${appTheme === 'dark' ? 'theme-dark' : ''}`}>
            <TitleBar
                activeTab={activeTab}
                onListAnimationChange={setListAnimationEnabled}
                onThemeChange={(theme) => {
                    localStorage.setItem('apiman-theme', theme);
                    setAppTheme(theme as 'light' | 'dark');
                }}
                theme={appTheme}
                onSettingsSave={loadProjects}
                onTabChange={(key) => {
                    switchProjectTab(key);
                }}
                onTabEdit={(targetKey, action) => {
                    if (action === 'remove' && targetKey !== 'home') {
                        handleCloseProjectTab(targetKey as string);
                    }
                }}
                tabItems={tabItems}
            />

            <div className="app-content">
                {activeTab === 'home' ? (
                    <HomePage
                        projects={projects as any}
                        loading={loading}
                        searchKeyword={projectSearchKeyword}
                        projectGroups={projectGroups}
                        projectGroupAssignments={projectGroupAssignments}
                        collapsedProjectGroups={collapsedProjectGroups}
                        draggingProjectId={draggingProjectId}
                        projectDropTargetGroup={projectDropTargetGroup}
                        groupSortDropTarget={groupSortDropTarget}
                        draggingGroupName={draggingGroupName}
                        createGroupModal={createGroupModal}
                        createProjectModal={createProjectModal}
                        uploadProps={uploadProps}
                        importing={importing}
                        DEFAULT_PROJECT_GROUP={DEFAULT_PROJECT_GROUP}
                        onSearchChange={setProjectSearchKeyword}
                        onCreateGroup={() => setCreateGroupModal(true)}
                        onCreateProject={() => setCreateProjectModal(true)}
                        onAssignProjectGroup={handleAssignProjectGroup}
                        onToggleGroupCollapse={toggleProjectGroupCollapse}
                        onGroupDragStart={handleGroupDragStart}
                        onGroupDragOver={handleGroupDragOver}
                        onGroupDrop={handleGroupDrop}
                        onDragEnd={() => {
                            setDraggingGroupName(null);
                            setGroupSortDropTarget(null);
                        }}
                        onOpenProject={handleOpenProject}
                        onDeleteProject={useProjs.handleDeleteProject}
                        onRenameProject={(project) => openRenameProjectModal(project)}
                        onCreateGroupWithName={createGroupWithName}
                        onDeleteGroup={handleDeleteProjectGroup}
                        onOpenRenameGroupModal={openRenameProjectGroupModal}
                        onSetDraggingProjectId={setDraggingProjectId}
                        onSetProjectDropTargetGroup={setProjectDropTargetGroup}
                    />
                ) : (
                    <div className="project-workspace">
                        <ProjectSidebar
                            sidebarMenu={sidebarMenu}
                            currentTree={currentTree as any}
                            treeLoading={loading}
                            expandedKeys={expandedKeys}
                            collapsedFolders={collapsedFolders}
                            expandedRequestPaths={expandedRequestPaths}
                            sidebarHighlightedCasePath={sidebarHighlightedCasePath}
                            searchKeyword={searchKeyword}
                            filterMethod={filterMethod}
                            environments={environments}
                            projectScripts={projectScripts}
                            editingEnvironmentId={editingEnvironmentId}
                            editingScriptId={editingScriptId}
                            envLoading={envLoading}
                            scriptsLoading={scriptsLoading}
                            scriptSaving={scriptSaving}
                            draggingNode={draggingNode}
                            dropTargetFolderPath={dropTargetFolderPath}
                            movedHighlightPath={movedHighlightPath}
                            animationEnabled={animationEnabled}
                            forceListAnimation={forceListAnimation}
                            currentRequestPath={currentRequest?.path}
                            onSidebarMenuChange={setSidebarMenu}
                            onCreateFolder={() => setCreateFolderModal(true)}
                            onCreateRequest={() => setCreateRequestModal(true)}
                            onCreateEnvironment={handleCreateEnvironment}
                            onCreateScript={() => { if (activeProject) { createScript(activeProject.id); setSidebarMenu('scripts'); } }}
                            onEnvironmentSelect={(env) => openEnvironmentEditor(env)}
                            onScriptSelect={(script) => selectScript(script)}
                            onSearchChange={(v) => { setSearchKeyword(v); setSearchVersion(p => p + 1); }}
                            onMethodChange={setFilterMethod}
                            onToggleExpand={(key) => { setExpandedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); }}
                            onFolderCollapse={useReq.toggleFolderCollapse}
                            onItemClick={(key, node) => useReq.handleTreeItemClick(node)}
                            onAddRequest={(folderPath) => { setSelectedFolder(folderPath || currentTree?.path || ''); setCreateRequestModal(true); }}
                            onAddFolder={(folderPath) => { setSelectedFolder(folderPath || currentTree?.path || ''); setCreateFolderModal(true); }}
                            onRename={useReq.openRenameModal}
                            onDelete={(type, path) => { if (type === 'folder') { activeProject && useReq.handleDeleteFolder(path, activeProject.id); } else { activeProject && useReq.handleDeleteRequest(path, activeProject.id, requestTabs.find(t => t.path === path)?.id); } }}
                            onCopy={(path) => { if (activeProject) { useReq.handleCopyRequest(path, activeProject.id); } }}
                            onCaseClick={(casePath) => { const node = getNodeByPath(casePath); if (node) useReq.handleCaseTreeClick(node); }}
                            onToggleCasesExpanded={useReq.toggleRequestCasesExpanded}
                            onAddCase={useReq.openAddCaseModal}
                            onDeleteCase={(casePath) => { if (activeProject) { useReq.handleDeleteCaseFromTree(casePath, activeProject.id); } }}
                            onDuplicateCase={(casePath) => { if (activeProject) { useReq.handleDuplicateCaseFromTree(casePath, activeProject.id); } }}
                            onRenameCase={useReq.openCaseRenameFromTree}
                            onClearDragState={clearDragState}
                            onSetDraggingNode={setDraggingNode}
                            onSetDropTargetFolderPath={setDropTargetFolderPath}
                            onSetInvalidDropHint={setInvalidDropHint}
                            onCheckDropAppendIntoFolder={(dragNode, targetFolderPath) => checkDropAppendIntoFolder(currentTree, dragNode, targetFolderPath)}
                            onCheckDropOrdered={(dragNode, parentContainerPath, beforeID) => checkDropOrdered(currentTree, dragNode, parentContainerPath, beforeID)}
                            onGetDropHintMessage={getDropHintMessage}
                            onMoveRequestNode={async (requestPath, targetFolderPath, beforeID = '') => {
                                if (!activeProject) return;
                                try {
                                    await useReq.moveRequestNode(requestPath, targetFolderPath, beforeID ?? '', activeProject.id);
                                } catch (error: any) {
                                    message.error(`移动失败: ${error?.message || error}`);
                                }
                            }}
                            onMoveFolderNode={async (folderPath, targetFolderPath, beforeID = '') => {
                                if (!activeProject) return;
                                try {
                                    await useReq.moveFolderNode(folderPath, targetFolderPath, beforeID ?? '', activeProject.id);
                                } catch (error: any) {
                                    message.error(`移动失败: ${error?.message || error}`);
                                }
                            }}
                            onGetParentFolderPath={(path) => getParentFolderPath(currentTree, path)}
                            onGetChildrenByFolderPath={(folderPath) => getChildrenByFolderPath(currentTree, folderPath)}
                        />

                        <div className="project-main">
                            {sidebarMenu === 'apis' && requestTabs.length > 0 && (
                                <RequestTabsBar
                                    requestTabs={requestTabs}
                                    activeRequestTab={activeRequestTab}
                                    selectedEnvironmentId={selectedEnvironmentId}
                                    environments={environments}
                                    animationEnabled={animationEnabled || forceListAnimation}
                                    onTabChange={setActiveRequestTab}
                                    onTabClose={useReq.handleCloseRequestTab}
                                    onEnvironmentChange={setSelectedEnvironmentId}
                                    loadRequestContent={useReq.loadRequestContent}
                                />
                            )}

                            {sidebarMenu === 'environments' ? (
                                <div className="request-panel">
                                    {environmentTabs.length > 0 ? (
                                        <>
                                            <Tabs
                                                activeKey={activeEnvironmentTab}
                                                onChange={(key) => setActiveEnvironmentTab(key)}
                                                type="editable-card"
                                                hideAdd
                                                onEdit={(targetKey, action) => {
                                                    if (action === 'remove') {
                                                        closeEnvironmentTab(targetKey as string);
                                                    }
                                                }}
                                                items={environmentTabs.map(tab => ({
                                                    key: tab.key,
                                                    label: tab.title,
                                                }))}
                                                size="small"
                                                style={{ marginBottom: 12 }}
                                                animated={(animationEnabled || forceListAnimation)}
                                            />
                                            <EnvironmentPanel
                                                projectId={activeProject?.id || ''}
                                            />
                                        </>
                                    ) : (
                                        <Empty description="请先在左侧选择环境，或点击新建" />
                                    )}
                                </div>
                            ) : sidebarMenu === 'scripts' ? (
                                <div className="request-panel">
                                    {editingScriptId ? (
                                        <ScriptPanel
                                            projectId={activeProject?.id || ''}
                                        />
                                    ) : (
                                        <Empty description="请先在左侧选择脚本，或点击新建" />
                                    )}
                                </div>
                            ) : currentRequest ? (
                                <div className="request-response-container">
                                    <RequestEditor
                                        apiConfig={apiConfig}
                                        executing={executing}
                                        requestCases={requestCases}
                                        activeCaseId={activeCaseId}
                                        requestEditorSurface={requestEditorSurface}
                                        curlPreview={curlPreview}
                                        environmentVariables={useEnv.currentEnvironmentVariables}
                                        projectScripts={projectScripts}
                                        animationEnabled={animationEnabled}
                                        forceListAnimation={forceListAnimation}
                                        onMethodChange={(value) => setApiConfig({ ...apiConfig, method: value })}
                                        onUrlChange={(value) => setApiConfig({ ...apiConfig, url: value })}
                                        onSend={() => { if (activeProject) { useReq.handleExecuteCurl(activeProject.id, activeProject.name, selectedEnvironmentId, environments); } }}
                                        onSave={() => { if (activeProject) { useReq.handleSaveRequest(activeProject.id); } }}
                                        onConfigChange={setApiConfig}
                                        onCurlPreviewChange={setCurlPreview}
                                        renderVariableAwareInput={(value, onChange, placeholder, style, multiline) => <VariableEditableInput value={value} onChange={onChange} placeholder={placeholder} style={style} environmentVariables={useEnv.currentEnvironmentVariables} multiline={multiline} />}
                                        parseCurlToApiConfig={parseCurlToApiConfig}
                                    />

                                    {response && (
                                        <ResponseViewer
                                            response={response}
                                            formattedResponse={formattedResponse}
                                            scriptLogsExpanded={scriptLogsExpanded}
                                            testResultsExpanded={testResultsExpanded}
                                            animationEnabled={animationEnabled}
                                            forceListAnimation={forceListAnimation}
                                            appTheme={appTheme}
                                            onScriptLogsExpand={() => setScriptLogsExpanded(!scriptLogsExpanded)}
                                            onTestResultsExpand={() => setTestResultsExpanded(!testResultsExpanded)}
                                        />
                                    )}
                                </div>
                            ) : (
                                <EmptyState text="选择一个请求开始测试" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {invalidDropHint && (
                <div
                    className="drop-hint-floating"
                    style={{
                        left: invalidDropHint.x,
                        top: invalidDropHint.y,
                    }}
                >
                    {invalidDropHint.message}
                </div>
            )}

            <CreateProjectModal
                visible={createProjectModal}
                onClose={() => setCreateProjectModal(false)}
                onConfirm={createProjectWithName}
                appTheme={appTheme}
            />

            <CreateGroupModal
                visible={createGroupModal}
                onClose={() => setCreateGroupModal(false)}
                onConfirm={createGroupWithName}
            />

            <RenameProjectModal
                visible={renameProjectModal}
                onClose={() => {
                    setRenameProjectModal(false);
                    setRenameProjectId('');
                    setRenameProjectValue('');
                }}
                onConfirm={useProjs.renameProjectWithName}
                initialValue={renameProjectValue}
            />

            <RenameGroupModal
                visible={renameGroupModal}
                onClose={() => {
                    setRenameGroupModal(false);
                    setEditingGroupName('');
                    setRenameGroupValue('');
                }}
                onConfirm={renameGroupWithName}
                initialValue={renameGroupValue}
            />

            <CreateFolderModal
                visible={createFolderModal}
                onClose={() => { setCreateFolderModal(false); setNewFolderName(''); }}
                onConfirm={() => { if (activeProject) { return useReq.handleCreateFolder(activeProject.id); } return Promise.resolve(); }}
            />

            <CreateRequestModal
                visible={createRequestModal}
                onClose={() => { setCreateRequestModal(false); setNewRequestName(''); }}
                onConfirm={() => { if (activeProject) { return useReq.handleCreateRequest(activeProject.id); } return Promise.resolve(); }}
            />

            <RenameModal
                visible={renameModal}
                onClose={() => { setRenameModal(false); setRenamePath(''); setRenameValue(''); }}
                onConfirm={useReq.handleRename}
                title={renameType === 'request' ? '重命名请求' : '重命名文件夹'}
                initialValue={renameValue}
            />

            <AddCaseModal
                visible={addCaseModalOpen}
                onClose={() => {
                    setAddCaseModalOpen(false);
                    setAddCaseTargetPath('');
                    setAddCaseNameInput('');
                }}
                onConfirm={(name) => { return useReq.confirmAddCaseModal(name); }}
                initialName={addCaseNameInput}
            />

            <RenameCaseModal
                visible={caseRenameModalOpen}
                onClose={() => {
                    setCaseRenameModalOpen(false);
                    setCaseRenameCasePath('');
                    setCaseRenameInput('');
                }}
                onConfirm={useReq.confirmCaseRenameFromTree}
                initialName={caseRenameInput}
            />

            <CookieModal
                visible={cookieModalVisible}
                onClose={() => { setCookieModalVisible(false); setCookieInput(''); }}
                appTheme={appTheme}
                cookieInput={cookieInput}
                setCookieInput={setCookieInput}
                globalCookies={globalCookies}
                onLoadCookies={loadGlobalCookies}
            />

            <ScriptHelpWindow
                visible={scriptHelpVisible}
                onClose={() => setScriptHelpVisible(false)}
            />

            <MCPSettingsModal
                visible={mcpModalVisible}
                onClose={() => setMCpModalVisible(false)}
                projects={projects}
                mcpConfig={mcpConfig}
                onSave={saveAndApplyMCPConfig}
                currentStatus={mcpStatus}
                appTheme={appTheme}
                environments={mcpEnvironments}
                onLoadEnvironments={loadMCPEnvironments}
            />

            <HistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                appTheme={appTheme}
            />

            <AppFooter
                mcpStatus={mcpStatus}
                onOpenCookie={() => { setCookieModalVisible(true); loadGlobalCookies(); }}
                onOpenMCP={() => setMCpModalVisible(true)}
                onOpenHistory={() => setHistoryModalVisible(true)}
            />
        </div>
    );
}

export default App;
