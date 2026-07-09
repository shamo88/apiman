import React, { useEffect, useState } from 'react';

import { TitleBar } from './components/TitleBar';
import { HomePage } from './components/HomePage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { ScriptHelpWindow } from './components/ScriptHelp';
import { MCPSettingsModal } from './components/MCPSettings';
import { AppFooter } from './components/AppFooter';
import { KeyboardShortcutsHelp, ShortcutToast } from './components/KeyboardShortcutsHelp';
import { CookieModal, HistoryModal, CreateRequestModal, CreateFolderModal, RenameModal, AddCaseModal, CaseRenameModal } from './components/modals';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { GlobalVariablesModal } from './components/GlobalVariablesModal';

import {
  useProjectStore,
  useWorkspaceStore,
} from './store';
import {
  useProjectHandlers,
  useKeyboardShortcuts,
} from './hooks';
import './App.css';

const App: React.FC = () => {
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);

  const projectStore = useProjectStore();
  const workspaceStore = useWorkspaceStore();

  const { handleOpenProject } = useProjectHandlers();

  const activeTab = projectStore.activeTab;

  const { activeShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault();
        setShortcutsHelpVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    projectStore.setLoading(false);
  }, []);

  // 退出/卸载前的脏数据拦截
  // - beforeunload: 浏览器原生拦截（覆盖刷新、Ctrl+W、点 X 等触发的前端事件）
  // - Wails 桌面端点 X 也会先派发 beforeunload，e.returnValue 非空时浏览器/Wails 会弹原生确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      let hasDirty = false;
      for (const pid of Object.keys(workspaceStore.workspaceStates)) {
        if (workspaceStore.workspaceStates[pid].dirtyTabs.size > 0) {
          hasDirty = true;
          break;
        }
      }
      if (hasDirty) {
        e.preventDefault();
        // Chrome 需要设 returnValue 才能触发原生确认弹窗
        e.returnValue = '有未保存的修改，确定要离开吗？';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workspaceStore]);

  const getShortcutMessage = () => {
    switch (activeShortcut) {
      case 'send-request':
        return '发送请求';
      case 'new-request':
        return '新建请求';
      case 'save':
        return '保存';
      case 'new-folder':
        return '新建文件夹';
      case 'environment':
        return '切换环境';
      case 'search':
        return '全局搜索';
      case 'tab-switch':
        return '切换标签';
      default:
        return '';
    }
  };

  return (
    <div className="app-container">
      <TitleBar onOpenShortcutsHelp={() => setShortcutsHelpVisible(true)} />

      <div className="app-content">
        {activeTab === 'home' ? (
          <HomePage onProjectOpen={handleOpenProject} />
        ) : (
          <ProjectWorkspace projectId={activeTab} />
        )}
      </div>

      <AppFooter onOpenShortcutsHelp={() => setShortcutsHelpVisible(true)} />

      <ShortcutToast shortcutId={activeShortcut} message={getShortcutMessage()} />

      <KeyboardShortcutsHelp
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
      />

      <ScriptHelpWindow />

      <MCPSettingsModal />

      <CookieModal />

      <HistoryModal />

      <CreateRequestModal />

      <CreateFolderModal />

      <RenameModal />

      <AddCaseModal />

      <CaseRenameModal />

      <GlobalSearchModal />

      <GlobalVariablesModal />
    </div>
  );
};

export default App;
