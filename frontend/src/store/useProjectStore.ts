import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTree {
  id: string;
  name: string;
  type: string;
  method?: string;
  url?: string;
  children?: ProjectTree[];
  path?: string;
}

export interface ProjectTab {
  id: string;
  title: string;
  project: Project;
}

const MAX_RECENT_PROJECTS = 5;
const RECENT_PROJECTS_KEY = 'apiman_recent_projects';

interface ProjectStore {
  projects: Project[];
  projectTabs: ProjectTab[];
  activeTab: 'home' | string;
  projectTrees: Record<string, ProjectTree>;
  expandedKeys: string[];
  collapsedFolders: Set<string>;
  projectGroups: string[];
  projectGroupAssignments: Record<string, string>;
  collapsedProjectGroups: Set<string>;
  projectSearchKeyword: string;
  loading: boolean;
  projectGroupsLoaded: boolean;
  recentProjects: Project[];

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  addToRecentProjects: (project: Project) => void;
  removeFromRecentProjects: (projectId: string) => void;
  setLoading: (loading: boolean) => void;
  openProjectTab: (project: Project) => void;
  closeProjectTab: (tabId: string) => void;
  setActiveTab: (tab: 'home' | string) => void;
  setProjectTree: (projectId: string, tree: ProjectTree) => void;
  toggleFolderCollapse: (folderPath: string) => void;
  setExpandedKeys: (keys: string[]) => void;
  setProjectGroups: (groups: string[], assignments: Record<string, string>) => void;
  assignProjectGroup: (projectId: string, groupName: string) => void;
  removeProjectFromGroup: (projectId: string) => void;
  renameGroup: (oldName: string, newName: string) => void;
  deleteGroup: (groupName: string) => void;
  toggleProjectGroupCollapse: (groupName: string) => void;
  setProjectSearchKeyword: (keyword: string) => void;
  setProjectGroupsLoaded: (loaded: boolean) => void;
  setCollapsedFolders: (folders: Set<string>) => void;
  reset: () => void;
}

const loadRecentProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load recent projects:', e);
  }
  return [];
};

const saveRecentProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save recent projects:', e);
  }
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      projects: [],
      projectTabs: [],
      activeTab: 'home',
      projectTrees: {},
      expandedKeys: [],
      collapsedFolders: new Set(),
      projectGroups: [],
      projectGroupAssignments: {},
      collapsedProjectGroups: new Set(),
      projectSearchKeyword: '',
      loading: false,
      projectGroupsLoaded: false,
      recentProjects: loadRecentProjectsFromStorage(),

      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      removeProject: (id) => set((state) => {
        const newRecent = state.recentProjects.filter((p) => p.id !== id);
        saveRecentProjectsToStorage(newRecent);
        return {
          projects: state.projects.filter((p) => p.id !== id),
          projectTabs: state.projectTabs.filter((t) => t.id !== id),
          recentProjects: newRecent,
        };
      }),
      addToRecentProjects: (project) => set((state) => {
        const filtered = state.recentProjects.filter((p) => p.id !== project.id);
        const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);
        saveRecentProjectsToStorage(updated);
        return { recentProjects: updated };
      }),
      removeFromRecentProjects: (projectId) => set((state) => {
        const newRecent = state.recentProjects.filter((p) => p.id !== projectId);
        saveRecentProjectsToStorage(newRecent);
        return { recentProjects: newRecent };
      }),
      setLoading: (loading) => set({ loading }),
      openProjectTab: (project) => set((state) => {
        const existing = state.projectTabs.find((t) => t.id === project.id);
        if (existing) {
          return { activeTab: project.id };
        }
        return {
          projectTabs: [...state.projectTabs, { id: project.id, title: project.name, project }],
          activeTab: project.id,
        };
      }),
      closeProjectTab: (tabId) => set((state) => {
        const newTabs = state.projectTabs.filter((t) => t.id !== tabId);
        let newActiveTab = state.activeTab;
        if (state.activeTab === tabId) {
          const closedIndex = state.projectTabs.findIndex((t) => t.id === tabId);
          newActiveTab = newTabs[closedIndex - 1]?.id || newTabs[0]?.id || 'home';
        }
        return { projectTabs: newTabs, activeTab: newActiveTab };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setProjectTree: (projectId, tree) => set((state) => ({
        projectTrees: { ...state.projectTrees, [projectId]: tree }
      })),
      toggleFolderCollapse: (folderPath) => set((state) => {
        const newSet = new Set(state.collapsedFolders);
        if (newSet.has(folderPath)) {
          newSet.delete(folderPath);
        } else {
          newSet.add(folderPath);
        }
        return { collapsedFolders: newSet };
      }),
      setExpandedKeys: (keys) => set({ expandedKeys: keys }),
      setProjectGroups: (groups, assignments) => set({ projectGroups: groups, projectGroupAssignments: assignments }),
      assignProjectGroup: (projectId, groupName) => set((state) => ({
        projectGroupAssignments: { ...state.projectGroupAssignments, [projectId]: groupName }
      })),
      removeProjectFromGroup: (projectId) => set((state) => {
        const next = { ...state.projectGroupAssignments };
        delete next[projectId];
        return { projectGroupAssignments: next };
      }),
      renameGroup: (oldName, newName) => set((state) => {
        const newAssignments = { ...state.projectGroupAssignments };
        for (const [projId, group] of Object.entries(newAssignments)) {
          if (group === oldName) {
            newAssignments[projId] = newName;
          }
        }
        return {
          projectGroups: state.projectGroups.map((g) => g === oldName ? newName : g),
          projectGroupAssignments: newAssignments,
        };
      }),
      deleteGroup: (groupName) => set((state) => {
        const newAssignments = { ...state.projectGroupAssignments };
        for (const [projId, group] of Object.entries(newAssignments)) {
          if (group === groupName) {
            delete newAssignments[projId];
          }
        }
        return {
          projectGroups: state.projectGroups.filter((g) => g !== groupName),
          projectGroupAssignments: newAssignments,
        };
      }),
      toggleProjectGroupCollapse: (groupName) => set((state) => {
        const newSet = new Set(state.collapsedProjectGroups);
        if (newSet.has(groupName)) {
          newSet.delete(groupName);
        } else {
          newSet.add(groupName);
        }
        return { collapsedProjectGroups: newSet };
      }),
      setProjectSearchKeyword: (keyword) => set({ projectSearchKeyword: keyword }),
      setProjectGroupsLoaded: (loaded) => set({ projectGroupsLoaded: loaded }),
      setCollapsedFolders: (folders) => set({ collapsedFolders: folders }),
      reset: () => set({
        projects: [],
        projectTabs: [],
        activeTab: 'home',
        projectTrees: {},
        expandedKeys: [],
        collapsedFolders: new Set(),
        projectGroups: [],
        projectGroupAssignments: {},
        collapsedProjectGroups: new Set(),
        projectSearchKeyword: '',
        loading: false,
        projectGroupsLoaded: false,
        recentProjects: [],
      }),
    }),
    { name: 'ProjectStore' }
  )
);
