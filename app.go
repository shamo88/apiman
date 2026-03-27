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

func (a *App) LoadEnvironments() ([]models.Environment, error) {
	return a.service.LoadEnvironments()
}

func (a *App) CreateEnvironment(name string, variables map[string]string) (*models.Environment, error) {
	return a.service.CreateEnvironment(name, variables)
}

func (a *App) UpdateEnvironment(id string, name string, variables map[string]string) error {
	return a.service.UpdateEnvironment(id, name, variables)
}

func (a *App) DeleteEnvironment(id string) error {
	return a.service.DeleteEnvironment(id)
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

func (a *App) CreateRequest(projectID, folderPath, name string, content string) (*models.CurlRequest, error) {
	return a.service.CreateRequest(projectID, folderPath, name, content)
}

func (a *App) UpdateRequest(requestPath, content string) error {
	return a.service.UpdateRequest(requestPath, content)
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

func (a *App) MoveRequest(requestPath, targetFolderPath string) (string, error) {
	return a.service.MoveRequest(requestPath, targetFolderPath)
}

func (a *App) MoveFolder(folderPath, targetParentPath string) (string, error) {
	return a.service.MoveFolder(folderPath, targetParentPath)
}

func (a *App) ExecuteCurl(command string) (*models.CurlResponse, error) {
	return a.service.ExecuteCurl(command)
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
