import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProjectTree } from './useProjectStore';

// UIStore - 核心 UI 状态管理
// 注意：模态框状态已移至 useModalStore，拖拽状态已移至 useDragStore
// 为保持向后兼容，此文件仍保留所有状态，但新代码应使用对应的专门 store

interface UIStore {
  // 模态框状态（保留向后兼容）
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
  globalSearchVisible: boolean;

  // 批量执行
  batchExecuteModalVisible: boolean;
  batchExecuteSelectedItems: ProjectTree[];

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
  sidebarWidth: number;

  // 动画
  animationEnabled: boolean;
  forceListAnimation: boolean;

  // MCP 状态
  mcpStatus: 'stopped' | 'running' | 'error';
  setMcpStatus: (status: 'stopped' | 'running' | 'error') => void;

  // Actions - 模态框
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openCreateFolderModal: (parentPath?: string) => void;
  closeCreateFolderModal: () => void;
  openCreateRequestModal: (parentPath?: string) => void;
  closeCreateRequestModal: () => void;
  openRenameModal: (type: 'request' | 'folder', path: string, currentValue: string) => void;
  closeRenameModal: () => void;
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
  setNewGroupName: (name: string) => void;
  openRenameProjectModal: (id: string, currentValue: string) => void;
  closeRenameProjectModal: () => void;
  setRenameProjectValue: (value: string) => void;
  openRenameGroupModal: (currentValue: string) => void;
  closeRenameGroupModal: () => void;
  setRenameGroupValue: (value: string) => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  openBatchExecuteModal: (items: ProjectTree[]) => void;
  closeBatchExecuteModal: () => void;

  // Actions - 拖拽
  setDraggingNode: (node: { type: 'request' | 'folder'; path: string } | null) => void;
  setDropTarget: (path: string | null) => void;
  setInvalidDropHint: (hint: { message: string; x: number; y: number } | null) => void;
  setMovedHighlightPath: (path: string | null) => void;
  clearDragState: () => void;
  setDraggingProjectId: (id: string | null) => void;
  setProjectDropTargetGroup: (group: string | null) => void;
  setDraggingGroupName: (name: string | null) => void;
  setGroupSortDropTarget: (group: string | null) => void;

  // Actions - 侧边栏/动画
  setSidebarMenu: (menu: 'apis' | 'environments' | 'scripts') => void;
  setSidebarWidth: (width: number) => void;
  setAnimationEnabled: (enabled: boolean) => void;
  setForceListAnimation: (force: boolean) => void;
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
      globalSearchVisible: false,

      // 批量执行初始状态
      batchExecuteModalVisible: false,
      batchExecuteSelectedItems: [],

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
      sidebarWidth: parseInt(localStorage.getItem('apiman-sidebar-width') || '280', 10),

      // 动画
      animationEnabled: false,
      forceListAnimation: false,

      // MCP 状态
      mcpStatus: 'stopped',
      setMcpStatus: (status) => set({ mcpStatus: status }),

      // Actions - 模态框
      openCreateProjectModal: () => set({ createProjectModal: true }),
      closeCreateProjectModal: () => set({ createProjectModal: false }),
      openCreateFolderModal: (parentPath = '') => set({ createFolderModal: true, createParentPath: parentPath }),
      closeCreateFolderModal: () => set({ createFolderModal: false, createParentPath: '' }),
      openCreateRequestModal: (parentPath = '') => set({ createRequestModal: true, createParentPath: parentPath }),
      closeCreateRequestModal: () => set({ createRequestModal: false, createParentPath: '' }),
      openRenameModal: (type, path, currentValue) => set({ renameModal: true, renameType: type, renamePath: path, renameValue: currentValue }),
      closeRenameModal: () => set({ renameModal: false, renamePath: '', renameValue: '' }),
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
      setNewGroupName: (name) => set({ newGroupName: name }),
      openRenameProjectModal: (id, currentValue) => set({ renameProjectModal: true, renameProjectId: id, renameProjectValue: currentValue }),
      closeRenameProjectModal: () => set({ renameProjectModal: false, renameProjectId: '', renameProjectValue: '' }),
      setRenameProjectValue: (value) => set({ renameProjectValue: value }),
      openRenameGroupModal: (currentValue) => set({ renameGroupModal: true, renameGroupValue: currentValue }),
      closeRenameGroupModal: () => set({ renameGroupModal: false, renameGroupValue: '' }),
      setRenameGroupValue: (value) => set({ renameGroupValue: value }),
      openGlobalSearch: () => set({ globalSearchVisible: true }),
      closeGlobalSearch: () => set({ globalSearchVisible: false }),
      openBatchExecuteModal: (items) => set({ batchExecuteModalVisible: true, batchExecuteSelectedItems: items }),
      closeBatchExecuteModal: () => set({ batchExecuteModalVisible: false, batchExecuteSelectedItems: [] }),

      // Actions - 拖拽
      setDraggingNode: (node) => set({ draggingNode: node }),
      setDropTarget: (path) => set({ dropTargetFolderPath: path }),
      setInvalidDropHint: (hint) => set({ invalidDropHint: hint }),
      setMovedHighlightPath: (path) => set({ movedHighlightPath: path }),
      clearDragState: () => set({
        draggingNode: null,
        dropTargetFolderPath: null,
        invalidDropHint: null,
      }),
      setDraggingProjectId: (id) => set({ draggingProjectId: id }),
      setProjectDropTargetGroup: (group) => set({ projectDropTargetGroup: group }),
      setDraggingGroupName: (name) => set({ draggingGroupName: name }),
      setGroupSortDropTarget: (group) => set({ groupSortDropTarget: group }),

      // Actions - 侧边栏/动画
      setSidebarMenu: (menu) => set({ sidebarMenu: menu }),
      setSidebarWidth: (width) => {
        localStorage.setItem('apiman-sidebar-width', String(width));
        set({ sidebarWidth: width });
      },
      setAnimationEnabled: (enabled) => set({ animationEnabled: enabled }),
      setForceListAnimation: (force) => set({ forceListAnimation: force }),
    }),
    { name: 'UIStore' }
  )
);
