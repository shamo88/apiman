package main

import (
	"apiman/internal/config"
	"apiman/internal/mcp"
	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
	"context"
	"encoding/json"
)

type App struct {
	ctx     context.Context
	service *service.Service
}

func NewApp() *App {
	return &App{
		service: service.NewService(),
	}
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

func (a *App) CreateEnvironment(projectID string, name string, variables map[string]string) (*models.Environment, error) {
	return a.service.CreateEnvironment(projectID, name, variables)
}

func (a *App) UpdateEnvironment(projectID string, id string, name string, variables map[string]string) error {
	return a.service.UpdateEnvironment(projectID, id, name, variables)
}

func (a *App) DeleteEnvironment(projectID string, id string) error {
	return a.service.DeleteEnvironment(projectID, id)
}

func (a *App) ExportEnvironments(projectID string) (string, error) {
	return a.service.ExportEnvironments(projectID)
}

func (a *App) ImportEnvironments(projectID string, jsonData string) ([]models.Environment, error) {
	return a.service.ImportEnvironments(projectID, jsonData)
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

func (a *App) ExecuteHTTPRequestWithProject(projectID, projectName, requestName, requestPath string, spec models.HttpRequestSpec) (*models.CurlResponse, error) {
	return a.service.ExecuteHTTPRequestWithProject(projectID, projectName, requestName, requestPath, spec)
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
	return a.service.ExecuteHTTPRequestWithScripts(projectID, projectName, requestName, requestPath, environmentID, spec, preScriptIDs, postScriptIDs)
}

func (a *App) ExecuteHTTPRequestWithScriptsInline(
	projectID, projectName, requestName, requestPath string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScript string,
	postScript string,
) (*models.CurlResponse, error) {
	return a.service.ExecuteHTTPRequestWithScriptsInline(projectID, projectName, requestName, requestPath, environmentID, spec, preScript, postScript)
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

// LoadMCPConfig loads the MCP configuration.
func (a *App) LoadMCPConfig() (*config.MCPConfig, error) {
	cfg, err := a.service.LoadAppConfig()
	if err != nil {
		return nil, err
	}
	return &cfg.MCP, nil
}

// SaveMCPConfig saves the MCP configuration.
func (a *App) SaveMCPConfig(cfg *config.MCPConfig) error {
	appCfg, err := a.service.LoadAppConfig()
	if err != nil {
		appCfg = &config.AppConfig{}
	}
	appCfg.MCP = *cfg
	return a.service.SaveAppConfig(appCfg)
}

// StartMCP starts the MCP server with current config.
func (a *App) StartMCP() error {
	cfg, err := a.LoadMCPConfig()
	if err != nil {
		return err
	}

	// Ensure project exists
	if cfg.ProjectID == "" {
		project, err := a.service.CreateProject("MCP Default Project")
		if err != nil {
			return err
		}
		cfg.ProjectID = project.ID
		if err := a.SaveMCPConfig(cfg); err != nil {
			return err
		}
	}

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

