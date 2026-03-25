package project

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ProjectManager struct {
	configManager *config.ConfigManager
}

func NewProjectManager(cfg *config.ConfigManager) *ProjectManager {
	pm := &ProjectManager{
		configManager: cfg,
	}

	if err := os.MkdirAll(cfg.GetProjectsDir(), 0755); err != nil {
		panic(err)
	}

	return pm
}

type ProjectTree struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Type     string         `json:"type"`
	Children []*ProjectTree `json:"children,omitempty"`
	Path     string         `json:"path,omitempty"`
}

func (pm *ProjectManager) ListProjects() ([]models.Project, error) {
	projectsDir := pm.configManager.GetProjectsDir()
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		return nil, err
	}

	var projects []models.Project
	for _, entry := range entries {
		if entry.IsDir() {
			projectPath := filepath.Join(projectsDir, entry.Name())
			metaFile := filepath.Join(projectPath, "meta.json")

			data, err := os.ReadFile(metaFile)
			if err != nil {
				continue
			}

			var project models.Project
			if err := json.Unmarshal(data, &project); err != nil {
				continue
			}

			projects = append(projects, project)
		}
	}

	return projects, nil
}

func (pm *ProjectManager) CreateProject(name string) (*models.Project, error) {
	projectID := uuid.New().String()
	projectPath := filepath.Join(pm.configManager.GetProjectsDir(), projectID)

	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return nil, err
	}

	project := &models.Project{
		ID:        projectID,
		Name:      name,
		Path:      projectPath,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	metaFile := filepath.Join(projectPath, "meta.json")
	data, err := json.MarshalIndent(project, "", "  ")
	if err != nil {
		return nil, err
	}

	if err := os.WriteFile(metaFile, data, 0644); err != nil {
		return nil, err
	}

	return project, nil
}

func (pm *ProjectManager) DeleteProject(id string) error {
	projectPath := filepath.Join(pm.configManager.GetProjectsDir(), id)
	return os.RemoveAll(projectPath)
}

func (pm *ProjectManager) GetProjectTree(projectID string) (*ProjectTree, error) {
	projectPath := filepath.Join(pm.configManager.GetProjectsDir(), projectID)

	tree := &ProjectTree{
		ID:   projectID,
		Name: filepath.Base(projectPath),
		Type: "project",
		Path: projectPath,
	}

	if err := pm.buildTree(projectPath, tree); err != nil {
		return nil, err
	}

	return tree, nil
}

func (pm *ProjectManager) buildTree(dir string, node *ProjectTree) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			if entry.Name() == "meta.json" {
				continue
			}

			child := &ProjectTree{
				ID:   uuid.New().String(),
				Name: entry.Name(),
				Type: "folder",
				Path: filepath.Join(dir, entry.Name()),
			}

			if err := pm.buildTree(filepath.Join(dir, entry.Name()), child); err != nil {
				continue
			}

			node.Children = append(node.Children, child)
		} else {
			if filepath.Ext(entry.Name()) == ".curl" {
				requestName := strings.TrimSuffix(entry.Name(), ".curl")
				metaPath := filepath.Join(dir, requestName+".meta")
				if metaData, err := os.ReadFile(metaPath); err == nil {
					var meta map[string]string
					if json.Unmarshal(metaData, &meta) == nil {
						if name, ok := meta["name"]; ok && name != "" {
							requestName = name
						}
					}
				}

				child := &ProjectTree{
					ID:   uuid.New().String(),
					Name: requestName,
					Type: "request",
					Path: filepath.Join(dir, entry.Name()),
				}
				node.Children = append(node.Children, child)
			}
		}
	}

	return nil
}

func (pm *ProjectManager) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	folderPath := filepath.Join(parentPath, name)

	if err := os.MkdirAll(folderPath, 0755); err != nil {
		return nil, err
	}

	folder := &models.Folder{
		ID:        uuid.New().String(),
		Name:      name,
		ProjectID: projectID,
		CreatedAt: time.Now(),
	}

	return folder, nil
}

func (pm *ProjectManager) DeleteFolder(path string) error {
	return os.RemoveAll(path)
}

func (pm *ProjectManager) CreateRequest(projectID, folderPath, name string, content string) (*models.CurlRequest, error) {
	requestID := uuid.New().String()
	requestName := requestID + ".curl"
	requestPath := filepath.Join(folderPath, requestName)

	if err := os.WriteFile(requestPath, []byte(content), 0644); err != nil {
		return nil, err
	}

	metaData := map[string]string{
		"id":   requestID,
		"name": name,
	}
	metaBytes, _ := json.Marshal(metaData)
	metaPath := filepath.Join(folderPath, requestID+".meta")
	os.WriteFile(metaPath, metaBytes, 0644)

	request := &models.CurlRequest{
		ID:        requestID,
		Name:      name,
		ProjectID: projectID,
		Path:      requestPath,
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return request, nil
}

func (pm *ProjectManager) UpdateRequest(requestPath, content string) error {
	return os.WriteFile(requestPath, []byte(content), 0644)
}

func (pm *ProjectManager) DeleteRequest(requestPath string) error {
	requestID := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	metaPath := filepath.Join(filepath.Dir(requestPath), requestID+".meta")
	os.Remove(metaPath)
	return os.Remove(requestPath)
}

func (pm *ProjectManager) GetRequest(requestPath string) (*models.CurlRequest, error) {
	content, err := os.ReadFile(requestPath)
	if err != nil {
		return nil, err
	}

	requestID := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	metaPath := filepath.Join(filepath.Dir(requestPath), requestID+".meta")

	var requestName string
	if metaData, err := os.ReadFile(metaPath); err == nil {
		var meta map[string]string
		if json.Unmarshal(metaData, &meta) == nil {
			requestName = meta["name"]
		}
	}

	if requestName == "" {
		requestName = strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	}

	return &models.CurlRequest{
		Path:    requestPath,
		Name:    requestName,
		Content: string(content),
	}, nil
}
