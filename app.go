package main

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
	"context"
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

func (a *App) CreateProjectScript(projectID, name, content string) (*models.ProjectScript, error) {
	return a.service.CreateProjectScript(projectID, name, content)
}

func (a *App) UpdateProjectScript(projectID, scriptID, name, content string) (*models.ProjectScript, error) {
	return a.service.UpdateProjectScript(projectID, scriptID, name, content)
}

func (a *App) DeleteProjectScript(projectID, scriptID string) error {
	return a.service.DeleteProjectScript(projectID, scriptID)
}

func (a *App) ExecuteHTTPRequestWithScripts(
	projectID string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScriptIDs []string,
	postScriptIDs []string,
) (*models.CurlResponse, error) {
	return a.service.ExecuteHTTPRequestWithScripts(projectID, environmentID, spec, preScriptIDs, postScriptIDs)
}

func (a *App) ExecuteHTTPRequestWithScriptsInline(
	projectID string,
	environmentID string,
	spec models.HttpRequestSpec,
	preScript string,
	postScript string,
) (*models.CurlResponse, error) {
	return a.service.ExecuteHTTPRequestWithScriptsInline(projectID, environmentID, spec, preScript, postScript)
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
