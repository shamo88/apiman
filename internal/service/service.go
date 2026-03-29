package service

import (
	"apiman/internal/config"
	"apiman/internal/curl"
	"apiman/internal/git"
	"apiman/internal/models"
	"apiman/internal/postman"
	"apiman/internal/project"
	"apiman/internal/script"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Service struct {
	ConfigManager       *config.ConfigManager
	ProjectMgr          *project.ProjectManager
	CurlExecutor        *curl.CurlExecutor
	PostmanImporter     *postman.PostmanImporter
	ScriptableExecutor  *curl.ScriptableExecutor
	GlobalVarStore      *script.GlobalVariableStore
	GitSyncMgr          *git.GitSyncManager
	gitSyncMu           sync.Mutex // 防止并发 Git 操作
}

func NewService() *Service {
	cfgMgr := config.NewConfigManager()
	projectMgr := project.NewProjectManager(cfgMgr)
	curlExec := curl.NewCurlExecutor()
	postmanImp := postman.NewPostmanImporter(cfgMgr)
	scriptExec := curl.NewScriptableExecutor()

	globals, _ := cfgMgr.GetGlobalVariables()
	globalVarStore := script.NewGlobalVariableStore(globals)
	gitSyncMgr := git.NewGitSyncManager(cfgMgr.GetConfigDir())

	return &Service{
		ConfigManager:      cfgMgr,
		ProjectMgr:         projectMgr,
		CurlExecutor:       curlExec,
		PostmanImporter:    postmanImp,
		ScriptableExecutor: scriptExec,
		GlobalVarStore:     globalVarStore,
		GitSyncMgr:         gitSyncMgr,
	}
}

func (s *Service) GetConfigDir() string {
	return s.ConfigManager.GetConfigDir()
}

func (s *Service) GetProjectsDir() string {
	return s.ConfigManager.GetProjectsDir()
}

func (s *Service) LoadEnvironments(projectID string) ([]models.Environment, error) {
	path, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	return s.ConfigManager.LoadProjectEnvironments(path)
}

func (s *Service) CreateEnvironment(projectID string, name string, variables map[string]string) (*models.Environment, error) {
	path, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	env, err := s.ConfigManager.CreateProjectEnvironment(path, name, variables)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return env, err
}

func (s *Service) UpdateEnvironment(projectID string, id string, name string, variables map[string]string) error {
	path, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return err
	}
	err = s.ConfigManager.UpdateProjectEnvironment(path, id, name, variables)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) DeleteEnvironment(projectID string, id string) error {
	path, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return err
	}
	err = s.ConfigManager.DeleteProjectEnvironment(path, id)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) GetGlobalVariables() (map[string]string, error) {
	return s.ConfigManager.GetGlobalVariables()
}

func (s *Service) SaveGlobalVariables(variables map[string]string) error {
	err := s.ConfigManager.SaveGlobalVariables(variables)
	if err == nil && s.shouldAutoSync() {
		go s.SyncAllProjectsToGit()
	}
	return err
}

func (s *Service) ListProjects() ([]models.Project, error) {
	return s.ProjectMgr.ListProjects()
}

func (s *Service) CreateProject(name string) (*models.Project, error) {
	project, err := s.ProjectMgr.CreateProject(name)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(project.ID)
	}
	return project, err
}

func (s *Service) DeleteProject(id string) error {
	err := s.ProjectMgr.DeleteProject(id)
	if err == nil && s.shouldAutoSync() {
		go s.SyncAllProjectsToGit()
	}
	return err
}

func (s *Service) RenameProject(id, newName string) (*models.Project, error) {
	project, err := s.ProjectMgr.RenameProject(id, newName)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(id)
	}
	return project, err
}

func (s *Service) GetProjectTree(projectID string) (*project.ProjectTree, error) {
	return s.ProjectMgr.GetProjectTree(projectID)
}

func (s *Service) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	folder, err := s.ProjectMgr.CreateFolder(projectID, parentPath, name)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return folder, err
}

func (s *Service) DeleteFolder(path string) error {
	projectID := s.extractProjectIDFromPath(path)
	err := s.ProjectMgr.DeleteFolder(path)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) CreateRequest(projectID, folderPath, name string, spec models.HttpRequestSpec) (*models.CurlRequest, error) {
	req, err := s.ProjectMgr.CreateRequest(projectID, folderPath, name, spec)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) UpdateRequest(requestPath string, spec models.HttpRequestSpec, cases []models.HttpRequestCase, activeCaseID string) error {
	projectID := s.extractProjectIDFromPath(requestPath)
	err := s.ProjectMgr.UpdateRequest(requestPath, spec, cases, activeCaseID)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) AddRequestCase(requestPath, caseName string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.AddRequestCase(requestPath, caseName)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) DuplicateRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.DuplicateRequestCase(requestPath, caseID)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) DeleteRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.DeleteRequestCase(requestPath, caseID)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) RenameRequestCase(requestPath, caseID, newName string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.RenameRequestCase(requestPath, caseID, newName)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) UpdateRequestScripts(requestPath string, preScripts, postScripts []string) error {
	projectID := s.extractProjectIDFromPath(requestPath)
	err := s.ProjectMgr.UpdateRequestScripts(requestPath, preScripts, postScripts)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) DeleteRequest(requestPath string) error {
	projectID := s.extractProjectIDFromPath(requestPath)
	err := s.ProjectMgr.DeleteRequest(requestPath)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) GetRequest(requestPath string) (*models.CurlRequest, error) {
	return s.ProjectMgr.GetRequest(requestPath)
}

func (s *Service) CopyRequest(requestPath string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.CopyRequest(requestPath)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) RenameRequest(requestPath, newName string) (*models.CurlRequest, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	req, err := s.ProjectMgr.RenameRequest(requestPath, newName)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return req, err
}

func (s *Service) RenameFolder(folderPath, newName string) (*models.Folder, error) {
	projectID := s.extractProjectIDFromPath(folderPath)
	folder, err := s.ProjectMgr.RenameFolder(folderPath, newName)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return folder, err
}

func (s *Service) MoveRequest(requestPath, targetFolderPath string, beforeID string) (string, error) {
	projectID := s.extractProjectIDFromPath(requestPath)
	id, err := s.ProjectMgr.MoveRequest(requestPath, targetFolderPath, beforeID)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return id, err
}

func (s *Service) MoveFolder(folderPath, targetParentPath string, beforeID string) (string, error) {
	projectID := s.extractProjectIDFromPath(folderPath)
	id, err := s.ProjectMgr.MoveFolder(folderPath, targetParentPath, beforeID)
	if err == nil && projectID != "" && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return id, err
}

func (s *Service) ExecuteCurl(command string) (*models.CurlResponse, error) {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return s.CurlExecutor.Execute(command)
	}

	proxyOpts := &curl.ProxyOptions{
		Enabled:    appCfg.Proxy.Enabled,
		HTTPHost:   appCfg.Proxy.HTTPHost,
		HTTPPort:   appCfg.Proxy.HTTPPort,
		HTTPSHost:  appCfg.Proxy.HTTPSHost,
		HTTPSPort:  appCfg.Proxy.HTTPSPort,
		SOCKS5Host: appCfg.Proxy.SOCKS5Host,
		SOCKS5Port: appCfg.Proxy.SOCKS5Port,
	}

	return s.CurlExecutor.ExecuteWithProxy(command, proxyOpts)
}

func (s *Service) ExecuteHTTPRequest(spec models.HttpRequestSpec) (*models.CurlResponse, error) {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return s.CurlExecutor.ExecuteHTTPRequest(&spec)
	}
	proxyOpts := &curl.ProxyOptions{
		Enabled:    appCfg.Proxy.Enabled,
		HTTPHost:   appCfg.Proxy.HTTPHost,
		HTTPPort:   appCfg.Proxy.HTTPPort,
		HTTPSHost:  appCfg.Proxy.HTTPSHost,
		HTTPSPort:  appCfg.Proxy.HTTPSPort,
		SOCKS5Host: appCfg.Proxy.SOCKS5Host,
		SOCKS5Port: appCfg.Proxy.SOCKS5Port,
	}
	return s.CurlExecutor.ExecuteHTTPRequestWithProxy(&spec, proxyOpts)
}

func (s *Service) ExtractVariables(text string) []string {
	return s.CurlExecutor.ExtractVariables(text)
}

func (s *Service) ReplaceVariables(text string, variables map[string]string) string {
	return s.CurlExecutor.ReplaceVariables(text, variables)
}

func (s *Service) LoadAppConfig() (*config.AppConfig, error) {
	return s.ConfigManager.LoadAppConfig()
}

func (s *Service) SaveAppConfig(cfg *config.AppConfig) error {
	return s.ConfigManager.SaveAppConfig(cfg)
}

func (s *Service) ImportPostmanCollection(jsonData string) (*models.Project, error) {
	// Parse the Postman collection
	projectName, items, err := s.PostmanImporter.ParseCollection(jsonData)
	if err != nil {
		return nil, err
	}

	// Ensure unique project name
	projectName, err = s.PostmanImporter.EnsureUniqueProjectName(projectName)
	if err != nil {
		return nil, err
	}

	// Create project using ProjectManager (which uses the active projectsDir)
	project, err := s.ProjectMgr.CreateProject(projectName)
	if err != nil {
		return nil, err
	}

	// Get the project directory path
	projectDir, err := s.ProjectMgr.ProjectPathByID(project.ID)
	if err != nil {
		return nil, err
	}

	// Load the collection and update it with imported items
	coll, err := postman.LoadCollection(projectDir)
	if err != nil {
		// If no collection exists, create a new one
		coll = postman.NewCollection(projectName)
	}
	coll.Item = items

	// Save the collection to the project directory
	if err := postman.SaveCollection(projectDir, coll); err != nil {
		return nil, err
	}

	if s.shouldAutoSync() {
		go s.SyncProjectToGit(project.ID)
	}
	return project, nil
}

func (s *Service) LoadProjectGroupsState() (*project.ProjectGroupsState, error) {
	return s.ProjectMgr.LoadProjectGroupsState()
}

func (s *Service) SaveProjectGroupsState(state *project.ProjectGroupsState) error {
	err := s.ProjectMgr.SaveProjectGroupsState(state)
	if err == nil && s.shouldAutoSync() {
		go s.SyncAllProjectsToGit()
	}
	return err
}

func (s *Service) ListProjectScripts(projectID string) ([]models.ProjectScript, error) {
	return s.ProjectMgr.ListProjectScripts(projectID)
}

func (s *Service) CreateProjectScript(projectID, name, content string) (*models.ProjectScript, error) {
	script, err := s.ProjectMgr.CreateProjectScript(projectID, name, content)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return script, err
}

func (s *Service) UpdateProjectScript(projectID, scriptID, name, content string) (*models.ProjectScript, error) {
	script, err := s.ProjectMgr.UpdateProjectScript(projectID, scriptID, name, content)
	if err == nil && s.shouldAutoSync() {
		// Wait 1 second before syncing to ensure file write is completed
		go func() {
			time.Sleep(1 * time.Second)
			s.SyncProjectToGit(projectID)
		}()
	}
	return script, err
}

func (s *Service) DeleteProjectScript(projectID, scriptID string) error {
	err := s.ProjectMgr.DeleteProjectScript(projectID, scriptID)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) ExecuteHTTPRequestWithScripts(
	projectID string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScriptIDs []string,
	postScriptIDs []string,
) (*models.CurlResponse, error) {
	var preScriptContents, postScriptContents []string
	var preScriptNames, postScriptNames []string

	if len(preScriptIDs) > 0 {
		scripts, err := s.ProjectMgr.ListProjectScripts(projectID)
		if err == nil {
			scriptMap := make(map[string]string)
			for _, scr := range scripts {
				scriptMap[scr.ID] = scr.Content
			}
			for _, id := range preScriptIDs {
				if content, ok := scriptMap[id]; ok {
					preScriptContents = append(preScriptContents, content)
					// Find script name
					for _, scr := range scripts {
						if scr.ID == id {
							preScriptNames = append(preScriptNames, scr.Name)
							break
						}
					}
				}
			}
		}
	}

	if len(postScriptIDs) > 0 {
		scripts, err := s.ProjectMgr.ListProjectScripts(projectID)
		if err == nil {
			scriptMap := make(map[string]string)
			for _, scr := range scripts {
				scriptMap[scr.ID] = scr.Content
			}
			for _, id := range postScriptIDs {
				if content, ok := scriptMap[id]; ok {
					postScriptContents = append(postScriptContents, content)
					// Find script name
					for _, scr := range scripts {
						if scr.ID == id {
							postScriptNames = append(postScriptNames, scr.Name)
							break
						}
					}
				}
			}
		}
	}

	projectPath, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}

	projectVarsPath := filepath.Join(projectPath, "variables.json")
	projectVars := script.NewProjectVariables()
	if err := projectVars.LoadFromFile(projectVarsPath); err != nil {
		return nil, err
	}
	globals := projectVars.GetAll()

	var environment map[string]string
	if environmentID != "" {
		envs, err := s.LoadEnvironments(projectID)
		if err == nil {
			for _, env := range envs {
				if env.ID == environmentID {
					environment = env.Variables
					break
				}
			}
		}
	}
	if environment == nil {
		environment = make(map[string]string)
	}

	appCfg, err := s.ConfigManager.LoadAppConfig()
	proxyOpts := &curl.ProxyOptions{}
	if err == nil && appCfg != nil {
		proxyOpts.Enabled = appCfg.Proxy.Enabled
		proxyOpts.HTTPHost = appCfg.Proxy.HTTPHost
		proxyOpts.HTTPPort = appCfg.Proxy.HTTPPort
		proxyOpts.HTTPSHost = appCfg.Proxy.HTTPSHost
		proxyOpts.HTTPSPort = appCfg.Proxy.HTTPSPort
		proxyOpts.SOCKS5Host = appCfg.Proxy.SOCKS5Host
		proxyOpts.SOCKS5Port = appCfg.Proxy.SOCKS5Port
	}

	globalSetter := func(key, value string) {
		projectVars.Set(key, value)
		_ = projectVars.SaveToFile(projectVarsPath)
	}

	resp, err := s.ScriptableExecutor.ExecuteWithScripts(
		&spec,
		proxyOpts,
		preScriptContents,
		postScriptContents,
		preScriptNames,
		postScriptNames,
		globals,
		environment,
		globalSetter,
	)

	if err != nil {
		return &models.CurlResponse{
			Error: err.Error(),
		}, err
	}

	return resp, nil
}

func (s *Service) ExecuteHTTPRequestWithScriptsInline(
	projectID string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScript string,
	postScript string,
) (*models.CurlResponse, error) {
	projectPath, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}

	projectVarsPath := filepath.Join(projectPath, "variables.json")
	projectVars := script.NewProjectVariables()
	if err := projectVars.LoadFromFile(projectVarsPath); err != nil {
		return nil, err
	}
	globals := projectVars.GetAll()

	var environment map[string]string
	if environmentID != "" {
		envs, err := s.LoadEnvironments(projectID)
		if err == nil {
			for _, env := range envs {
				if env.ID == environmentID {
					environment = env.Variables
					break
				}
			}
		}
	}
	if environment == nil {
		environment = make(map[string]string)
	}

	appCfg, err := s.ConfigManager.LoadAppConfig()
	proxyOpts := &curl.ProxyOptions{}
	if err == nil && appCfg != nil {
		proxyOpts.Enabled = appCfg.Proxy.Enabled
		proxyOpts.HTTPHost = appCfg.Proxy.HTTPHost
		proxyOpts.HTTPPort = appCfg.Proxy.HTTPPort
		proxyOpts.HTTPSHost = appCfg.Proxy.HTTPSHost
		proxyOpts.HTTPSPort = appCfg.Proxy.HTTPSPort
		proxyOpts.SOCKS5Host = appCfg.Proxy.SOCKS5Host
		proxyOpts.SOCKS5Port = appCfg.Proxy.SOCKS5Port
	}

	globalSetter := func(key, value string) {
		projectVars.Set(key, value)
		_ = projectVars.SaveToFile(projectVarsPath)
	}

	resp, err := s.ScriptableExecutor.ExecuteWithScripts(
		&spec,
		proxyOpts,
		[]string{preScript},
		[]string{postScript},
		[]string{"Inline Pre-Script"},
		[]string{"Inline Post-Script"},
		globals,
		environment,
		globalSetter,
	)

	if err != nil {
		return &models.CurlResponse{
			Error: err.Error(),
		}, err
	}

	return resp, nil
}

// SyncProjectToGit syncs a single project to Git repository
func (s *Service) SyncProjectToGit(projectID string) error {
	// 获取锁，防止并发 Git 操作
	s.gitSyncMu.Lock()
	defer s.gitSyncMu.Unlock()

	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	projectPath, err := s.ProjectMgr.ProjectPathByID(projectID)
	if err != nil {
		return err
	}

	return s.GitSyncMgr.SyncProject(projectPath, projectID, "", appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

func (s *Service) shouldAutoSync() bool {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return false
	}
	return appCfg.GitSync.Enabled && appCfg.GitSync.RemoteURL != ""
}

// extractProjectIDFromPath extracts project ID from paths like projectsDir/projectID/... or request|projectID|requestID
func (s *Service) extractProjectIDFromPath(requestPath string) string {
	// Handle request|projectID|requestID format
	if strings.HasPrefix(requestPath, "request|") {
		parts := strings.Split(requestPath, "|")
		if len(parts) >= 2 {
			return parts[1]
		}
		return ""
	}

	// Handle filesystem path
	projectsDir := s.ConfigManager.GetProjectsDir()
	relPath, err := filepath.Rel(projectsDir, requestPath)
	if err != nil {
		return ""
	}
	parts := strings.SplitN(relPath, string(filepath.Separator), 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// SyncAllProjectsToGit syncs all projects to Git repository
func (s *Service) SyncAllProjectsToGit() error {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	return s.GitSyncMgr.SyncAllProjects(s.ProjectMgr.GetProjectsDir(), appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// InitGitRepo initializes the local Git repository
func (s *Service) InitGitRepo() error {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}

	return s.GitSyncMgr.CloneOrPull(appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// InitProjectsDir 根据配置决定工作目录，App 启动时调用
func (s *Service) InitProjectsDir() error {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		// 默认使用本地目录
		s.ProjectMgr.SetProjectsDir(s.ConfigManager.GetProjectsDir())
		return nil
	}

	if appCfg.GitSync.Enabled && appCfg.GitSync.RemoteURL != "" {
		// Git Sync 模式：确保 git-sync 目录存在（clone 或 pull）
		if err := s.GitSyncMgr.CloneOrPull(appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch,
			appCfg.GitSync.Password); err != nil {
			// 如果拉取失败，切换到本地模式
			s.ProjectMgr.SetProjectsDir(s.ConfigManager.GetProjectsDir())
			return err
		}
		// 切换工作目录到 git-sync/projects
		workDir := s.GitSyncMgr.GetProjectsPath()
		s.ProjectMgr.SetProjectsDir(workDir)
		s.ConfigManager.SaveWorkDir(workDir)
	} else {
		// 本地模式
		workDir := s.ConfigManager.GetProjectsDir()
		s.ProjectMgr.SetProjectsDir(workDir)
	}
	return nil
}

// EnableGitSync 启用 Git Sync 功能
func (s *Service) EnableGitSync(remoteURL, branch, password string) error {
	// 1. Clone 远程仓库到 git-sync
	if err := s.GitSyncMgr.CloneOrPull(remoteURL, branch, password); err != nil {
		return err
	}

	// 2. 保存配置
	appCfg, _ := s.ConfigManager.LoadAppConfig()
	if appCfg == nil {
		appCfg = &config.AppConfig{}
	}
	appCfg.GitSync.Enabled = true
	appCfg.GitSync.RemoteURL = remoteURL
	appCfg.GitSync.Branch = branch
	appCfg.GitSync.Password = password
	if err := s.ConfigManager.SaveAppConfig(appCfg); err != nil {
		return err
	}

	// 3. 切换工作目录
	workDir := s.GitSyncMgr.GetProjectsPath()
	s.ProjectMgr.SetProjectsDir(workDir)
	s.ConfigManager.SaveWorkDir(workDir)

	return nil
}

// DisableGitSync 禁用 Git Sync 功能
func (s *Service) DisableGitSync() error {
	// 1. 删除 git-sync 目录
	if err := s.GitSyncMgr.RemoveRepo(); err != nil {
		// 日志记录但继续执行
	}

	// 2. 更新配置
	appCfg, _ := s.ConfigManager.LoadAppConfig()
	if appCfg != nil {
		appCfg.GitSync.Enabled = false
		appCfg.GitSync.RemoteURL = ""
		appCfg.GitSync.WorkDir = ""
		appCfg.GitSync.Password = ""
		s.ConfigManager.SaveAppConfig(appCfg)
	}

	// 3. 切换回本地目录
	s.ProjectMgr.SetProjectsDir(s.ConfigManager.GetProjectsDir())

	return nil
}
