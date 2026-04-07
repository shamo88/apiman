import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIStore {
  // 模态框状态
  createProjectModal: boolean;
  createFolderModal: boolean;
  createRequestModal: boolean;
  createParentPath: string;
  renameModal: boolean;
  renameType: 'request' | 'folder';
  renamePath: string;
  renameValue: string;
  cookieModalVisible: boolean;
  historyModalVisible: boolean;
  mcpModalVisible: boolean;
  scriptHelpVisible: boolean;
  addCaseModalOpen: boolean;
  addCaseTargetPath: string;
  addCaseNameInput: string;
  caseRenameModalOpen: boolean;
  caseRenameCasePath: string;
  caseRenameInput: string;
  renamingCaseId: string | null;
  createGroupModal: boolean;
  newGroupName: string;
  renameProjectModal: boolean;
  renameProjectId: string;
  renameProjectValue: string;
  renameGroupModal: boolean;
  renameGroupValue: string;

  // 拖拽状态
  draggingNode: { type: 'request' | 'folder'; path: string } | null;
  dropTargetFolderPath: string | null;
  invalidDropHint: { message: string; x: number; y: number } | null;
  movedHighlightPath: string | null;
  draggingProjectId: string | null;
  projectDropTargetGroup: string | null;
  draggingGroupName: string | null;
  groupSortDropTarget: string | null;

  // 侧边栏
  sidebarMenu: 'apis' | 'environments' | 'scripts';

  // 主题/动画
  appTheme: 'light' | 'dark';
  animationEnabled: boolean;
  forceListAnimation: boolean;

  // Actions
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openCreateFolderModal: (parentPath?: string) => void;
  closeCreateFolderModal: () => void;
  openCreateRequestModal: (parentPath?: string) => void;
  closeCreateRequestModal: () => void;
  openRenameModal: (type: 'request' | 'folder', path: string, currentValue: string) => void;
  closeRenameModal: () => void;
  setDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
  setDropTarget: (path: string | null) => void;
  setInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
  setMovedHighlightPath: (path: string | null) => void;
  clearDragState: () => void;
  setAppTheme: (theme: 'light' | 'dark') => void;
  setAnimationEnabled: (enabled: boolean) => void;
  setForceListAnimation: (force: boolean) => void;
  setSidebarMenu: (menu: 'apis' | 'environments' | 'scripts') => void;
  setCookieModalVisible: (visible: boolean) => void;
  setHistoryModalVisible: (visible: boolean) => void;
  setMcpModalVisible: (visible: boolean) => void;
  setScriptHelpVisible: (visible: boolean) => void;
  openAddCaseModal: (targetPath: string) => void;
  closeAddCaseModal: () => void;
  openCaseRenameModal: (casePath: string) => void;
  closeCaseRenameModal: () => void;
  openCreateGroupModal: () => void;
  closeCreateGroupModal: () => void;
  openRenameProjectModal: (id: string, currentValue: string) => void;
  closeRenameProjectModal: () => void;
  openRenameGroupModal: (currentValue: string) => void;
  closeRenameGroupModal: () => void;
  setNewGroupName: (name: string) => void;
  setRenameProjectValue: (value: string) => void;
  setRenameGroupValue: (value: string) => void;
  setDraggingProjectId: (id: string | null) => void;
  setProjectDropTargetGroup: (group: string | null) => void;
  setDraggingGroupName: (name: string | null) => void;
  setGroupSortDropTarget: (group: string | null) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // 模态框初始状态
      createProjectModal: false,
      createFolderModal: false,
      createRequestModal: false,
      createParentPath: '',
      renameModal: false,
      renameType: 'request',
      renamePath: '',
      renameValue: '',
      cookieModalVisible: false,
      historyModalVisible: false,
      mcpModalVisible: false,
      scriptHelpVisible: false,
      addCaseModalOpen: false,
      addCaseTargetPath: '',
      addCaseNameInput: '',
      caseRenameModalOpen: false,
      caseRenameCasePath: '',
      caseRenameInput: '',
      renamingCaseId: null,
      createGroupModal: false,
      newGroupName: '',
      renameProjectModal: false,
      renameProjectId: '',
      renameProjectValue: '',
      renameGroupModal: false,
      renameGroupValue: '',

      // 拖拽初始状态
      draggingNode: null,
      dropTargetFolderPath: null,
      invalidDropHint: null,
      movedHighlightPath: null,
      draggingProjectId: null,
      projectDropTargetGroup: null,
      draggingGroupName: null,
      groupSortDropTarget: null,

      // 侧边栏
      sidebarMenu: 'apis',

      // 主题/动画
      appTheme: (localStorage.getItem('apiman-theme') as 'light' | 'dark') || 'light',
      animationEnabled: false,
      forceListAnimation: false,

      // Actions
      openCreateProjectModal: () => set({ createProjectModal: true }),
      closeCreateProjectModal: () => set({ createProjectModal: false }),
      openCreateFolderModal: (parentPath = '') => set({ createFolderModal: true, createParentPath: parentPath }),
      closeCreateFolderModal: () => set({ createFolderModal: false, createParentPath: '' }),
      openCreateRequestModal: (parentPath = '') => set({ createRequestModal: true, createParentPath: parentPath }),
      closeCreateRequestModal: () => set({ createRequestModal: false, createParentPath: '' }),
      openRenameModal: (type, path, currentValue) => set({ renameModal: true, renameType: type, renamePath: path, renameValue: currentValue }),
      closeRenameModal: () => set({ renameModal: false, renamePath: '', renameValue: '' }),
      setDraggingNode: (node) => set({ draggingNode: node }),
      setDropTarget: (path) => set({ dropTargetFolderPath: path }),
      setInvalidDropHint: (hint) => set({ invalidDropHint: hint }),
      setMovedHighlightPath: (path) => set({ movedHighlightPath: path }),
      clearDragState: () => set({
        draggingNode: null,
        dropTargetFolderPath: null,
        invalidDropHint: null,
      }),
      setAppTheme: (theme) => {
        localStorage.setItem('apiman-theme', theme);
        set({ appTheme: theme });
      },
      setAnimationEnabled: (enabled) => set({ animationEnabled: enabled }),
      setForceListAnimation: (force) => set({ forceListAnimation: force }),
      setSidebarMenu: (menu) => set({ sidebarMenu: menu }),
      setCookieModalVisible: (visible) => set({ cookieModalVisible: visible }),
      setHistoryModalVisible: (visible) => set({ historyModalVisible: visible }),
      setMcpModalVisible: (visible) => set({ mcpModalVisible: visible }),
      setScriptHelpVisible: (visible) => set({ scriptHelpVisible: visible }),
      openAddCaseModal: (targetPath) => set({ addCaseModalOpen: true, addCaseTargetPath: targetPath }),
      closeAddCaseModal: () => set({ addCaseModalOpen: false, addCaseTargetPath: '', addCaseNameInput: '' }),
      openCaseRenameModal: (casePath) => set({ caseRenameModalOpen: true, caseRenameCasePath: casePath, renamingCaseId: casePath }),
      closeCaseRenameModal: () => set({ caseRenameModalOpen: false, caseRenameCasePath: '', caseRenameInput: '', renamingCaseId: null }),
      openCreateGroupModal: () => set({ createGroupModal: true }),
      closeCreateGroupModal: () => set({ createGroupModal: false, newGroupName: '' }),
      openRenameProjectModal: (id, currentValue) => set({ renameProjectModal: true, renameProjectId: id, renameProjectValue: currentValue }),
      closeRenameProjectModal: () => set({ renameProjectModal: false, renameProjectId: '', renameProjectValue: '' }),
      openRenameGroupModal: (currentValue) => set({ renameGroupModal: true, renameGroupValue: currentValue }),
      closeRenameGroupModal: () => set({ renameGroupModal: false, renameGroupValue: '' }),
      setNewGroupName: (name) => set({ newGroupName: name }),
      setRenameProjectValue: (value) => set({ renameProjectValue: value }),
      setRenameGroupValue: (value) => set({ renameGroupValue: value }),
      setDraggingProjectId: (id) => set({ draggingProjectId: id }),
      setProjectDropTargetGroup: (group) => set({ projectDropTargetGroup: group }),
      setDraggingGroupName: (name) => set({ draggingGroupName: name }),
      setGroupSortDropTarget: (group) => set({ groupSortDropTarget: group }),
    }),
    { name: 'UIStore' }
  )
);
