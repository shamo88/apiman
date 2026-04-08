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

import {
  useProjectStore,
  useUIStore,
} from './store';
import {
  useProjectHandlers,
  useKeyboardShortcuts,
} from './hooks';
import './App.css';

const App: React.FC = () => {
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);

  const projectStore = useProjectStore();
  const uiStore = useUIStore();

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
    const init = async () => {
      projectStore.setLoading(true);
      try {
        const { LoadAppConfig } = await import('../wailsjs/go/main/App');
        const config = await LoadAppConfig();
        if (config?.ui?.theme) {
          uiStore.setAppTheme(config.ui.theme as 'light' | 'dark');
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        projectStore.setLoading(false);
      }
    };
    init();
  }, []);

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
    <div className={`app-container ${uiStore.appTheme === 'dark' ? 'theme-dark' : ''}`}>
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
    </div>
  );
};

export default App;
