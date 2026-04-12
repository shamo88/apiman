import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProjectTree } from './useProjectStore';

interface ModalState {
  // 项目/分组模态框
  createProjectModal: boolean;
  createGroupModal: boolean;
  newGroupName: string;
  renameProjectModal: boolean;
  renameProjectId: string;
  renameProjectValue: string;
  renameGroupModal: boolean;
  renameGroupValue: string;

  // 文件夹/请求模态框
  createFolderModal: boolean;
  createRequestModal: boolean;
  createParentPath: string;
  renameModal: boolean;
  renameType: 'request' | 'folder';
  renamePath: string;
  renameValue: string;

  // 用例模态框
  addCaseModalOpen: boolean;
  addCaseTargetPath: string;
  addCaseNameInput: string;
  caseRenameModalOpen: boolean;
  caseRenameCasePath: string;
  caseRenameInput: string;
  renamingCaseId: string | null;

  // 其他模态框
  cookieModalVisible: boolean;
  historyModalVisible: boolean;
  mcpModalVisible: boolean;
  scriptHelpVisible: boolean;
  globalSearchVisible: boolean;
  batchExecuteModalVisible: boolean;
  batchExecuteSelectedItems: ProjectTree[];
}

interface ModalActions {
  // 项目/分组操作
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openCreateGroupModal: () => void;
  closeCreateGroupModal: () => void;
  setNewGroupName: (name: string) => void;
  openRenameProjectModal: (id: string, currentValue: string) => void;
  closeRenameProjectModal: () => void;
  setRenameProjectValue: (value: string) => void;
  openRenameGroupModal: (currentValue: string) => void;
  closeRenameGroupModal: () => void;
  setRenameGroupValue: (value: string) => void;

  // 文件夹/请求操作
  openCreateFolderModal: (parentPath?: string) => void;
  closeCreateFolderModal: () => void;
  openCreateRequestModal: (parentPath?: string) => void;
  closeCreateRequestModal: () => void;
  openRenameModal: (type: 'request' | 'folder', path: string, currentValue: string) => void;
  closeRenameModal: () => void;

  // 用例操作
  openAddCaseModal: (targetPath: string) => void;
  closeAddCaseModal: () => void;
  openCaseRenameModal: (casePath: string) => void;
  closeCaseRenameModal: () => void;

  // 其他模态框操作
  setCookieModalVisible: (visible: boolean) => void;
  setHistoryModalVisible: (visible: boolean) => void;
  setMcpModalVisible: (visible: boolean) => void;
  setScriptHelpVisible: (visible: boolean) => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  openBatchExecuteModal: (items: any[]) => void;
  closeBatchExecuteModal: () => void;
}

type ModalStore = ModalState & ModalActions;

export const useModalStore = create<ModalStore>()(
  devtools(
    (set) => ({
      // 项目/分组初始状态
      createProjectModal: false,
      createGroupModal: false,
      newGroupName: '',
      renameProjectModal: false,
      renameProjectId: '',
      renameProjectValue: '',
      renameGroupModal: false,
      renameGroupValue: '',

      // 文件夹/请求初始状态
      createFolderModal: false,
      createRequestModal: false,
      createParentPath: '',
      renameModal: false,
      renameType: 'request',
      renamePath: '',
      renameValue: '',

      // 用例初始状态
      addCaseModalOpen: false,
      addCaseTargetPath: '',
      addCaseNameInput: '',
      caseRenameModalOpen: false,
      caseRenameCasePath: '',
      caseRenameInput: '',
      renamingCaseId: null,

      // 其他初始状态
      cookieModalVisible: false,
      historyModalVisible: false,
      mcpModalVisible: false,
      scriptHelpVisible: false,
      globalSearchVisible: false,
      batchExecuteModalVisible: false,

      // 项目/分组操作
      openCreateProjectModal: () => set({ createProjectModal: true }),
      closeCreateProjectModal: () => set({ createProjectModal: false }),
      openCreateGroupModal: () => set({ createGroupModal: true }),
      closeCreateGroupModal: () => set({ createGroupModal: false, newGroupName: '' }),
      setNewGroupName: (name) => set({ newGroupName: name }),
      openRenameProjectModal: (id, currentValue) => set({ renameProjectModal: true, renameProjectId: id, renameProjectValue: currentValue }),
      closeRenameProjectModal: () => set({ renameProjectModal: false, renameProjectId: '', renameProjectValue: '' }),
      setRenameProjectValue: (value) => set({ renameProjectValue: value }),
      openRenameGroupModal: (currentValue) => set({ renameGroupModal: true, renameGroupValue: currentValue }),
      closeRenameGroupModal: () => set({ renameGroupModal: false, renameGroupValue: '' }),
      setRenameGroupValue: (value) => set({ renameGroupValue: value }),

      // 文件夹/请求操作
      openCreateFolderModal: (parentPath = '') => set({ createFolderModal: true, createParentPath: parentPath }),
      closeCreateFolderModal: () => set({ createFolderModal: false, createParentPath: '' }),
      openCreateRequestModal: (parentPath = '') => set({ createRequestModal: true, createParentPath: parentPath }),
      closeCreateRequestModal: () => set({ createRequestModal: false, createParentPath: '' }),
      openRenameModal: (type, path, currentValue) => set({ renameModal: true, renameType: type, renamePath: path, renameValue: currentValue }),
      closeRenameModal: () => set({ renameModal: false, renamePath: '', renameValue: '' }),

      // 用例操作
      openAddCaseModal: (targetPath) => set({ addCaseModalOpen: true, addCaseTargetPath: targetPath }),
      closeAddCaseModal: () => set({ addCaseModalOpen: false, addCaseTargetPath: '', addCaseNameInput: '' }),
      openCaseRenameModal: (casePath) => set({ caseRenameModalOpen: true, caseRenameCasePath: casePath, renamingCaseId: casePath }),
      closeCaseRenameModal: () => set({ caseRenameModalOpen: false, caseRenameCasePath: '', caseRenameInput: '', renamingCaseId: null }),

      // 其他模态框操作
      setCookieModalVisible: (visible) => set({ cookieModalVisible: visible }),
      setHistoryModalVisible: (visible) => set({ historyModalVisible: visible }),
      setMcpModalVisible: (visible) => set({ mcpModalVisible: visible }),
      setScriptHelpVisible: (visible) => set({ scriptHelpVisible: visible }),
      openGlobalSearch: () => set({ globalSearchVisible: true }),
      closeGlobalSearch: () => set({ globalSearchVisible: false }),
      openBatchExecuteModal: (items) => set({ batchExecuteModalVisible: true, batchExecuteSelectedItems: items }),
      closeBatchExecuteModal: () => set({ batchExecuteModalVisible: false, batchExecuteSelectedItems: [] }),
    }),
    { name: 'ModalStore' }
  )
);
