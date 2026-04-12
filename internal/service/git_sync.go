package service

import (
	"apiman/internal/config"
	"apiman/internal/project"
)

// GitSyncService 负责 Git 同步相关的业务逻辑
// 从 Service 中分离出来，解决 God Service 问题
type GitSyncService struct {
	cfgMgr     *config.ConfigManager
	projectMgr *project.ProjectManager
	gitSyncMgr interface {
		SyncProject(projectPath, projectID, message, branch, password string) error
		SyncAllProjects(projectsDir, remoteURL, branch, password string) error
		CloneOrPull(remoteURL, branch, password string) error
		RemoveRepo() error
		GetProjectsPath() string
		ListBranches() ([]string, error)
		GetCurrentBranch() (string, error)
		CreateBranch(name string) error
		SwitchBranch(name string) error
		DeleteBranch(name string) error
	}
}

// NewGitSyncService 创建 GitSyncService
func NewGitSyncService(cfgMgr *config.ConfigManager, projectMgr *project.ProjectManager, gitSyncMgr interface {
	SyncProject(projectPath, projectID, message, branch, password string) error
	SyncAllProjects(projectsDir, remoteURL, branch, password string) error
	CloneOrPull(remoteURL, branch, password string) error
	RemoveRepo() error
	GetProjectsPath() string
	ListBranches() ([]string, error)
	GetCurrentBranch() (string, error)
	CreateBranch(name string) error
	SwitchBranch(name string) error
	DeleteBranch(name string) error
}) *GitSyncService {
	return &GitSyncService{
		cfgMgr:     cfgMgr,
		projectMgr: projectMgr,
		gitSyncMgr: gitSyncMgr,
	}
}

// ShouldAutoSync 检查是否应该自动同步
func (s *GitSyncService) ShouldAutoSync() bool {
	appCfg, err := s.cfgMgr.LoadAppConfig()
	if err != nil || appCfg == nil {
		return false
	}
	return appCfg.GitSync.Enabled && appCfg.GitSync.RemoteURL != ""
}

// SyncProject 同步单个项目到 Git
func (s *GitSyncService) SyncProject(projectID string) error {
	appCfg, err := s.cfgMgr.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	projectPath, err := s.projectMgr.ProjectPathByID(projectID)
	if err != nil {
		return err
	}

	return s.gitSyncMgr.SyncProject(projectPath, projectID, "", appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// SyncAllProjects 同步所有项目到 Git
func (s *GitSyncService) SyncAllProjects() error {
	appCfg, err := s.cfgMgr.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	return s.gitSyncMgr.SyncAllProjects(s.projectMgr.GetProjectsDir(), appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// InitGitRepo 初始化 Git 仓库
func (s *GitSyncService) InitGitRepo() error {
	appCfg, err := s.cfgMgr.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	return s.gitSyncMgr.CloneOrPull(appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// EnableGitSync 启用 Git Sync
func (s *GitSyncService) EnableGitSync(remoteURL, branch, password string) error {
	if err := s.gitSyncMgr.CloneOrPull(remoteURL, branch, password); err != nil {
		return err
	}

	appCfg, _ := s.cfgMgr.LoadAppConfig()
	if appCfg == nil {
		appCfg = &config.AppConfig{}
	}
	appCfg.GitSync.Enabled = true
	appCfg.GitSync.RemoteURL = remoteURL
	appCfg.GitSync.Branch = branch
	appCfg.GitSync.Password = password
	if err := s.cfgMgr.SaveAppConfig(appCfg); err != nil {
		return err
	}

	workDir := s.gitSyncMgr.GetProjectsPath()
	s.projectMgr.SetProjectsDir(workDir)
	s.cfgMgr.SaveWorkDir(workDir)

	return nil
}

// DisableGitSync 禁用 Git Sync
func (s *GitSyncService) DisableGitSync() error {
	if err := s.gitSyncMgr.RemoveRepo(); err != nil {
		// 日志记录但继续执行
	}

	appCfg, _ := s.cfgMgr.LoadAppConfig()
	if appCfg != nil {
		appCfg.GitSync.Enabled = false
		appCfg.GitSync.RemoteURL = ""
		appCfg.GitSync.WorkDir = ""
		appCfg.GitSync.Password = ""
		s.cfgMgr.SaveAppConfig(appCfg)
	}

	s.projectMgr.SetProjectsDir(s.cfgMgr.GetProjectsDir())

	return nil
}

// PullGitRepo 拉取远程仓库
func (s *GitSyncService) PullGitRepo() error {
	appCfg, err := s.cfgMgr.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}
	return s.gitSyncMgr.CloneOrPull(appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// ListBranches 返回所有分支
func (s *GitSyncService) ListBranches() ([]string, error) {
	return s.gitSyncMgr.ListBranches()
}

// GetCurrentBranch 返回当前分支
func (s *GitSyncService) GetCurrentBranch() (string, error) {
	return s.gitSyncMgr.GetCurrentBranch()
}

// CreateBranch 创建新分支
func (s *GitSyncService) CreateBranch(name string) error {
	return s.gitSyncMgr.CreateBranch(name)
}

// SwitchBranch 切换分支
func (s *GitSyncService) SwitchBranch(name string) error {
	return s.gitSyncMgr.SwitchBranch(name)
}

// DeleteBranch 删除分支
func (s *GitSyncService) DeleteBranch(name string) error {
	return s.gitSyncMgr.DeleteBranch(name)
}

// GetProjectsPath 获取 Git 同步模式下的项目目录
func (s *GitSyncService) GetProjectsPath() string {
	return s.gitSyncMgr.GetProjectsPath()
}
