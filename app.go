package main

import (
	"apiman/internal/config"
	"apiman/internal/curl"
	"apiman/internal/mcp"
	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

type App struct {
	ctx           context.Context
	service       *service.Service
	requestCtx    context.Context
	requestCancel context.CancelFunc
	requestMu     sync.Mutex
}

func NewApp() (*App, error) {
	svc, err := service.NewService()
	if err != nil {
		return nil, err
	}
	return &App{
		service: svc,
	}, nil
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetConfigDir() string {
	return a.service.GetConfigDir()
}

func (a *App) GetProjectsDir() string {
	return a.service.GetProjectsDir()
}

func (a *App) LoadEnvironments(projectID string) ([]models.Environment, error) {
	return a.service.LoadEnvironments(projectID)
}

func (a *App) CreateEnvironment(projectID string, name string, variables map[string]string, mark string) (*models.Environment, error) {
	return a.service.CreateEnvironment(projectID, name, variables, models.EnvironmentMark(mark))
}

func (a *App) UpdateEnvironment(projectID string, id string, name string, variables map[string]string, mark string) error {
	// The frontend always sends the current mark value (selected from the
	// dropdown, including "" for unmarked). The internal sentinel
	// EnvironmentMarkUnspecified is reserved for callers that want to
	// preserve the existing mark — the GUI never uses it.
	return a.service.UpdateEnvironment(projectID, id, name, variables, models.EnvironmentMark(mark))
}

func (a *App) DeleteEnvironment(projectID string, id string) error {
	return a.service.DeleteEnvironment(projectID, id)
}

func (a *App) GetGlobalVariables() (map[string]string, error) {
	return a.service.GetGlobalVariables()
}

func (a *App) SaveGlobalVariables(variables map[string]string) error {
	return a.service.SaveGlobalVariables(variables)
}

func (a *App) ListProjects() ([]models.Project, error) {
	return a.service.ListProjects()
}

func (a *App) CreateProject(name string) (*models.Project, error) {
	return a.service.CreateProject(name)
}

func (a *App) DeleteProject(id string) error {
	return a.service.DeleteProject(id)
}

func (a *App) RenameProject(id, newName string) (*models.Project, error) {
	return a.service.RenameProject(id, newName)
}

func (a *App) GetProjectTree(projectID string) (*project.ProjectTree, error) {
	return a.service.GetProjectTree(projectID)
}

func (a *App) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	return a.service.CreateFolder(projectID, parentPath, name)
}

func (a *App) DeleteFolder(path string) error {
	return a.service.DeleteFolder(path)
}

func (a *App) CreateRequest(projectID, folderPath, name string, spec models.HttpRequestSpec) (*models.CurlRequest, error) {
	return a.service.CreateRequest(projectID, folderPath, name, spec)
}

func (a *App) UpdateRequest(requestPath string, spec models.HttpRequestSpec, cases []models.HttpRequestCase, activeCaseID string) error {
	return a.service.UpdateRequest(requestPath, spec, cases, activeCaseID)
}

func (a *App) AddRequestCase(requestPath, caseName string) (*models.CurlRequest, error) {
	return a.service.AddRequestCase(requestPath, caseName)
}

func (a *App) DuplicateRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	return a.service.DuplicateRequestCase(requestPath, caseID)
}

func (a *App) DeleteRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	return a.service.DeleteRequestCase(requestPath, caseID)
}

func (a *App) RenameRequestCase(requestPath, caseID, newName string) (*models.CurlRequest, error) {
	return a.service.RenameRequestCase(requestPath, caseID, newName)
}

func (a *App) UpdateRequestScripts(requestPath string, preScripts, postScripts []string) error {
	return a.service.UpdateRequestScripts(requestPath, preScripts, postScripts)
}

func (a *App) UpdateProjectScripts(projectID string, preScripts, postScripts []string) error {
	return a.service.UpdateProjectScripts(projectID, preScripts, postScripts)
}

func (a *App) GetProjectScripts(projectID string) (preScripts, postScripts []string, err error) {
	return a.service.GetProjectScripts(projectID)
}

func (a *App) GetProjectScriptsResult(projectID string) (*models.ProjectScriptsResult, error) {
	return a.service.GetProjectScriptsResult(projectID)
}

func (a *App) GetFolderScripts(folderPath string) (preScripts, postScripts []string, err error) {
	return a.service.GetFolderScripts(folderPath)
}

func (a *App) GetFolderScriptsResult(folderPath string) (*models.FolderScriptsResult, error) {
	return a.service.GetFolderScriptsResult(folderPath)
}

func (a *App) UpdateFolderScripts(folderPath string, preScripts, postScripts []string) error {
	return a.service.UpdateFolderScripts(folderPath, preScripts, postScripts)
}

func (a *App) DeleteRequest(requestPath string) error {
	return a.service.DeleteRequest(requestPath)
}

func (a *App) GetRequest(requestPath string) (*models.CurlRequest, error) {
	return a.service.GetRequest(requestPath)
}

func (a *App) CopyRequest(requestPath string) (*models.CurlRequest, error) {
	return a.service.CopyRequest(requestPath)
}

func (a *App) RenameRequest(requestPath, newName string) (*models.CurlRequest, error) {
	return a.service.RenameRequest(requestPath, newName)
}

func (a *App) RenameFolder(folderPath, newName string) (*models.Folder, error) {
	return a.service.RenameFolder(folderPath, newName)
}

func (a *App) MoveRequest(requestPath, targetFolderPath string, beforeID string) (string, error) {
	return a.service.MoveRequest(requestPath, targetFolderPath, beforeID)
}

func (a *App) MoveFolder(folderPath, targetParentPath string, beforeID string) (string, error) {
	return a.service.MoveFolder(folderPath, targetParentPath, beforeID)
}

func (a *App) ExecuteCurl(command string) (*models.CurlResponse, error) {
	return a.service.ExecuteCurl(command)
}

func (a *App) ExecuteHTTPRequest(spec models.HttpRequestSpec) (*models.CurlResponse, error) {
	return a.service.ExecuteHTTPRequest(spec)
}

func (a *App) ExtractVariables(text string) []string {
	return a.service.ExtractVariables(text)
}

func (a *App) ReplaceVariables(text string, variables map[string]string) string {
	return a.service.ReplaceVariables(text, variables)
}

func (a *App) LoadAppConfig() (*config.AppConfig, error) {
	return a.service.LoadAppConfig()
}

func (a *App) SaveAppConfig(config *config.AppConfig) error {
	return a.service.SaveAppConfig(config)
}

func (a *App) ImportPostmanCollection(jsonData string) (*models.Project, error) {
	return a.service.ImportPostmanCollection(jsonData)
}

func (a *App) ImportOpenAPICollection(jsonData string) (*models.Project, error) {
	return a.service.ImportOpenAPICollection(jsonData)
}

func (a *App) ParseOpenAPICollection(jsonData string) (string, error) {
	result, err := a.service.ParseOpenAPICollection(jsonData)
	if err != nil {
		return "", err
	}

	itemsInterface := make([]any, len(result.Items))
	for i, item := range result.Items {
		itemsInterface[i] = item
	}

	type ParsePreview struct {
		ProjectName string `json:"projectName"`
		Items       []any  `json:"items"`
	}

	preview := ParsePreview{
		ProjectName: result.ProjectName,
		Items:       itemsInterface,
	}

	previewJSON, err := json.Marshal(preview)
	if err != nil {
		return "", err
	}

	return string(previewJSON), nil
}

func (a *App) LoadProjectGroupsState() (*project.ProjectGroupsState, error) {
	return a.service.LoadProjectGroupsState()
}

func (a *App) SaveProjectGroupsState(state *project.ProjectGroupsState) error {
	return a.service.SaveProjectGroupsState(state)
}

func (a *App) ListProjectScripts(projectID string) ([]models.ProjectScript, error) {
	return a.service.ListProjectScripts(projectID)
}

func (a *App) CreateProjectScript(projectID, name, description, content string) (*models.ProjectScript, error) {
	return a.service.CreateProjectScript(projectID, name, description, content)
}

func (a *App) UpdateProjectScript(projectID, scriptID, name, description, content string) (*models.ProjectScript, error) {
	return a.service.UpdateProjectScript(projectID, scriptID, name, description, content)
}

func (a *App) DeleteProjectScript(projectID, scriptID string) error {
	return a.service.DeleteProjectScript(projectID, scriptID)
}

func (a *App) ExecuteHTTPRequestWithScripts(
	projectID, projectName, requestName, requestPath string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScriptIDs []string,
	postScriptIDs []string,
) (*models.CurlResponse, error) {
	// 取消之前的请求
	a.cancelCurrentRequest()

	// 创建新的 context 和 cancelFunc
	a.requestCtx, a.requestCancel = context.WithCancel(context.Background())
	return a.service.ExecuteHTTPRequestWithScriptsWithCancel(
		a.requestCtx,
		projectID, projectName, requestName, requestPath,
		environmentID, spec, preScriptIDs, postScriptIDs,
	)
}

// CancelCurrentRequest cancels the currently running HTTP request if any.
func (a *App) CancelCurrentRequest() {
	a.cancelCurrentRequest()
}

func (a *App) cancelCurrentRequest() {
	a.requestMu.Lock()
	defer a.requestMu.Unlock()
	if a.requestCancel != nil {
		a.requestCancel()
		a.requestCancel = nil
	}
}

func (a *App) SyncProjectToGit(projectID string) error {
	return a.service.SyncProjectToGit(projectID)
}

func (a *App) SyncAllProjectsToGit() error {
	return a.service.SyncAllProjectsToGit()
}

func (a *App) InitGitRepo() error {
	return a.service.InitGitRepo()
}

func (a *App) InitProjectsDir() error {
	return a.service.InitProjectsDir()
}

func (a *App) EnableGitSync(remoteURL, branch, password string) error {
	return a.service.EnableGitSync(remoteURL, branch, password)
}

func (a *App) DisableGitSync() error {
	return a.service.DisableGitSync()
}

func (a *App) PullGitRepo() error {
	return a.service.PullGitRepo()
}

func (a *App) ListGitBranches() ([]string, error) {
	return a.service.ListGitBranches()
}

func (a *App) GetCurrentGitBranch() (string, error) {
	return a.service.GetCurrentGitBranch()
}

func (a *App) CreateGitBranch(name string) error {
	return a.service.CreateGitBranch(name)
}

func (a *App) SwitchGitBranch(name string) error {
	return a.service.SwitchGitBranch(name)
}

func (a *App) DeleteGitBranch(name string) error {
	return a.service.DeleteGitBranch(name)
}

// LoadGlobalCookies returns all saved global cookies as JSON string.
func (a *App) LoadGlobalCookies() (string, error) {
	cookies, err := a.service.LoadGlobalCookies()
	if err != nil {
		return "", err
	}
	data, err := json.Marshal(cookies)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SaveGlobalCookies replaces all global cookies with the given JSON data.
func (a *App) SaveGlobalCookies(jsonData string) error {
	var cookies []models.GlobalCookie
	if err := json.Unmarshal([]byte(jsonData), &cookies); err != nil {
		return err
	}
	return a.service.SaveGlobalCookies(cookies)
}

// AddGlobalCookies parses and adds set-cookie raw data.
func (a *App) AddGlobalCookies(rawCookies string) error {
	return a.service.AddGlobalCookies(rawCookies)
}

// DeleteGlobalCookie deletes a cookie by its ID.
func (a *App) DeleteGlobalCookie(id string) error {
	return a.service.DeleteGlobalCookie(id)
}

// MCP Server instance (set from main.go)
var mcpServer *mcp.Server

// LoadMCPConfig loads the MCP configuration with the api_key field
// transparently decrypted for in-memory use.
func (a *App) LoadMCPConfig() (*config.MCPConfig, error) {
	cfg, err := a.service.LoadAppConfig()
	if err != nil {
		return nil, err
	}
	return mcp.DecryptMCPConfig(&cfg.MCP), nil
}

// SaveMCPConfig saves the MCP configuration. The api_key field is encrypted
// on disk; legacy plaintext keys are migrated on first save.
func (a *App) SaveMCPConfig(cfg *config.MCPConfig) error {
	appCfg, err := a.service.LoadAppConfig()
	if err != nil {
		appCfg = &config.AppConfig{}
	}
	appCfg.MCP = *mcp.EncryptMCPConfig(cfg)
	return a.service.SaveAppConfig(appCfg)
}

// StartMCP starts the MCP server with current config.
func (a *App) StartMCP() error {
	cfg, err := a.LoadMCPConfig()
	if err != nil {
		return err
	}

	// MCP can start without a bound project — it just runs unbound until
	// the user picks a project via the runtime switcher. We deliberately
	// do NOT auto-create a "MCP Default Project": the user must configure
	// the bound project explicitly. MCPRuntimeState will surface the
	// unbound state with a "未绑定项目" placeholder.

	// Stop existing server if running
	if mcpServer != nil && mcpServer.IsRunning() {
		mcpServer.Stop()
	}

	mcpServer = mcp.NewServer(a.service, cfg)
	return mcpServer.Start()
}

// StopMCP stops the MCP server.
func (a *App) StopMCP() error {
	if mcpServer != nil {
		return mcpServer.Stop()
	}
	return nil
}

// GetMCPStatus returns the MCP server status.
func (a *App) GetMCPStatus() string {
	if mcpServer == nil {
		return "stopped"
	}
	if mcpServer.IsRunning() {
		return "running"
	}
	return "stopped"
}

// ListProjectsForMCP lists all projects for MCP configuration.
func (a *App) ListProjectsForMCP() ([]models.Project, error) {
	return a.service.ListProjects()
}

// MCPRuntimeState is the frontend-facing snapshot of the MCP server's
// current binding. It augments mcp.RuntimeState with human-readable names
// resolved against the user's project list.
type MCPRuntimeState struct {
	Running          bool   `json:"running"`
	BoundProjectID   string `json:"boundProjectId"`
	BoundProjectName string `json:"boundProjectName"`
	EnvironmentID    string `json:"environmentId"`
	EnvironmentName  string `json:"environmentName"`
	ActiveClients    int    `json:"activeClients"`
	Port             int    `json:"port"`
}

// GetMCPRuntimeState returns a snapshot of the running MCP server's
// current project / environment binding. When the server is not running
// it returns Running=false with empty ID fields; this is a normal state,
// not an error.
func (a *App) GetMCPRuntimeState() (*MCPRuntimeState, error) {
	if mcpServer == nil {
		return &MCPRuntimeState{Running: false, BoundProjectName: "未绑定项目"}, nil
	}

	snap := mcpServer.GetRuntimeState()
	out := &MCPRuntimeState{
		Running:        snap.Running,
		BoundProjectID: snap.BoundProjectID,
		EnvironmentID:  snap.EnvironmentID,
		ActiveClients:  snap.ActiveClients,
		Port:           snap.Port,
	}

	// No bound project — surface a Chinese "未绑定项目" placeholder so the
	// UI doesn't fall back to showing the (empty) UUID, which users mistake
	// for an unresolved bug. This also covers the case where mcpServer
	// exists but has no project set yet.
	if snap.BoundProjectID == "" {
		out.BoundProjectName = "未绑定项目"
	} else {
		if name, err := a.service.GetProjectName(snap.BoundProjectID); err == nil {
			out.BoundProjectName = name
		}
		if snap.EnvironmentID != "" {
			envs, err := a.service.LoadEnvironments(snap.BoundProjectID)
			if err == nil {
				for _, env := range envs {
					if env.ID == snap.EnvironmentID {
						out.EnvironmentName = env.Name
						break
					}
				}
			}
		}
	}

	return out, nil
}

// BindMCPProject switches the MCP server's bound project at runtime.
// When the server is running, the change is applied live (no restart);
// in either case the new project ID is persisted to MCPConfig so it
// becomes the boot default. Empty projectID is allowed and unbinds.
// Validates the project exists before applying.
func (a *App) BindMCPProject(projectID string) error {
	if projectID != "" {
		projects, err := a.service.ListProjects()
		if err != nil {
			return fmt.Errorf("failed to list projects: %w", err)
		}
		found := false
		for _, p := range projects {
			if p.ID == projectID {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("project not found: %s", projectID)
		}
	}

	if mcpServer != nil && mcpServer.IsRunning() {
		mcpServer.Handler().SetProjectID(projectID)
		// Clearing the active environment when project changes avoids
		// dangling references to environments that belong to the old project.
		mcpServer.Handler().SetEnvironmentID("")
	}

	cfg, err := a.LoadMCPConfig()
	if err != nil {
		return err
	}
	cfg.ProjectID = projectID
	cfg.EnvironmentID = "" // reset on project switch
	return a.SaveMCPConfig(cfg)
}

// SetMCPEnvironment switches the MCP server's active environment at
// runtime. Empty envID is allowed and deactivates. When non-empty, the
// environment must belong to the currently bound project.
func (a *App) SetMCPEnvironment(envID string) error {
	if mcpServer != nil && mcpServer.IsRunning() {
		projectID := mcpServer.Handler().GetProjectID()
		if projectID == "" {
			return fmt.Errorf("no project bound; cannot set environment")
		}
		if envID != "" {
			envs, err := a.service.LoadEnvironments(projectID)
			if err != nil {
				return fmt.Errorf("failed to load environments: %w", err)
			}
			found := false
			for _, env := range envs {
				if env.ID == envID {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("environment %s not found in bound project", envID)
			}
		}
		mcpServer.Handler().SetEnvironmentID(envID)
	}

	cfg, err := a.LoadMCPConfig()
	if err != nil {
		return err
	}
	cfg.EnvironmentID = envID
	return a.SaveMCPConfig(cfg)
}

// ListHistory returns recent request history entries.
func (a *App) ListHistory(limit int) ([]models.HistoryEntry, error) {
	return a.service.ListHistory(limit)
}

// SearchHistory searches request history with filter parameters.
func (a *App) SearchHistory(params models.HistorySearchParams, limit int) ([]models.HistoryEntry, error) {
	return a.service.SearchHistory(params, limit)
}

// GetHistoryEntry returns a single history entry by ID.
func (a *App) GetHistoryEntry(id string) (*models.RequestHistory, error) {
	return a.service.GetHistoryEntry(id)
}

// DeleteHistory deletes a history entry by ID.
func (a *App) DeleteHistory(id string) error {
	return a.service.DeleteHistory(id)
}

// ClearHistory clears all history entries.
func (a *App) ClearHistory() error {
	return a.service.ClearHistory()
}

// BatchExecuteHTTPRequests executes multiple HTTP requests in sequence or parallel.
func (a *App) BatchExecuteHTTPRequests(items []interface{}, environmentID string, parallel bool, concurrency int) (interface{}, error) {
	batchItems := make([]curl.BatchExecuteItem, 0, len(items))
	for _, item := range items {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		bi := curl.BatchExecuteItem{}
		if v, ok := itemMap["projectID"].(string); ok {
			bi.ProjectID = v
		}
		if v, ok := itemMap["projectName"].(string); ok {
			bi.ProjectName = v
		}
		if v, ok := itemMap["requestName"].(string); ok {
			bi.RequestName = v
		}
		if v, ok := itemMap["requestPath"].(string); ok {
			bi.RequestPath = v
		}
		if v, ok := itemMap["spec"].(map[string]interface{}); ok {
			spec := models.HttpRequestSpec{}
			if method, ok := v["method"].(string); ok {
				spec.Method = method
			}
			if httpURL, ok := v["http_url"].(string); ok {
				spec.HttpURL = httpURL
			}
			if headers, ok := v["headers"].([]interface{}); ok {
				for _, h := range headers {
					if hm, ok := h.(map[string]interface{}); ok {
						spec.Headers = append(spec.Headers, models.RequestKeyVal{
							Key:     getString(hm, "key"),
							Value:   getString(hm, "value"),
							Enabled: getBool(hm, "enabled"),
						})
					}
				}
			}
			if params, ok := v["params"].([]interface{}); ok {
				for _, p := range params {
					if pm, ok := p.(map[string]interface{}); ok {
						spec.Params = append(spec.Params, models.RequestKeyVal{
							Key:     getString(pm, "key"),
							Value:   getString(pm, "value"),
							Enabled: getBool(pm, "enabled"),
						})
					}
				}
			}
			if body, ok := v["body"].(string); ok {
				spec.Body = body
			}
			if bodyType, ok := v["body_type"].(string); ok {
				spec.BodyType = bodyType
			}
			bi.Spec = spec
		}
		batchItems = append(batchItems, bi)
	}

	return a.service.BatchExecuteHTTPRequests(batchItems, environmentID, parallel, concurrency)
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return true
}
