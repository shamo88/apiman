package service

import (
	"apiman/internal/config"
	"apiman/internal/curl"
	"apiman/internal/models"
	"apiman/internal/postman"
	"apiman/internal/project"
)

type Service struct {
	ConfigManager   *config.ConfigManager
	ProjectMgr      *project.ProjectManager
	CurlExecutor    *curl.CurlExecutor
	PostmanImporter *postman.PostmanImporter
}

func NewService() *Service {
	cfgMgr := config.NewConfigManager()
	projectMgr := project.NewProjectManager(cfgMgr)
	curlExec := curl.NewCurlExecutor()
	postmanImp := postman.NewPostmanImporter(cfgMgr)

	return &Service{
		ConfigManager:   cfgMgr,
		ProjectMgr:      projectMgr,
		CurlExecutor:    curlExec,
		PostmanImporter: postmanImp,
	}
}

func (s *Service) GetConfigDir() string {
	return s.ConfigManager.GetConfigDir()
}

func (s *Service) GetProjectsDir() string {
	return s.ConfigManager.GetProjectsDir()
}

func (s *Service) LoadEnvironments() ([]models.Environment, error) {
	return s.ConfigManager.LoadEnvironments()
}

func (s *Service) CreateEnvironment(name string, variables map[string]string) (*models.Environment, error) {
	return s.ConfigManager.CreateEnvironment(name, variables)
}

func (s *Service) UpdateEnvironment(id string, name string, variables map[string]string) error {
	return s.ConfigManager.UpdateEnvironment(id, name, variables)
}

func (s *Service) DeleteEnvironment(id string) error {
	return s.ConfigManager.DeleteEnvironment(id)
}

func (s *Service) GetGlobalVariables() (map[string]string, error) {
	return s.ConfigManager.GetGlobalVariables()
}

func (s *Service) SaveGlobalVariables(variables map[string]string) error {
	return s.ConfigManager.SaveGlobalVariables(variables)
}

func (s *Service) ListProjects() ([]models.Project, error) {
	return s.ProjectMgr.ListProjects()
}

func (s *Service) CreateProject(name string) (*models.Project, error) {
	return s.ProjectMgr.CreateProject(name)
}

func (s *Service) DeleteProject(id string) error {
	return s.ProjectMgr.DeleteProject(id)
}

func (s *Service) GetProjectTree(projectID string) (*project.ProjectTree, error) {
	return s.ProjectMgr.GetProjectTree(projectID)
}

func (s *Service) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	return s.ProjectMgr.CreateFolder(projectID, parentPath, name)
}

func (s *Service) DeleteFolder(path string) error {
	return s.ProjectMgr.DeleteFolder(path)
}

func (s *Service) CreateRequest(projectID, folderPath, name string, content string) (*models.CurlRequest, error) {
	return s.ProjectMgr.CreateRequest(projectID, folderPath, name, content)
}

func (s *Service) UpdateRequest(requestPath, content string) error {
	return s.ProjectMgr.UpdateRequest(requestPath, content)
}

func (s *Service) DeleteRequest(requestPath string) error {
	return s.ProjectMgr.DeleteRequest(requestPath)
}

func (s *Service) GetRequest(requestPath string) (*models.CurlRequest, error) {
	return s.ProjectMgr.GetRequest(requestPath)
}

func (s *Service) CopyRequest(requestPath string) (*models.CurlRequest, error) {
	return s.ProjectMgr.CopyRequest(requestPath)
}

func (s *Service) RenameRequest(requestPath, newName string) (*models.CurlRequest, error) {
	return s.ProjectMgr.RenameRequest(requestPath, newName)
}

func (s *Service) RenameFolder(folderPath, newName string) (*models.Folder, error) {
	return s.ProjectMgr.RenameFolder(folderPath, newName)
}

func (s *Service) ExecuteCurl(command string) (*models.CurlResponse, error) {
	return s.CurlExecutor.Execute(command)
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
	return s.PostmanImporter.ImportCollection(jsonData)
}
