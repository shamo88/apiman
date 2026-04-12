package service

import (
	"apiman/internal/config"
	"apiman/internal/curl"
	"apiman/internal/git"
	"apiman/internal/history"
	"apiman/internal/models"
	"apiman/internal/openapi"
	"apiman/internal/postman"
	"apiman/internal/project"
	"apiman/internal/script"
	"context"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Service struct {
	ConfigManager      *config.ConfigManager
	ProjectMgr         *project.ProjectManager
	CurlExecutor       *curl.CurlExecutor
	PostmanImporter    *postman.PostmanImporter
	OpenAPIImporter    *openapi.OpenAPIImporter
	ScriptableExecutor *curl.ScriptableExecutor
	GlobalVarStore     *script.GlobalVariableStore
	GitSyncMgr         *git.GitSyncManager
	GitSyncService     *GitSyncService // 分离的 Git Sync 服务
	HistoryMgr         *history.HistoryManager
	gitSyncMu          sync.Mutex // 防止并发 Git 操作
}

func NewService() (*Service, error) {
	cfgMgr, err := config.NewConfigManager()
	if err != nil {
		return nil, err
	}
	projectMgr, err := project.NewProjectManager(cfgMgr)
	if err != nil {
		return nil, err
	}
	curlExec := curl.NewCurlExecutor()
	postmanImp := postman.NewPostmanImporter(cfgMgr)
	openapiImp := openapi.NewOpenAPIImporter(cfgMgr)
	scriptExec := curl.NewScriptableExecutor()

	globals, _ := cfgMgr.GetGlobalVariables()
	globalVarStore := script.NewGlobalVariableStore(globals)
	gitSyncMgr := git.NewGitSyncManager(cfgMgr.GetConfigDir())
	historyMgr, _ := history.NewHistoryManager(cfgMgr.GetConfigDir())

	// 初始化 GitSyncService
	gitSyncService := NewGitSyncService(cfgMgr, projectMgr, gitSyncMgr)

	return &Service{
		ConfigManager:      cfgMgr,
		ProjectMgr:         projectMgr,
		CurlExecutor:       curlExec,
		PostmanImporter:    postmanImp,
		OpenAPIImporter:    openapiImp,
		ScriptableExecutor: scriptExec,
		GlobalVarStore:     globalVarStore,
		GitSyncMgr:         gitSyncMgr,
		GitSyncService:     gitSyncService,
		HistoryMgr:         historyMgr,
	}, nil
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

func (s *Service) GetProjectName(projectID string) (string, error) {
	projects, err := s.ProjectMgr.ListProjects()
	if err != nil {
		return "", err
	}
	for _, p := range projects {
		if p.ID == projectID {
			return p.Name, nil
		}
	}
	return "", nil
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

func (s *Service) UpdateProjectScripts(projectID string, preScripts, postScripts []string) error {
	err := s.ProjectMgr.UpdateProjectScripts(projectID, preScripts, postScripts)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return err
}

func (s *Service) GetProjectScripts(projectID string) (preScripts, postScripts []string, err error) {
	return s.ProjectMgr.GetProjectScripts(projectID)
}

func (s *Service) GetProjectScriptsResult(projectID string) (*models.ProjectScriptsResult, error) {
	preScripts, postScripts, err := s.ProjectMgr.GetProjectScripts(projectID)
	if err != nil {
		return nil, err
	}
	if preScripts == nil {
		preScripts = []string{}
	}
	if postScripts == nil {
		postScripts = []string{}
	}
	return &models.ProjectScriptsResult{
		PreScripts:  preScripts,
		PostScripts: postScripts,
	}, nil
}

func (s *Service) GetFolderScripts(folderPath string) (preScripts, postScripts []string, err error) {
	return s.ProjectMgr.GetFolderScripts(folderPath)
}

func (s *Service) GetFolderScriptsResult(folderPath string) (*models.FolderScriptsResult, error) {
	preScripts, postScripts, err := s.ProjectMgr.GetFolderScripts(folderPath)
	if err != nil {
		return nil, err
	}
	if preScripts == nil {
		preScripts = []string{}
	}
	if postScripts == nil {
		postScripts = []string{}
	}
	return &models.FolderScriptsResult{
		PreScripts:  preScripts,
		PostScripts: postScripts,
	}, nil
}

func (s *Service) UpdateFolderScripts(folderPath string, preScripts, postScripts []string) error {
	projectID := s.extractProjectIDFromPath(folderPath)
	err := s.ProjectMgr.UpdateFolderScripts(folderPath, preScripts, postScripts)
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

	return s.CurlExecutor.ExecuteWithProxy(command, buildProxyOptions(appCfg), getTimeout(appCfg))
}

// executeHTTPRequestNoContext 执行无项目上下文的请求（注入Cookie、变量替换、无环境/脚本）
func (s *Service) executeHTTPRequestNoContext(spec models.HttpRequestSpec) (*models.CurlResponse, error) {
	spec = s.injectGlobalCookies(spec)

	appCfg, _ := s.ConfigManager.LoadAppConfig()

	// 无项目上下文，globals和environment都为空，但仍做变量替换（空替换）
	return s.ScriptableExecutor.ExecuteWithScriptsContext(
		context.Background(),
		&spec,
		buildProxyOptions(appCfg),
		nil, // 无预置脚本
		nil, // 无后置脚本
		nil, // 无脚本名
		nil, // 无脚本名
		nil, // 无全局变量
		nil, // 无环境变量
		nil, // 无全局setter
		getTimeout(appCfg),
	)
}

func (s *Service) ExecuteHTTPRequest(spec models.HttpRequestSpec) (*models.CurlResponse, error) {
	return s.executeHTTPRequestNoContext(spec)
}

// injectGlobalCookies loads global cookies and injects matching ones into the request spec.
func (s *Service) injectGlobalCookies(spec models.HttpRequestSpec) models.HttpRequestSpec {
	// 构建完整 URL（含 params）
	fullURL := buildFullURL(strings.TrimSpace(spec.HttpURL), spec.Params)

	// 解析 URL 获取 domain 和 path
	u, err := url.Parse(fullURL)
	if err != nil {
		return spec
	}

	// 加载全局 cookie
	cookies, err := s.ConfigManager.LoadGlobalCookies()
	if err != nil || len(cookies) == 0 {
		return spec
	}

	// 过滤匹配的 cookie
	matched := curl.FilterCookies(u.Host, u.Path, cookies)
	if len(matched) == 0 {
		return spec
	}

	// 构建 Cookie header
	var cookieParts []string
	for _, c := range matched {
		cookieParts = append(cookieParts, c.Name+"="+c.Value)
	}
	cookieHeader := strings.Join(cookieParts, "; ")

	// 添加到 Headers
	spec.Headers = append(spec.Headers, models.RequestKeyVal{
		Key:     "Cookie",
		Value:   cookieHeader,
		Enabled: true,
	})

	return spec
}

// buildFullURL builds the full URL with query parameters.
func buildFullURL(base string, params []models.RequestKeyVal) string {
	out := base
	for _, p := range params {
		if !p.Enabled || strings.TrimSpace(p.Key) == "" {
			continue
		}
		sep := "?"
		if strings.Contains(out, "?") {
			sep = "&"
		}
		out += sep + url.QueryEscape(p.Key) + "=" + url.QueryEscape(p.Value)
	}
	return out
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

func (s *Service) ImportOpenAPICollection(jsonData string) (*models.Project, error) {
	parseResult, err := s.OpenAPIImporter.ParseOpenAPICollection(jsonData)
	if err != nil {
		return nil, err
	}

	projectName := s.OpenAPIImporter.EnsureUniqueProjectName(parseResult.ProjectName)

	project, err := s.ProjectMgr.CreateProject(projectName)
	if err != nil {
		return nil, err
	}

	projectDir, err := s.ProjectMgr.ProjectPathByID(project.ID)
	if err != nil {
		return nil, err
	}

	coll := postman.NewCollection(projectName)
	coll.Item = parseResult.Items

	if err := postman.SaveCollection(projectDir, coll); err != nil {
		return nil, err
	}

	if s.shouldAutoSync() {
		go s.SyncProjectToGit(project.ID)
	}
	return project, nil
}

func (s *Service) ParseOpenAPICollection(jsonData string) (*openapi.ParseResult, error) {
	return s.OpenAPIImporter.ParseOpenAPICollection(jsonData)
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

func (s *Service) CreateProjectScript(projectID, name, description, content string) (*models.ProjectScript, error) {
	script, err := s.ProjectMgr.CreateProjectScript(projectID, name, description, content)
	if err == nil && s.shouldAutoSync() {
		go s.SyncProjectToGit(projectID)
	}
	return script, err
}

func (s *Service) UpdateProjectScript(projectID, scriptID, name, description, content string) (*models.ProjectScript, error) {
	script, err := s.ProjectMgr.UpdateProjectScript(projectID, scriptID, name, description, content)
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
	projectID, projectName, requestName, requestPath string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScriptIDs []string,
	postScriptIDs []string,
) (*models.CurlResponse, error) {
	return s.ExecuteHTTPRequestWithScriptsWithSource(
		projectID, projectName, requestName, requestPath,
		environmentID, spec, preScriptIDs, postScriptIDs,
		models.HistorySourceGUI, "",
	)
}

func (s *Service) ExecuteHTTPRequestWithScriptsWithSource(
	projectID, projectName, requestName, requestPath string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScriptIDs []string,
	postScriptIDs []string,
	source models.HistorySourceType,
	sourceTool string,
) (*models.CurlResponse, error) {
	var preScriptContents, postScriptContents []string
	var preScriptNames, postScriptNames []string

	// Get scripts with inheritance priority: request > folders > project
	// Pre-scripts and post-scripts are INDEPENDENT:
	// - If preScriptIDs is empty, inherit from parent levels
	// - If postScriptIDs is empty, inherit from parent levels
	merged, err := s.ProjectMgr.GetRequestScriptsWithPriority(requestPath)
	if err != nil {
		return nil, err
	}

	// Determine which pre-scripts to use
	scriptsToUse := preScriptIDs
	if len(preScriptIDs) == 0 && merged != nil {
		scriptsToUse = merged.PreScripts
	}

	// Determine which post-scripts to use
	postScriptsToUse := postScriptIDs
	if len(postScriptIDs) == 0 && merged != nil {
		postScriptsToUse = merged.PostScripts
	}

	if len(scriptsToUse) > 0 {
		scripts, err := s.ProjectMgr.ListProjectScripts(projectID)
		if err == nil {
			scriptMap := make(map[string]string)
			for _, scr := range scripts {
				scriptMap[scr.ID] = scr.Content
			}
			for _, id := range scriptsToUse {
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

	if len(postScriptsToUse) > 0 {
		scripts, err := s.ProjectMgr.ListProjectScripts(projectID)
		if err == nil {
			scriptMap := make(map[string]string)
			for _, scr := range scripts {
				scriptMap[scr.ID] = scr.Content
			}
			for _, id := range postScriptsToUse {
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

	appCfg, _ := s.ConfigManager.LoadAppConfig()
	proxyOpts := buildProxyOptions(appCfg)
	timeout := getTimeout(appCfg)

	globalSetter := func(key, value string) {
		projectVars.Set(key, value)
		_ = projectVars.SaveToFile(projectVarsPath)
	}

	resp, err := s.ScriptableExecutor.ExecuteWithScriptsContext(
		context.Background(),
		&spec,
		proxyOpts,
		preScriptContents,
		postScriptContents,
		preScriptNames,
		postScriptNames,
		globals,
		environment,
		globalSetter,
		timeout,
	)

	if err != nil {
		return &models.CurlResponse{
			Error: err.Error(),
		}, err
	}

	// 记录历史
	if recordErr := s.RecordHistoryWithSource(projectID, projectName, requestName, requestPath, spec, resp, source, sourceTool); recordErr != nil {
		// 历史记录失败不影响主流程
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
	return project.ExtractProjectIDFromPath(s.ConfigManager.GetProjectsDir(), requestPath)
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

// PullGitRepo 拉取 Git 仓库最新代码，保存前调用
func (s *Service) PullGitRepo() error {
	appCfg, err := s.ConfigManager.LoadAppConfig()
	if err != nil || appCfg == nil {
		return nil
	}
	if !appCfg.GitSync.Enabled || appCfg.GitSync.RemoteURL == "" {
		return nil
	}
	return s.GitSyncMgr.CloneOrPull(appCfg.GitSync.RemoteURL, appCfg.GitSync.Branch, appCfg.GitSync.Password)
}

// ListGitBranches returns all branches in the repository
func (s *Service) ListGitBranches() ([]string, error) {
	return s.GitSyncMgr.ListBranches()
}

// GetCurrentGitBranch returns the current checked-out branch
func (s *Service) GetCurrentGitBranch() (string, error) {
	return s.GitSyncMgr.GetCurrentBranch()
}

// CreateGitBranch creates a new local branch
func (s *Service) CreateGitBranch(name string) error {
	return s.GitSyncMgr.CreateBranch(name)
}

// SwitchGitBranch switches to the specified branch
func (s *Service) SwitchGitBranch(name string) error {
	return s.GitSyncMgr.SwitchBranch(name)
}

// DeleteGitBranch deletes a local branch
func (s *Service) DeleteGitBranch(name string) error {
	return s.GitSyncMgr.DeleteBranch(name)
}

// LoadGlobalCookies loads all global cookies.
func (s *Service) LoadGlobalCookies() ([]models.GlobalCookie, error) {
	return s.ConfigManager.LoadGlobalCookies()
}

// SaveGlobalCookies saves all global cookies (full replacement).
func (s *Service) SaveGlobalCookies(cookies []models.GlobalCookie) error {
	return s.ConfigManager.SaveGlobalCookies(cookies)
}

// AddGlobalCookies parses and adds set-cookie raw data to the cookie store.
func (s *Service) AddGlobalCookies(rawCookies string) error {
	cookies, err := curl.ParseSetCookieLines(rawCookies)
	if err != nil {
		return err
	}
	for _, cookie := range cookies {
		if err := s.ConfigManager.AddGlobalCookie(cookie); err != nil {
			return err
		}
	}
	return nil
}

// DeleteGlobalCookie deletes a cookie by its ID.
func (s *Service) DeleteGlobalCookie(id string) error {
	return s.ConfigManager.DeleteGlobalCookie(id)
}

// ListHistory returns recent request history entries.
func (s *Service) ListHistory(limit int) ([]models.HistoryEntry, error) {
	if s.HistoryMgr == nil {
		return []models.HistoryEntry{}, nil
	}
	return s.HistoryMgr.ListEntries(limit)
}

// SearchHistory searches request history with filter parameters.
func (s *Service) SearchHistory(params models.HistorySearchParams, limit int) ([]models.HistoryEntry, error) {
	if s.HistoryMgr == nil {
		return []models.HistoryEntry{}, nil
	}
	return s.HistoryMgr.SearchEntries(params, limit)
}

// GetHistoryEntry returns a single history entry by ID.
func (s *Service) GetHistoryEntry(id string) (*models.RequestHistory, error) {
	if s.HistoryMgr == nil {
		return nil, nil
	}
	return s.HistoryMgr.GetEntry(id)
}

// DeleteHistory deletes a history entry by ID.
func (s *Service) DeleteHistory(id string) error {
	if s.HistoryMgr == nil {
		return nil
	}
	return s.HistoryMgr.DeleteEntry(id)
}

// ClearHistory clears all history entries.
func (s *Service) ClearHistory() error {
	if s.HistoryMgr == nil {
		return nil
	}
	return s.HistoryMgr.ClearAll()
}

// RecordHistory saves a request execution to history.
func (s *Service) RecordHistory(projectID, projectName, requestName, requestPath string, spec models.HttpRequestSpec, resp *models.CurlResponse) error {
	return s.RecordHistoryWithSource(projectID, projectName, requestName, requestPath, spec, resp, models.HistorySourceGUI, "")
}

// RecordHistoryWithSource saves a request execution to history with source information.
func (s *Service) RecordHistoryWithSource(projectID, projectName, requestName, requestPath string, spec models.HttpRequestSpec, resp *models.CurlResponse, source models.HistorySourceType, sourceTool string) error {
	if s.HistoryMgr == nil {
		return nil
	}
	entry := &models.RequestHistory{
		Source:      source,
		SourceTool:  sourceTool,
		ProjectID:   projectID,
		ProjectName: projectName,
		RequestName: requestName,
		RequestPath: requestPath,
		Method:      spec.Method,
		URL:         spec.HttpURL,
		Spec:        spec,
		Response:    resp,
	}
	return s.HistoryMgr.AddEntry(entry)
}

func (s *Service) BatchExecuteHTTPRequests(
	items []curl.BatchExecuteItem,
	environmentID string,
	parallel bool,
	concurrency int,
) (*curl.BatchExecuteResponse, error) {
	appCfg, _ := s.ConfigManager.LoadAppConfig()
	proxyOpts := buildProxyOptions(appCfg)
	timeout := getTimeout(appCfg)

	if concurrency <= 0 {
		concurrency = 5
	}

	var resp *curl.BatchExecuteResponse
	if parallel {
		resp = s.CurlExecutor.ExecuteBatchConcurrent(items, proxyOpts, timeout, concurrency)
	} else {
		resp = s.CurlExecutor.ExecuteBatchSequential(items, proxyOpts, timeout)
	}

	return resp, nil
}
