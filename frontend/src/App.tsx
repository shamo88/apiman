import React, { useEffect } from 'react';

import { TitleBar } from './components/TitleBar';
import { HomePage } from './components/HomePage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { ScriptHelpWindow } from './components/ScriptHelp';
import { MCPSettingsModal } from './components/MCPSettings';
import { AppFooter } from './components/AppFooter';
import { CookieModal, HistoryModal } from './components/modals';

import {
  useProjectStore,
  useUIStore,
} from './store';
import {
  useProjectHandlers,
} from './hooks';
import './App.css';

const App: React.FC = () => {
  // ============ Stores ============
  const projectStore = useProjectStore();
  const uiStore = useUIStore();

  // ============ Handlers ============
  const { handleOpenProject } = useProjectHandlers();

  // ============ Derived State ============
  const activeTab = projectStore.activeTab;

  // ============ Initialization ============
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

  return (
    <div className={`app-container ${uiStore.appTheme === 'dark' ? 'theme-dark' : ''}`}>
      <TitleBar />

      <div className="app-content">
        {activeTab === 'home' ? (
          <HomePage onProjectOpen={handleOpenProject} />
        ) : (
          <ProjectWorkspace projectId={activeTab} />
        )}
      </div>

      {/* Footer */}
      <AppFooter />

      {/* Modals */}
      <ScriptHelpWindow />

      <MCPSettingsModal />

      <CookieModal />

      <HistoryModal />
    </div>
  );
};

export default App;
