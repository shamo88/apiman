import React, { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import {
  Project,
  ProjectGroupStore,
  DEFAULT_PROJECT_GROUP,
} from '../types';
import {
  ListProjects,
  CreateProject,
  DeleteProject,
  RenameProject,
  InitProjectsDir,
  ImportPostmanCollection,
  GetProjectTree,
  LoadProjectGroupsState,
  SaveProjectGroupsState,
} from '../../wailsjs/go/main/App';

export interface ProjectTab {
  id: string;
  title: string;
  project: Project;
}

export interface UseProjectsReturn {
  // State
  projects: Project[];
  projectGroups: string[];
  projectGroupAssignments: Record<string, string>;
  collapsedProjectGroups: Set<string>;
  setCollapsedProjectGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  projectGroupsLoaded: boolean;
  setProjectGroupsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  draggingProjectId: string | null;
  projectDropTargetGroup: string | null;
  draggingGroupName: string | null;
  groupSortDropTarget: string | null;
  createProjectModal: boolean;
  newProjectName: string;
  createGroupModal: boolean;
  newGroupName: string;
  renameProjectModal: boolean;
  renameProjectId: string;
  renameProjectValue: string;
  renameGroupModal: boolean;
  renameGroupValue: string;
  editingGroupName: string;
  projectSearchKeyword: string;
  loading: boolean;

  // Project Tab State (for external coordination)
  projectTabs: ProjectTab[];
  activeTab: string;
  setProjectTabs: React.Dispatch<React.SetStateAction<ProjectTab[]>>;
  setActiveTab: (tabId: string) => void;

  // Project Tree State (for external coordination)
  projectTrees: Record<string, any>;
  setProjectTrees: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  collapsedFolders: Set<string>;
  setCollapsedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedKeys: string[];
  setExpandedKeys: React.Dispatch<React.SetStateAction<string[]>>;

  // Setters for modal states
  setCreateProjectModal: (visible: boolean) => void;
  setNewProjectName: (name: string) => void;
  setCreateGroupModal: (visible: boolean) => void;
  setNewGroupName: (name: string) => void;
  setRenameProjectModal: (visible: boolean) => void;
  setRenameProjectId: (id: string) => void;
  setRenameProjectValue: (value: string) => void;
  setRenameGroupModal: (visible: boolean) => void;
  setRenameGroupValue: (value: string) => void;
  setEditingGroupName: (name: string) => void;
  setProjectSearchKeyword: (keyword: string) => void;

  // State setters for project tabs and workspace
  switchProjectTab: (tabId: string, skipSave?: boolean) => void;
  captureCurrentWorkspaceState: () => any;
  createEmptyWorkspaceState: () => any;
  resetWorkspaceState: () => void;
  triggerOpenTabAnimation: () => void;

  // Project operations
  loadProjects: () => Promise<void>;
  handleCreateProject: () => Promise<void>;
  createProjectWithName: (name: string) => Promise<void>;
  handleDeleteProject: (projectId: string, e?: React.MouseEvent) => void;
  openRenameProjectModal: (project: Project, e?: React.MouseEvent) => void;
  renameProjectWithName: (name: string) => Promise<void>;

  // Group operations
  createGroupWithName: (groupName: string) => Promise<void>;
  handleCreateProjectGroup: () => void;
  renameGroupWithName: (groupName: string) => Promise<void>;
  handleAssignProjectGroup: (projectId: string, groupName: string) => void;
  toggleProjectGroupCollapse: (groupName: string) => void;
  openRenameProjectGroupModal: (groupName: string) => void;
  handleRenameProjectGroup: () => void;
  handleDeleteProjectGroup: (groupName: string) => void;

  // Drag and drop
  handleGroupDragStart: (groupName: string, e: React.DragEvent) => void;
  handleGroupDragOver: (groupName: string, e: React.DragEvent) => void;
  handleGroupDrop: (groupName: string, e: React.DragEvent) => void;

  // Project tab operations
  handleOpenProject: (project: Project) => Promise<void>;
  handleCloseProjectTab: (tabId: string) => void;

  // Import
  handleImportPostman: (file: File) => Promise<void>;

  // Internal helpers (exposed for testing)
  collectFolderKeys: (tree: any) => string[];
}

interface UseProjectsOptions {
  onProjectOpen?: (project: Project) => void;
  onProjectClose?: (projectId: string) => void;
}

const createDefaultApiConfig = () => ({
  name: '',
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  body: '',
  bodyType: 'none' as const,
  formData: [],
  urlencoded: [],
  preScripts: [],
  postScripts: [],
});

const createEmptyWorkspaceState = () => ({
  requestTabs: [],
  activeRequestTab: '',
  currentRequest: null,
  response: null,
  selectedKeys: [],
  apiConfig: createDefaultApiConfig(),
  selectedEnvironmentId: '',
  requestCases: [],
  activeCaseId: '',
  interfaceApiConfig: createDefaultApiConfig(),
  requestEditorSurface: 'plain' as const,
  sidebarHighlightedCasePath: ''
});

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  // Core project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectSearchKeyword, setProjectSearchKeyword] = useState('');

  // Project groups state
  const [projectGroups, setProjectGroups] = useState<string[]>([]);
  const [projectGroupAssignments, setProjectGroupAssignments] = useState<Record<string, string>>({});
  const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set());
  const [projectGroupsLoaded, setProjectGroupsLoaded] = useState(false);

  // Drag state
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [projectDropTargetGroup, setProjectDropTargetGroup] = useState<string | null>(null);
  const [draggingGroupName, setDraggingGroupName] = useState<string | null>(null);
  const [groupSortDropTarget, setGroupSortDropTarget] = useState<string | null>(null);

  // Create project modal state
  const [createProjectModal, setCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Create group modal state
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Rename project modal state
  const [renameProjectModal, setRenameProjectModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState('');
  const [renameProjectValue, setRenameProjectValue] = useState('');

  // Rename group modal state
  const [renameGroupModal, setRenameGroupModal] = useState(false);
  const [renameGroupValue, setRenameGroupValue] = useState('');
  const [editingGroupName, setEditingGroupName] = useState('');

  // Project tabs state (managed here but coordinated with App)
  const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
  const [activeTab, setActiveTab] = useState('home');

  // Project workspace states (for tab persistence)
  const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, any>>({});

  // Project trees state
  const [projectTrees, setProjectTrees] = useState<Record<string, any>>({});
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // Animation timers
  const forceAnimationTimerRef = React.useRef<number | null>(null);
  const [forceListAnimation, setForceListAnimation] = useState(false);

  // Helper functions
  const collectFolderKeys = useCallback((tree: any): string[] => {
    if (!tree) return [];
    const keys: string[] = [];

    const walk = (node: any) => {
      if (node.type === 'folder') {
        keys.push(node.path || node.id);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    };

    walk(tree);
    return keys;
  }, []);

  const triggerOpenTabAnimation = useCallback(() => {
    setForceListAnimation(true);
    if (forceAnimationTimerRef.current) {
      window.clearTimeout(forceAnimationTimerRef.current);
    }
    forceAnimationTimerRef.current = window.setTimeout(() => {
      setForceListAnimation(false);
      forceAnimationTimerRef.current = null;
    }, 400);
  }, []);

  const switchProjectTab = useCallback((tabId: string, skipSave = false) => {
    if (activeTab !== 'home' && !skipSave) {
      const currentState = captureCurrentWorkspaceState();
      setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
    }
    setActiveTab(tabId);
    resetWorkspaceState();
    triggerOpenTabAnimation();
  }, [activeTab, triggerOpenTabAnimation]);

  const captureCurrentWorkspaceState = useCallback(() => {
    return createEmptyWorkspaceState();
  }, []);

  const resetWorkspaceState = useCallback(() => {
    // Reset is handled by the App component through workspace state
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (forceAnimationTimerRef.current) {
        window.clearTimeout(forceAnimationTimerRef.current);
      }
    };
  }, []);

  // Clean up project group assignments when projects are unloaded
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

  // Load project groups state
  const loadProjectGroupsState = useCallback(async () => {
    try {
      const state = await LoadProjectGroupsState() as ProjectGroupStore;
      setProjectGroups(Array.isArray(state?.groups) ? state.groups.filter(Boolean) : []);
      setProjectGroupAssignments(state?.assignments || {});
      setCollapsedProjectGroups(new Set(Array.isArray(state?.collapsedGroups) ? state.collapsedGroups : []));
    } catch (error) {
      console.error('Failed to load project groups state:', error);
    } finally {
      setProjectGroupsLoaded(true);
    }
  }, []);

  // Persist project groups state
  useEffect(() => {
    if (!projectGroupsLoaded) return;
    const persist = async () => {
      try {
        await SaveProjectGroupsState({
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

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await InitProjectsDir();
      } catch (e) {
        console.error('Failed to init projects dir:', e);
      }
      loadProjects();
      loadProjectGroupsState();
    };
    init();
  }, []);

  // Project operations
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const projectList = await ListProjects();
      setProjects((projectList || []) as unknown as Project[]);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      message.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      message.warning('请输入项目名称');
      return;
    }

    try {
      await CreateProject(newProjectName);
      message.success('项目创建成功');
      setCreateProjectModal(false);
      setNewProjectName('');
      loadProjects();
    } catch (error: any) {
      console.error('Failed to create project:', error);
      message.error(`创建失败: ${error?.message || error}`);
    }
  }, [newProjectName, loadProjects]);

  const createProjectWithName = useCallback(async (name: string) => {
    try {
      await CreateProject(name);
      message.success('项目创建成功');
      loadProjects();
    } catch (error: any) {
      console.error('Failed to create project:', error);
      message.error(`创建失败: ${error?.message || error}`);
    }
  }, [loadProjects]);

  const handleDeleteProject = useCallback((projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    Modal.confirm({
      title: '删除项目',
      content: '确定要删除这个项目吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await DeleteProject(projectId);
          message.success('项目已删除');
          setProjectTabs(prev => prev.filter(t => t.project.id !== projectId));
          options.onProjectClose?.(projectId);
          loadProjects();
        } catch (error: any) {
          message.error(`删除失败: ${error?.message || error}`);
        }
      }
    });
  }, [loadProjects, options]);

  const openRenameProjectModal = useCallback((project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameProjectId(project.id);
    setRenameProjectValue(project.name);
    setRenameProjectModal(true);
  }, []);

  const renameProjectWithName = useCallback(async (name: string) => {
    if (!renameProjectId) return;
    const newName = name.trim();
    if (!newName) return;
    try {
      const renamed = await RenameProject(renameProjectId, newName);
      setProjectTabs(prev => prev.map(tab => (
        tab.project.id === renameProjectId
          ? { ...tab, title: renamed.name, project: { ...tab.project, name: renamed.name } }
          : tab
      )));
      message.success('项目重命名成功');
      await loadProjects();
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      if (msg.includes('同名') || msg.includes('已存在')) {
        message.warning('重命名失败：已存在同名项目');
      } else {
        message.error(`重命名失败: ${msg}`);
      }
    }
  }, [renameProjectId, loadProjects]);

  // Group operations
  const createGroupWithName = useCallback(async (groupName: string) => {
    const name = groupName.trim();
    if (!name) {
      message.warning('请输入分组名称');
      return;
    }
    if (name === DEFAULT_PROJECT_GROUP) {
      message.warning('该名称为系统默认分组，请使用其他名称');
      return;
    }
    if (projectGroups.includes(name)) {
      message.warning('分组名称已存在');
      return;
    }
    setProjectGroups(prev => [...prev, name]);
    message.success('分组创建成功');
  }, [projectGroups]);

  const handleCreateProjectGroup = useCallback(() => {
    const groupName = newGroupName.trim();
    if (!groupName) {
      message.warning('请输入分组名称');
      return;
    }
    if (groupName === DEFAULT_PROJECT_GROUP) {
      message.warning('该名称为系统默认分组，请使用其他名称');
      return;
    }
    if (projectGroups.includes(groupName)) {
      message.warning('分组名称已存在');
      return;
    }
    setProjectGroups(prev => [...prev, groupName]);
    setCreateGroupModal(false);
    setNewGroupName('');
    message.success('分组创建成功');
  }, [newGroupName, projectGroups]);

  const renameGroupWithName = useCallback(async (groupName: string) => {
    const oldName = editingGroupName;
    const newName = groupName.trim();
    if (!newName || !oldName) return;
    if (newName === oldName) return;
    if (newName === DEFAULT_PROJECT_GROUP) {
      message.warning('该名称为系统默认分组，请使用其他名称');
      return;
    }
    if (projectGroups.includes(newName)) {
      message.warning('分组名称已存在');
      return;
    }
    setProjectGroups(prev => prev.map(g => g === oldName ? newName : g));
    setProjectGroupAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key] === oldName) {
          next[key] = newName;
        }
      });
      return next;
    });
    message.success('分组重命名成功');
  }, [editingGroupName, projectGroups]);

  const handleAssignProjectGroup = useCallback((projectId: string, groupName: string) => {
    if (!groupName || groupName === DEFAULT_PROJECT_GROUP) {
      setProjectGroupAssignments(prev => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      return;
    }
    setProjectGroupAssignments(prev => ({ ...prev, [projectId]: groupName }));
  }, []);

  const toggleProjectGroupCollapse = useCallback((groupName: string) => {
    setCollapsedProjectGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const openRenameProjectGroupModal = useCallback((groupName: string) => {
    if (groupName === DEFAULT_PROJECT_GROUP) {
      message.warning('默认分组不支持重命名');
      return;
    }
    setEditingGroupName(groupName);
    setRenameGroupValue(groupName);
    setRenameGroupModal(true);
  }, []);

  const handleRenameProjectGroup = useCallback(() => {
    const nextName = renameGroupValue.trim();
    if (!editingGroupName) return;
    if (!nextName) {
      message.warning('请输入分组名称');
      return;
    }
    if (nextName === DEFAULT_PROJECT_GROUP) {
      message.warning('该名称为系统默认分组，请使用其他名称');
      return;
    }
    if (nextName !== editingGroupName && projectGroups.includes(nextName)) {
      message.warning('分组名称已存在');
      return;
    }

    setProjectGroups(prev => prev.map(name => (name === editingGroupName ? nextName : name)));
    setProjectGroupAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(projectId => {
        if (next[projectId] === editingGroupName) {
          next[projectId] = nextName;
        }
      });
      return next;
    });
    setCollapsedProjectGroups(prev => {
      const next = new Set(prev);
      if (next.delete(editingGroupName)) {
        next.add(nextName);
      }
      return next;
    });

    setRenameGroupModal(false);
    setEditingGroupName('');
    setRenameGroupValue('');
    message.success('分组重命名成功');
  }, [renameGroupValue, editingGroupName, projectGroups]);

  const handleDeleteProjectGroup = useCallback((groupName: string) => {
    if (groupName === DEFAULT_PROJECT_GROUP) {
      message.warning('默认分组不支持删除');
      return;
    }
    const affectedCount = Object.values(projectGroupAssignments).filter(name => name === groupName).length;
    Modal.confirm({
      title: '删除分组',
      content: affectedCount > 0
        ? `该分组下有 ${affectedCount} 个项目，删除后将自动移动到"${DEFAULT_PROJECT_GROUP}"。是否继续？`
        : '确定删除该分组吗？',
      onOk: () => {
        setProjectGroups(prev => prev.filter(name => name !== groupName));
        setProjectGroupAssignments(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(projectId => {
            if (next[projectId] === groupName) {
              delete next[projectId];
            }
          });
          return next;
        });
        setCollapsedProjectGroups(prev => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });
        message.success('分组已删除');
      }
    });
  }, [projectGroupAssignments]);

  // Drag and drop handlers
  const handleGroupDragStart = useCallback((groupName: string, e: React.DragEvent) => {
    if (groupName === DEFAULT_PROJECT_GROUP) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    setDraggingGroupName(groupName);
  }, []);

  const handleGroupDragOver = useCallback((groupName: string, e: React.DragEvent) => {
    if (!draggingGroupName) return;
    if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setGroupSortDropTarget(groupName);
  }, [draggingGroupName]);

  const handleGroupDrop = useCallback((groupName: string, e: React.DragEvent) => {
    if (!draggingGroupName) return;
    if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
    e.preventDefault();
    e.stopPropagation();
    setProjectGroups(prev => {
      const sourceIndex = prev.indexOf(draggingGroupName);
      const targetIndex = prev.indexOf(groupName);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return prev;
      const next = [...prev];
      next.splice(sourceIndex, 1);
      const insertIndex = next.indexOf(groupName);
      next.splice(insertIndex, 0, draggingGroupName);
      return next;
    });
    setDraggingGroupName(null);
    setGroupSortDropTarget(null);
  }, [draggingGroupName]);

  // Project tab operations
  const handleOpenProject = useCallback(async (project: Project) => {
    const existingTab = projectTabs.find(t => t.project.id === project.id);
    if (existingTab) {
      switchProjectTab(existingTab.id);
    } else {
      const newTab: ProjectTab = {
        id: project.id,
        title: project.name,
        project: project,
      };
      if (activeTab !== 'home') {
        const currentState = captureCurrentWorkspaceState();
        setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
      }
      setProjectTabs(prev => [...prev, newTab]);
      setProjectWorkspaceStates(prev => ({ ...prev, [newTab.id]: createEmptyWorkspaceState() }));
      setActiveTab(newTab.id);
      resetWorkspaceState();
      triggerOpenTabAnimation();

      setLoading(true);
      try {
        const tree = await GetProjectTree(project.id);
        setProjectTrees(prev => ({ ...prev, [project.id]: tree }));
        const folderKeys = collectFolderKeys(tree);
        setCollapsedFolders(prev => {
          const next = new Set(prev);
          folderKeys.forEach((key) => next.add(key));
          return next;
        });
        setExpandedKeys([project.id]);
        options.onProjectOpen?.(project);
      } catch (error: any) {
        console.error('Failed to load project tree:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [projectTabs, activeTab, switchProjectTab, captureCurrentWorkspaceState, triggerOpenTabAnimation, collectFolderKeys, options]);

  const handleCloseProjectTab = useCallback((tabId: string) => {
    const tab = projectTabs.find(t => t.id === tabId);
    setProjectTabs(prev => prev.filter(t => t.id !== tabId));
    setProjectWorkspaceStates(prev => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    if (activeTab === tabId) {
      const remaining = projectTabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        switchProjectTab(remaining[0].id, true);
      } else {
        switchProjectTab('home', true);
      }
    }
    if (tab) {
      options.onProjectClose?.(tab.project.id);
    }
  }, [projectTabs, activeTab, switchProjectTab, options]);

  // Import handler
  const handleImportPostman = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const project = await ImportPostmanCollection(text);
      message.success(`成功导入项目: ${project.name}`);
      loadProjects();
    } catch (error: any) {
      console.error('Failed to import Postman collection:', error);
      message.error(`导入失败: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  return {
    // State
    projects,
    projectGroups,
    projectGroupAssignments,
    collapsedProjectGroups,
    setCollapsedProjectGroups,
    projectGroupsLoaded,
    setProjectGroupsLoaded,
    draggingProjectId,
    projectDropTargetGroup,
    draggingGroupName,
    groupSortDropTarget,
    createProjectModal,
    newProjectName,
    createGroupModal,
    newGroupName,
    renameProjectModal,
    renameProjectId,
    renameProjectValue,
    renameGroupModal,
    renameGroupValue,
    editingGroupName,
    projectSearchKeyword,
    loading,

    // Project Tab State
    projectTabs,
    activeTab,
    setProjectTabs,
    setActiveTab,

    // Project Tree State
    projectTrees,
    setProjectTrees,
    collapsedFolders,
    setCollapsedFolders,
    expandedKeys,
    setExpandedKeys,

    // Setters
    setCreateProjectModal,
    setNewProjectName,
    setCreateGroupModal,
    setNewGroupName,
    setRenameProjectModal,
    setRenameProjectId,
    setRenameProjectValue,
    setRenameGroupModal,
    setRenameGroupValue,
    setEditingGroupName,
    setProjectSearchKeyword,

    // Workspace helpers
    switchProjectTab,
    captureCurrentWorkspaceState,
    createEmptyWorkspaceState,
    resetWorkspaceState,
    triggerOpenTabAnimation,

    // Project operations
    loadProjects,
    handleCreateProject,
    createProjectWithName,
    handleDeleteProject,
    openRenameProjectModal,
    renameProjectWithName,

    // Group operations
    createGroupWithName,
    handleCreateProjectGroup,
    renameGroupWithName,
    handleAssignProjectGroup,
    toggleProjectGroupCollapse,
    openRenameProjectGroupModal,
    handleRenameProjectGroup,
    handleDeleteProjectGroup,

    // Drag and drop
    handleGroupDragStart,
    handleGroupDragOver,
    handleGroupDrop,

    // Project tab operations
    handleOpenProject,
    handleCloseProjectTab,

    // Import
    handleImportPostman,

    // Helpers
    collectFolderKeys,
  };
}
