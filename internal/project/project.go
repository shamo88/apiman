package project

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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
	Method   string         `json:"method,omitempty"`
	URL      string         `json:"url,omitempty"`
	Children []*ProjectTree `json:"children,omitempty"`
	Path     string         `json:"path,omitempty"`
}

type folderMeta struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProjectGroupsState struct {
	Groups          []string          `json:"groups"`
	Assignments     map[string]string `json:"assignments"`
	CollapsedGroups []string          `json:"collapsedGroups,omitempty"`
}

func (pm *ProjectManager) groupsStateFilePath() string {
	return filepath.Join(pm.configManager.GetProjectsDir(), "projects.json")
}

func (pm *ProjectManager) LoadProjectGroupsState() (*ProjectGroupsState, error) {
	filePath := pm.groupsStateFilePath()
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return &ProjectGroupsState{
				Groups:      []string{},
				Assignments: map[string]string{},
			}, nil
		}
		return nil, err
	}

	var state ProjectGroupsState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	if state.Groups == nil {
		state.Groups = []string{}
	}
	if state.Assignments == nil {
		state.Assignments = map[string]string{}
	}
	if state.CollapsedGroups == nil {
		state.CollapsedGroups = []string{}
	}
	return &state, nil
}

func (pm *ProjectManager) SaveProjectGroupsState(state *ProjectGroupsState) error {
	if state == nil {
		return os.ErrInvalid
	}
	if state.Groups == nil {
		state.Groups = []string{}
	}
	if state.Assignments == nil {
		state.Assignments = map[string]string{}
	}
	if state.CollapsedGroups == nil {
		state.CollapsedGroups = []string{}
	}

	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(pm.groupsStateFilePath(), data, 0644)
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
	projectDirName := buildSlugUUIDName(name, projectID)
	projectPath := filepath.Join(pm.configManager.GetProjectsDir(), projectDirName)

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
	projectPath, err := pm.findProjectPathByID(id)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(projectPath); err != nil {
		return err
	}
	state, loadErr := pm.LoadProjectGroupsState()
	if loadErr == nil {
		if _, exists := state.Assignments[id]; exists {
			delete(state.Assignments, id)
			_ = pm.SaveProjectGroupsState(state)
		}
	}
	return nil
}

func (pm *ProjectManager) RenameProject(id, newName string) (*models.Project, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, os.ErrInvalid
	}

	projectPath, err := pm.findProjectPathByID(id)
	if err != nil {
		return nil, err
	}

	projectDirName := buildSlugUUIDName(newName, id)
	newProjectPath := filepath.Join(pm.configManager.GetProjectsDir(), projectDirName)
	if projectPath != newProjectPath {
		if _, statErr := os.Stat(newProjectPath); statErr == nil {
			return nil, errors.New("已存在同名项目")
		}
		if err := os.Rename(projectPath, newProjectPath); err != nil {
			return nil, err
		}
	}

	metaFile := filepath.Join(newProjectPath, "meta.json")
	var project models.Project
	if data, readErr := os.ReadFile(metaFile); readErr == nil {
		_ = json.Unmarshal(data, &project)
	}
	if project.ID == "" {
		project.ID = id
		project.CreatedAt = time.Now()
	}
	project.Name = newName
	project.Path = newProjectPath
	project.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(project, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(metaFile, data, 0644); err != nil {
		return nil, err
	}
	return &project, nil
}

func (pm *ProjectManager) findProjectPathByID(id string) (string, error) {
	projectsDir := pm.configManager.GetProjectsDir()
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		return "", err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), "__"+id) || entry.Name() == id {
			return filepath.Join(projectsDir, entry.Name()), nil
		}
	}

	return "", os.ErrNotExist
}

func (pm *ProjectManager) GetProjectTree(projectID string) (*ProjectTree, error) {
	projectsDir := pm.configManager.GetProjectsDir()
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		return nil, err
	}

	var projectPath string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), "__"+projectID) || entry.Name() == projectID {
			projectPath = filepath.Join(projectsDir, entry.Name())
			break
		}
	}

	if projectPath == "" {
		return nil, os.ErrNotExist
	}

	projectName := filepath.Base(projectPath)
	metaFile := filepath.Join(projectPath, "meta.json")
	if metaData, readErr := os.ReadFile(metaFile); readErr == nil {
		var project models.Project
		if json.Unmarshal(metaData, &project) == nil && project.Name != "" {
			projectName = project.Name
		}
	}

	tree := &ProjectTree{
		ID:   projectID,
		Name: projectName,
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
			if entry.Name() == "meta.json" || entry.Name() == ".folder.meta" {
				continue
			}

			folderPath := filepath.Join(dir, entry.Name())
			folderID := extractTrailingUUID(entry.Name())
			if folderID == "" {
				folderID = uuid.New().String()
			}
			displayName := stripUUIDSuffix(entry.Name())
			if meta, err := loadFolderMeta(folderPath); err == nil {
				if meta.ID != "" {
					folderID = meta.ID
				}
				if meta.Name != "" {
					displayName = meta.Name
				}
			}

			child := &ProjectTree{
				ID:   folderID,
				Name: displayName,
				Type: "folder",
				Path: folderPath,
			}

			if err := pm.buildTree(filepath.Join(dir, entry.Name()), child); err != nil {
				continue
			}

			node.Children = append(node.Children, child)
		} else {
			if filepath.Ext(entry.Name()) == ".curl" {
				requestName := strings.TrimSuffix(entry.Name(), ".curl")
				requestID := extractTrailingUUID(requestName)
				metaPath := filepath.Join(dir, requestID+".meta")
				method := "GET"
				url := ""

				if content, err := os.ReadFile(filepath.Join(dir, entry.Name())); err == nil {
					contentStr := string(content)
					method = extractMethod(contentStr)
					url = extractURL(contentStr)
				}

				if metaData, err := os.ReadFile(metaPath); err == nil {
					var meta map[string]string
					if json.Unmarshal(metaData, &meta) == nil {
						if name, ok := meta["name"]; ok && name != "" {
							requestName = name
						}
					}
				}

				child := &ProjectTree{
					ID:     uuid.New().String(),
					Name:   requestName,
					Type:   "request",
					Path:   filepath.Join(dir, entry.Name()),
					Method: method,
					URL:    url,
				}
				node.Children = append(node.Children, child)
			}
		}
	}

	return nil
}

func extractMethod(curlContent string) string {
	lines := strings.Split(curlContent, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)

		// 查找 curl 命令中的 -X 或 --request 参数
		if strings.HasPrefix(line, "-X ") || strings.HasPrefix(line, "--request ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				return strings.ToUpper(parts[1])
			}
		}

		// 如果行以 curl 开头（可能包含内联参数）
		if strings.HasPrefix(line, "curl ") {
			// 直接在行中查找 -X 或 --request
			if idx := strings.Index(line, "-X "); idx != -1 {
				methodPart := strings.TrimSpace(line[idx+3:])
				parts := strings.Fields(methodPart)
				if len(parts) > 0 {
					return strings.ToUpper(parts[0])
				}
			}
			if idx := strings.Index(line, "--request "); idx != -1 {
				methodPart := strings.TrimSpace(line[idx+10:])
				parts := strings.Fields(methodPart)
				if len(parts) > 0 {
					return strings.ToUpper(parts[0])
				}
			}
		}
	}
	return "GET"
}

func extractURL(curlContent string) string {
	normalized := strings.ReplaceAll(curlContent, "\\\n", " ")
	normalized = strings.ReplaceAll(normalized, "\n", " ")
	parts := strings.Fields(normalized)
	if len(parts) == 0 {
		return ""
	}

	optionsWithValue := map[string]bool{
		"-X":               true,
		"--request":        true,
		"-H":               true,
		"--header":         true,
		"-d":               true,
		"--data":           true,
		"--data-raw":       true,
		"--data-binary":    true,
		"--data-urlencode": true,
		"-u":               true,
		"--user":           true,
		"-A":               true,
		"--user-agent":     true,
		"-e":               true,
		"--referer":        true,
		"-b":               true,
		"--cookie":         true,
		"-o":               true,
		"--output":         true,
		"-k":               false,
		"--insecure":       false,
		"-s":               false,
		"--silent":         false,
		"-L":               false,
		"--location":       false,
	}

	for i := 0; i < len(parts); i++ {
		token := strings.Trim(parts[i], "'\"")
		if token == "" || token == "curl" {
			continue
		}

		if token == "--url" {
			if i+1 < len(parts) {
				return strings.Trim(parts[i+1], "'\"")
			}
			continue
		}

		if needsValue, exists := optionsWithValue[token]; exists {
			if needsValue {
				i++
			}
			continue
		}

		if strings.HasPrefix(token, "-") {
			continue
		}

		if strings.HasPrefix(token, "http://") ||
			strings.HasPrefix(token, "https://") ||
			strings.HasPrefix(token, "//") ||
			strings.HasPrefix(token, "{{") ||
			strings.HasPrefix(token, "/") {
			return token
		}
	}

	quotedURLPattern := regexp.MustCompile(`['"]((?:https?:)?//[^'"]+|/\S+|\{\{[^}]+\}\}\S*)['"]`)
	matches := quotedURLPattern.FindStringSubmatch(normalized)
	if len(matches) > 1 {
		return matches[1]
	}

	return ""
}

func (pm *ProjectManager) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	folderID := uuid.New().String()
	folderDirName := buildSlugUUIDName(name, folderID)
	folderPath := filepath.Join(parentPath, folderDirName)

	if err := os.MkdirAll(folderPath, 0755); err != nil {
		return nil, err
	}

	if err := saveFolderMeta(folderPath, folderID, name); err != nil {
		return nil, err
	}

	folder := &models.Folder{
		ID:        folderID,
		Name:      name,
		ProjectID: projectID,
		Path:      folderPath,
		CreatedAt: time.Now(),
	}

	return folder, nil
}

func (pm *ProjectManager) DeleteFolder(path string) error {
	return os.RemoveAll(path)
}

func (pm *ProjectManager) CreateRequest(projectID, folderPath, name string, content string) (*models.CurlRequest, error) {
	requestID := uuid.New().String()
	requestName := buildSlugUUIDName(name, requestID) + ".curl"
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

func buildSlugUUIDName(name, id string) string {
	base := strings.TrimSpace(strings.ToLower(name))
	if base == "" {
		base = "item"
	}

	re := regexp.MustCompile(`[^\p{L}\p{N}]+`)
	slug := strings.Trim(re.ReplaceAllString(base, "-"), "-")
	if slug == "" {
		slug = "item"
	}

	return slug + "__" + id
}

func stripUUIDSuffix(name string) string {
	parts := strings.Split(name, "__")
	if len(parts) < 2 {
		return name
	}

	suffix := parts[len(parts)-1]
	if _, err := uuid.Parse(suffix); err == nil {
		return strings.Join(parts[:len(parts)-1], "__")
	}

	return name
}

func extractTrailingUUID(name string) string {
	parts := strings.Split(name, "__")
	if len(parts) < 2 {
		return ""
	}

	suffix := parts[len(parts)-1]
	if _, err := uuid.Parse(suffix); err == nil {
		return suffix
	}

	return ""
}

func saveFolderMeta(folderPath, id, name string) error {
	meta := folderMeta{
		ID:   id,
		Name: name,
	}

	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(folderPath, ".folder.meta"), data, 0644)
}

func loadFolderMeta(folderPath string) (*folderMeta, error) {
	data, err := os.ReadFile(filepath.Join(folderPath, ".folder.meta"))
	if err != nil {
		return nil, err
	}

	var meta folderMeta
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (pm *ProjectManager) UpdateRequest(requestPath, content string) error {
	return os.WriteFile(requestPath, []byte(content), 0644)
}

func (pm *ProjectManager) DeleteRequest(requestPath string) error {
	requestName := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	requestID := extractTrailingUUID(requestName)
	if requestID == "" {
		requestID = requestName
	}
	metaPath := filepath.Join(filepath.Dir(requestPath), requestID+".meta")
	os.Remove(metaPath)
	return os.Remove(requestPath)
}

func (pm *ProjectManager) GetRequest(requestPath string) (*models.CurlRequest, error) {
	content, err := os.ReadFile(requestPath)
	if err != nil {
		return nil, err
	}

	requestNameKey := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	requestID := extractTrailingUUID(requestNameKey)
	if requestID == "" {
		requestID = requestNameKey
	}
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

func (pm *ProjectManager) CopyRequest(requestPath string) (*models.CurlRequest, error) {
	req, err := pm.GetRequest(requestPath)
	if err != nil {
		return nil, err
	}

	folderPath := filepath.Dir(requestPath)
	existingNames, err := pm.listRequestDisplayNames(folderPath)
	if err != nil {
		return nil, err
	}

	baseCopyName := req.Name + "-副本"
	copyName := baseCopyName
	for i := 2; ; i++ {
		if _, exists := existingNames[copyName]; !exists {
			break
		}
		copyName = baseCopyName + strconv.Itoa(i)
	}

	requestID := uuid.New().String()
	fileName := buildSlugUUIDName(copyName, requestID) + ".curl"
	newRequestPath := filepath.Join(folderPath, fileName)

	if err := os.WriteFile(newRequestPath, []byte(req.Content), 0644); err != nil {
		return nil, err
	}

	metaData := map[string]string{
		"id":   requestID,
		"name": copyName,
	}
	metaBytes, err := json.Marshal(metaData)
	if err != nil {
		return nil, err
	}
	metaPath := filepath.Join(folderPath, requestID+".meta")
	if err := os.WriteFile(metaPath, metaBytes, 0644); err != nil {
		return nil, err
	}

	return &models.CurlRequest{
		ID:        requestID,
		Name:      copyName,
		Path:      newRequestPath,
		Content:   req.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}

func (pm *ProjectManager) listRequestDisplayNames(folderPath string) (map[string]struct{}, error) {
	names := make(map[string]struct{})

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".curl" {
			continue
		}

		requestNameKey := strings.TrimSuffix(entry.Name(), ".curl")
		requestID := extractTrailingUUID(requestNameKey)
		if requestID == "" {
			requestID = requestNameKey
		}

		displayName := requestNameKey
		metaPath := filepath.Join(folderPath, requestID+".meta")
		if metaData, readErr := os.ReadFile(metaPath); readErr == nil {
			var meta map[string]string
			if json.Unmarshal(metaData, &meta) == nil && meta["name"] != "" {
				displayName = meta["name"]
			}
		}

		names[displayName] = struct{}{}
	}

	return names, nil
}

func (pm *ProjectManager) RenameRequest(requestPath, newName string) (*models.CurlRequest, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, os.ErrInvalid
	}

	req, err := pm.GetRequest(requestPath)
	if err != nil {
		return nil, err
	}

	requestNameKey := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	requestID := extractTrailingUUID(requestNameKey)
	if requestID == "" {
		requestID = requestNameKey
	}

	folderPath := filepath.Dir(requestPath)
	if exists, err := pm.requestNameExists(folderPath, newName, requestPath); err != nil {
		return nil, err
	} else if exists {
		return nil, errors.New("同级目录下已存在同名接口")
	}

	newFileName := buildSlugUUIDName(newName, requestID) + ".curl"
	newRequestPath := filepath.Join(folderPath, newFileName)

	if newRequestPath != requestPath {
		if err := os.Rename(requestPath, newRequestPath); err != nil {
			return nil, err
		}
	}

	metaData := map[string]string{
		"id":   requestID,
		"name": newName,
	}
	metaBytes, err := json.Marshal(metaData)
	if err != nil {
		return nil, err
	}
	metaPath := filepath.Join(filepath.Dir(newRequestPath), requestID+".meta")
	if err := os.WriteFile(metaPath, metaBytes, 0644); err != nil {
		return nil, err
	}

	return &models.CurlRequest{
		ID:        requestID,
		Name:      newName,
		Path:      newRequestPath,
		Content:   req.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, nil
}

func (pm *ProjectManager) RenameFolder(folderPath, newName string) (*models.Folder, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, os.ErrInvalid
	}

	parentPath := filepath.Dir(folderPath)
	if exists, err := pm.folderNameExists(parentPath, newName, folderPath); err != nil {
		return nil, err
	} else if exists {
		return nil, errors.New("同级目录下已存在同名文件夹")
	}

	folderID := extractTrailingUUID(filepath.Base(folderPath))
	if folderID == "" {
		if meta, err := loadFolderMeta(folderPath); err == nil && meta.ID != "" {
			folderID = meta.ID
		}
	}
	if folderID == "" {
		folderID = uuid.New().String()
	}

	newFolderName := buildSlugUUIDName(newName, folderID)
	newFolderPath := filepath.Join(parentPath, newFolderName)

	if newFolderPath != folderPath {
		if err := os.Rename(folderPath, newFolderPath); err != nil {
			return nil, err
		}
	}

	if err := saveFolderMeta(newFolderPath, folderID, newName); err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        folderID,
		Name:      newName,
		Path:      newFolderPath,
		CreatedAt: time.Now(),
	}, nil
}

func (pm *ProjectManager) requestNameExists(folderPath, name, excludePath string) (bool, error) {
	names, err := pm.listRequestDisplayNames(folderPath)
	if err != nil {
		return false, err
	}
	if _, exists := names[name]; !exists {
		return false, nil
	}

	if excludePath == "" {
		return true, nil
	}

	req, err := pm.GetRequest(excludePath)
	if err != nil {
		return true, nil
	}
	return req.Name != name, nil
}

func (pm *ProjectManager) MoveRequest(requestPath, targetFolderPath string) (string, error) {
	requestPath = filepath.Clean(requestPath)
	targetFolderPath = filepath.Clean(targetFolderPath)

	if requestPath == "" || targetFolderPath == "" {
		return "", os.ErrInvalid
	}

	targetInfo, err := os.Stat(targetFolderPath)
	if err != nil {
		return "", err
	}
	if !targetInfo.IsDir() {
		return "", errors.New("目标路径不是文件夹")
	}

	currentFolderPath := filepath.Dir(requestPath)
	if currentFolderPath == targetFolderPath {
		return requestPath, nil
	}

	req, err := pm.GetRequest(requestPath)
	if err != nil {
		return "", err
	}
	if exists, err := pm.requestNameExists(targetFolderPath, req.Name, ""); err != nil {
		return "", err
	} else if exists {
		return "", errors.New("目标文件夹中已存在同名接口")
	}

	newRequestPath := filepath.Join(targetFolderPath, filepath.Base(requestPath))
	if _, err := os.Stat(newRequestPath); err == nil {
		return "", errors.New("目标文件夹中已存在同名接口文件")
	}

	if err := os.Rename(requestPath, newRequestPath); err != nil {
		return "", err
	}

	requestNameKey := strings.TrimSuffix(filepath.Base(requestPath), ".curl")
	requestID := extractTrailingUUID(requestNameKey)
	if requestID == "" {
		requestID = requestNameKey
	}

	oldMetaPath := filepath.Join(currentFolderPath, requestID+".meta")
	newMetaPath := filepath.Join(targetFolderPath, requestID+".meta")
	if _, err := os.Stat(oldMetaPath); err == nil {
		if err := os.Rename(oldMetaPath, newMetaPath); err != nil {
			return "", err
		}
	}

	return newRequestPath, nil
}

func (pm *ProjectManager) MoveFolder(folderPath, targetParentPath string) (string, error) {
	folderPath = filepath.Clean(folderPath)
	targetParentPath = filepath.Clean(targetParentPath)

	if folderPath == "" || targetParentPath == "" {
		return "", os.ErrInvalid
	}

	targetInfo, err := os.Stat(targetParentPath)
	if err != nil {
		return "", err
	}
	if !targetInfo.IsDir() {
		return "", errors.New("目标路径不是文件夹")
	}

	currentParent := filepath.Dir(folderPath)
	if currentParent == targetParentPath {
		return folderPath, nil
	}

	folderName := pm.getFolderDisplayName(folderPath)
	if exists, err := pm.folderNameExists(targetParentPath, folderName, folderPath); err != nil {
		return "", err
	} else if exists {
		return "", errors.New("目标位置已存在同名文件夹")
	}

	normalizedFolder := folderPath + string(os.PathSeparator)
	normalizedTarget := targetParentPath + string(os.PathSeparator)
	if strings.HasPrefix(normalizedTarget, normalizedFolder) {
		return "", errors.New("不能移动到自身或子文件夹中")
	}

	newFolderPath := filepath.Join(targetParentPath, filepath.Base(folderPath))
	if _, err := os.Stat(newFolderPath); err == nil {
		return "", errors.New("目标位置已存在同名文件夹")
	}

	if err := os.Rename(folderPath, newFolderPath); err != nil {
		return "", err
	}

	return newFolderPath, nil
}

func (pm *ProjectManager) getFolderDisplayName(folderPath string) string {
	displayName := stripUUIDSuffix(filepath.Base(folderPath))
	if meta, err := loadFolderMeta(folderPath); err == nil && meta.Name != "" {
		displayName = meta.Name
	}
	return displayName
}

func (pm *ProjectManager) folderNameExists(parentPath, name, excludePath string) (bool, error) {
	entries, err := os.ReadDir(parentPath)
	if err != nil {
		return false, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		childPath := filepath.Join(parentPath, entry.Name())
		if excludePath != "" && childPath == excludePath {
			continue
		}

		displayName := stripUUIDSuffix(entry.Name())
		if meta, metaErr := loadFolderMeta(childPath); metaErr == nil && meta.Name != "" {
			displayName = meta.Name
		}

		if displayName == name {
			return true, nil
		}
	}

	return false, nil
}
