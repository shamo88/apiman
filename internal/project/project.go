package project

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"apiman/internal/postman"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ProjectManager struct {
	configManager *config.ConfigManager
	projectsDir    string
}

func NewProjectManager(cfg *config.ConfigManager) *ProjectManager {
	workDir := cfg.GetWorkDir()
	pm := &ProjectManager{configManager: cfg, projectsDir: workDir}
	if err := os.MkdirAll(workDir, 0755); err != nil {
		panic(err)
	}
	return pm
}

// SetProjectsDir 动态设置工作目录
func (pm *ProjectManager) SetProjectsDir(dir string) {
	pm.projectsDir = dir
}

// GetProjectsDir 获取当前工作目录
func (pm *ProjectManager) GetProjectsDir() string {
	return pm.projectsDir
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

type scriptMeta struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ProjectGroupsState struct {
	Groups          []string          `json:"groups"`
	Assignments     map[string]string `json:"assignments"`
	CollapsedGroups []string          `json:"collapsedGroups,omitempty"`
}

func (pm *ProjectManager) groupsStateFilePath() string {
	return filepath.Join(pm.projectsDir, "projects.json")
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
	projectsDir := pm.projectsDir
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
	projectPath := filepath.Join(pm.projectsDir, projectDirName)

	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Join(projectPath, "scripts"), 0755); err != nil {
		return nil, err
	}

	project := &models.Project{
		ID:        projectID,
		Name:      name,
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

	coll := postman.NewCollection(name)
	if err := postman.SaveCollection(projectPath, coll); err != nil {
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
	newProjectPath := filepath.Join(pm.projectsDir, projectDirName)
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
	project.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(project, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(metaFile, data, 0644); err != nil {
		return nil, err
	}

	coll, err := postman.LoadCollection(newProjectPath)
	if err == nil {
		coll.Info.Name = newName
		_ = postman.SaveCollection(newProjectPath, coll)
	}

	return &project, nil
}

func (pm *ProjectManager) findProjectPathByID(id string) (string, error) {
	projectsDir := pm.projectsDir
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

// ProjectPathByID returns the on-disk directory for a project UUID.
func (pm *ProjectManager) ProjectPathByID(projectID string) (string, error) {
	return pm.findProjectPathByID(projectID)
}

func (pm *ProjectManager) GetProjectTree(projectID string) (*ProjectTree, error) {
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}

	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		if os.IsNotExist(err) {
			coll = postman.NewCollection(filepath.Base(projectPath))
			if saveErr := postman.SaveCollection(projectPath, coll); saveErr != nil {
				return nil, saveErr
			}
		} else {
			return nil, err
		}
	}

	displayName := filepath.Base(projectPath)
	metaFile := filepath.Join(projectPath, "meta.json")
	if metaData, readErr := os.ReadFile(metaFile); readErr == nil {
		var project models.Project
		if json.Unmarshal(metaData, &project) == nil && project.Name != "" {
			displayName = project.Name
		}
	}

	tree := &ProjectTree{
		ID:       projectID,
		Name:     displayName,
		Type:     "project",
		Path:     projectPath,
		Children: pm.collectionItemsToTree(projectID, coll.Item),
	}

	return tree, nil
}

func (pm *ProjectManager) collectionItemsToTree(projectID string, items []postman.CollectionItem) []*ProjectTree {
	var out []*ProjectTree
	for i := range items {
		it := &items[i]
		if it.Request != nil {
			m := strings.ToUpper(strings.TrimSpace(it.Request.Method))
			if m == "" {
				m = "GET"
			}
			u := ""
			if it.Request.URL != nil {
				u = it.Request.URL.Raw
			}
			out = append(out, &ProjectTree{
				ID:       it.ID,
				Name:     it.Name,
				Type:     "request",
				Path:     postman.RequestRefPath(projectID, it.ID),
				Method:   m,
				URL:      u,
				Children: requestCaseTreeNodes(projectID, it.ID, it),
			})
			continue
		}
		out = append(out, &ProjectTree{
			ID:       it.ID,
			Name:     it.Name,
			Type:     "folder",
			Path:     postman.FolderRefPath(projectID, it.ID),
			Children: pm.collectionItemsToTree(projectID, it.Item),
		})
	}
	return out
}

func requestCaseTreeNodes(projectID, requestID string, it *postman.CollectionItem) []*ProjectTree {
	if len(it.ApimanCases) == 0 {
		return nil
	}
	list := it.ApimanCases
	out := make([]*ProjectTree, 0, len(list))
	for _, c := range list {
		nm := strings.TrimSpace(c.Name)
		if nm == "" {
			nm = "未命名"
		}
		out = append(out, &ProjectTree{
			ID:   c.ID,
			Name: nm,
			Type: "case",
			Path: postman.RequestCaseRefPath(projectID, requestID, c.ID),
		})
	}
	return out
}

func cloneHTTPRequestSpec(s models.HttpRequestSpec) models.HttpRequestSpec {
	b, err := json.Marshal(s)
	if err != nil {
		return s
	}
	var out models.HttpRequestSpec
	if err := json.Unmarshal(b, &out); err != nil {
		return s
	}
	return out
}

func activeCaseSpec(item *postman.CollectionItem, projectID string) models.HttpRequestSpec {
	if item == nil || item.Request == nil {
		return models.HttpRequestSpec{}
	}
	if len(item.ApimanCases) == 0 {
		cr := postman.ItemToCurlRequestModel(projectID, item)
		return models.SpecFromCurlRequest(cr)
	}
	aid := strings.TrimSpace(item.ApimanActiveCaseID)
	for _, c := range item.ApimanCases {
		if c.ID == aid {
			return cloneHTTPRequestSpec(c.Spec)
		}
	}
	return cloneHTTPRequestSpec(item.ApimanCases[0].Spec)
}

func findCaseIndex(cases []models.HttpRequestCase, caseID string) int {
	for i := range cases {
		if cases[i].ID == caseID {
			return i
		}
	}
	return -1
}

func resolveParentFolderID(projectPath, parentPath, projectID string) (string, error) {
	if postman.IsRootFolderParent(parentPath, projectPath) {
		return "", nil
	}
	pProj, fid, ok := postman.ParseFolderRef(parentPath)
	if !ok || pProj != projectID {
		return "", os.ErrInvalid
	}
	return fid, nil
}

func (pm *ProjectManager) CreateFolder(projectID, parentPath, name string) (*models.Folder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, os.ErrInvalid
	}

	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}

	parentID, err := resolveParentFolderID(projectPath, parentPath, projectID)
	if err != nil {
		return nil, err
	}

	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}

	if parentID != "" && postman.FindItemRef(coll.Item, parentID) == nil {
		return nil, errors.New("父文件夹不存在")
	}

	if folderNameExists(coll.Item, parentID, name, "") {
		return nil, errors.New("同级目录下已存在同名文件夹")
	}

	folderID := uuid.New().String()
	folder := postman.CollectionItem{
		ID:   folderID,
		Name: name,
		Item: []postman.CollectionItem{},
	}

	var ok bool
	coll.Item, ok = postman.InsertItemUnder(coll.Item, parentID, folder)
	if !ok {
		return nil, errors.New("父文件夹不存在")
	}

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        folderID,
		Name:      name,
		ProjectID: projectID,
		ParentID:  parentID,
		Path:      postman.FolderRefPath(projectID, folderID),
		CreatedAt: time.Now(),
	}, nil
}

func folderNameExists(items []postman.CollectionItem, parentID, name, excludeFolderID string) bool {
	if parentID == "" {
		for _, it := range items {
			if it.Request != nil {
				continue
			}
			if it.ID == excludeFolderID {
				continue
			}
			if it.Name == name {
				return true
			}
		}
		return false
	}
	for i := range items {
		if items[i].ID == parentID {
			return folderNameExists(items[i].Item, "", name, excludeFolderID)
		}
		if folderNameExists(items[i].Item, parentID, name, excludeFolderID) {
			return true
		}
	}
	return false
}

func (pm *ProjectManager) DeleteFolder(folderRefPath string) error {
	projectID, folderID, ok := postman.ParseFolderRef(folderRefPath)
	if !ok {
		return os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return err
	}
	next, removed := postman.DeleteItemByID(coll.Item, folderID)
	if !removed {
		return os.ErrNotExist
	}
	coll.Item = next
	return postman.SaveCollection(projectPath, coll)
}

func (pm *ProjectManager) CreateRequest(projectID, folderPath, name string, spec models.HttpRequestSpec) (*models.CurlRequest, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, os.ErrInvalid
	}

	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}

	parentID, err := resolveParentFolderID(projectPath, folderPath, projectID)
	if err != nil {
		return nil, err
	}

	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}

	if parentID != "" && postman.FindItemRef(coll.Item, parentID) == nil {
		return nil, errors.New("父文件夹不存在")
	}

	if requestNameExists(coll.Item, parentID, name, "") {
		return nil, errors.New("同级目录下已存在同名接口")
	}

	reqID := uuid.New().String()
	item := postman.NewRequestItemFromSpec(reqID, name, &spec)

	var ok bool
	coll.Item, ok = postman.InsertItemUnder(coll.Item, parentID, item)
	if !ok {
		return nil, errors.New("父文件夹不存在")
	}

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	created := postman.FindItemRef(coll.Item, reqID)
	now := time.Now()
	cr := postman.CurlRequestFromCollectionItem(projectID, created)
	cr.CreatedAt = now
	cr.UpdatedAt = now
	return cr, nil
}

// directParentFolderID returns the folder ID whose Item slice directly contains itemID, or "" if item is at collection root.
func directParentFolderID(items []postman.CollectionItem, itemID string) string {
	for i := range items {
		if items[i].ID == itemID {
			return ""
		}
		for j := range items[i].Item {
			if items[i].Item[j].ID == itemID {
				return items[i].ID
			}
		}
		if pid := directParentFolderID(items[i].Item, itemID); pid != "" {
			return pid
		}
	}
	return ""
}

func requestNameExists(items []postman.CollectionItem, parentID, name, excludeRequestID string) bool {
	if parentID == "" {
		for _, it := range items {
			if it.Request == nil {
				continue
			}
			if it.ID == excludeRequestID {
				continue
			}
			if it.Name == name {
				return true
			}
		}
		return false
	}
	for i := range items {
		if items[i].ID == parentID {
			return requestNameExists(items[i].Item, "", name, excludeRequestID)
		}
		if requestNameExists(items[i].Item, parentID, name, excludeRequestID) {
			return true
		}
	}
	return false
}

func (pm *ProjectManager) UpdateRequest(requestPath string, spec models.HttpRequestSpec, cases []models.HttpRequestCase, activeCaseID string) error {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return os.ErrNotExist
	}
	if cases == nil || len(cases) == 0 {
		pre, post := item.PreScripts, item.PostScripts
		item.ApimanCases = nil
		item.ApimanActiveCaseID = ""
		postman.ApplyHTTPRequestSpecToItem(item, &spec)
		item.PreScripts, item.PostScripts = pre, post
		return postman.SaveCollection(projectPath, coll)
	}
	activeCaseID = strings.TrimSpace(activeCaseID)

	pre, post := item.PreScripts, item.PostScripts
	postman.ApplyHTTPRequestSpecToItem(item, &spec)
	item.ApimanCases = postman.CloneHttpRequestCases(cases)
	item.ApimanActiveCaseID = activeCaseID
	item.PreScripts, item.PostScripts = pre, post
	return postman.SaveCollection(projectPath, coll)
}

func (pm *ProjectManager) AddRequestCase(requestPath, caseName string) (*models.CurlRequest, error) {
	caseName = strings.TrimSpace(caseName)
	if caseName == "" {
		return nil, errors.New("用例名称不能为空")
	}
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return nil, os.ErrNotExist
	}
	pre, postScr := item.PreScripts, item.PostScripts
	specDup := cloneHTTPRequestSpec(activeCaseSpec(item, projectID))
	var cases []models.HttpRequestCase
	var newActive string
	if len(item.ApimanCases) == 0 {
		newActive = uuid.New().String()
		cases = []models.HttpRequestCase{{ID: newActive, Name: caseName, Spec: specDup}}
	} else {
		cases = postman.CloneHttpRequestCases(item.ApimanCases)
		newActive = uuid.New().String()
		cases = append(cases, models.HttpRequestCase{
			ID:   newActive,
			Name: caseName,
			Spec: specDup,
		})
	}
	item.ApimanCases = cases
	item.ApimanActiveCaseID = newActive
	item.PreScripts, item.PostScripts = pre, postScr
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}
	return postman.CurlRequestFromCollectionItem(projectID, postman.FindItemRef(coll.Item, requestID)), nil
}

func (pm *ProjectManager) DuplicateRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return nil, os.ErrNotExist
	}
	cases := postman.CloneHttpRequestCases(item.ApimanCases)
	if len(cases) == 0 {
		return nil, errors.New("该接口没有用例")
	}
	idx := findCaseIndex(cases, caseID)
	if idx < 0 {
		return nil, os.ErrNotExist
	}
	pre, postScr := item.PreScripts, item.PostScripts
	newID := uuid.New().String()
	baseName := strings.TrimSpace(cases[idx].Name)
	dupName := baseName + " 副本"
	if baseName == "" {
		dupName = "未命名 副本"
	}
	cases = append(cases, models.HttpRequestCase{
		ID:   newID,
		Name: dupName,
		Spec: cloneHTTPRequestSpec(cases[idx].Spec),
	})
	item.ApimanCases = cases
	item.ApimanActiveCaseID = newID
	item.PreScripts, item.PostScripts = pre, postScr
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}
	return postman.CurlRequestFromCollectionItem(projectID, postman.FindItemRef(coll.Item, requestID)), nil
}

func (pm *ProjectManager) DeleteRequestCase(requestPath, caseID string) (*models.CurlRequest, error) {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return nil, os.ErrNotExist
	}
	cases := postman.CloneHttpRequestCases(item.ApimanCases)
	if len(cases) == 0 {
		return nil, os.ErrNotExist
	}
	idx := findCaseIndex(cases, caseID)
	if idx < 0 {
		return nil, os.ErrNotExist
	}
	pre, postScr := item.PreScripts, item.PostScripts
	cases = append(cases[:idx], cases[idx+1:]...)
	item.ApimanCases = cases
	if len(cases) == 0 {
		item.ApimanActiveCaseID = ""
	} else {
		if item.ApimanActiveCaseID == caseID || findCaseIndex(cases, item.ApimanActiveCaseID) < 0 {
			item.ApimanActiveCaseID = cases[0].ID
		}
	}
	item.PreScripts, item.PostScripts = pre, postScr
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}
	return postman.CurlRequestFromCollectionItem(projectID, postman.FindItemRef(coll.Item, requestID)), nil
}

func (pm *ProjectManager) RenameRequestCase(requestPath, caseID, newName string) (*models.CurlRequest, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		newName = "未命名"
	}
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return nil, os.ErrNotExist
	}
	cases := postman.CloneHttpRequestCases(item.ApimanCases)
	idx := findCaseIndex(cases, caseID)
	if idx < 0 {
		return nil, os.ErrNotExist
	}
	cases[idx].Name = newName
	item.ApimanCases = cases
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}
	return postman.CurlRequestFromCollectionItem(projectID, postman.FindItemRef(coll.Item, requestID)), nil
}

func (pm *ProjectManager) UpdateRequestScripts(requestPath string, preScripts, postScripts []string) error {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil {
		return os.ErrNotExist
	}
	item.PreScripts = preScripts
	item.PostScripts = postScripts
	return postman.SaveCollection(projectPath, coll)
}

func (pm *ProjectManager) DeleteRequest(requestPath string) error {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return err
	}
	next, ok := postman.DeleteItemByID(coll.Item, requestID)
	if !ok {
		return os.ErrNotExist
	}
	coll.Item = next
	return postman.SaveCollection(projectPath, coll)
}

func (pm *ProjectManager) GetRequest(requestPath string) (*models.CurlRequest, error) {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}
	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil {
		return nil, os.ErrNotExist
	}
	return postman.CurlRequestFromCollectionItem(projectID, item), nil
}

func (pm *ProjectManager) CopyRequest(requestPath string) (*models.CurlRequest, error) {
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}

	orig := postman.FindItemRef(coll.Item, requestID)
	if orig == nil || orig.Request == nil {
		return nil, os.ErrNotExist
	}

	parentID, ok := parentFolderIDOfRequest(coll.Item, requestID)
	if !ok {
		return nil, os.ErrNotExist
	}

	baseCopyName := orig.Name + "-副本"
	copyName := nextAvailableCopyName(coll.Item, parentID, baseCopyName)

	newID := uuid.New().String()

	clone := *orig
	clone.ID = newID
	clone.Name = copyName
	clone.ApimanCases = postman.CloneHttpRequestCases(orig.ApimanCases)
	clone.ApimanActiveCaseID = orig.ApimanActiveCaseID

	var inserted bool
	coll.Item, inserted = postman.InsertItemUnder(coll.Item, parentID, clone)
	if !inserted {
		return nil, errors.New("无法插入副本")
	}

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	now := time.Now()
	cr := postman.CurlRequestFromCollectionItem(projectID, postman.FindItemRef(coll.Item, newID))
	cr.CreatedAt = now
	cr.UpdatedAt = now
	return cr, nil
}

func parentFolderIDOfRequest(items []postman.CollectionItem, requestID string) (parentID string, ok bool) {
	for _, it := range items {
		if it.ID == requestID && it.Request != nil {
			return "", true
		}
	}
	for _, it := range items {
		for _, ch := range it.Item {
			if ch.ID == requestID && ch.Request != nil {
				return it.ID, true
			}
		}
		if pid, ok2 := parentFolderIDOfRequest(it.Item, requestID); ok2 {
			return pid, ok2
		}
	}
	return "", false
}

func nextAvailableCopyName(items []postman.CollectionItem, parentID, base string) string {
	names := collectRequestDisplayNames(items, parentID)
	copyName := base
	for i := 2; ; i++ {
		if _, exists := names[copyName]; !exists {
			return copyName
		}
		copyName = base + strconv.Itoa(i)
	}
}

func collectRequestDisplayNames(items []postman.CollectionItem, parentID string) map[string]struct{} {
	names := make(map[string]struct{})
	if parentID == "" {
		for _, it := range items {
			if it.Request != nil {
				names[it.Name] = struct{}{}
			}
		}
		return names
	}
	for i := range items {
		if items[i].ID == parentID {
			return collectRequestDisplayNames(items[i].Item, "")
		}
		if sub := collectRequestDisplayNamesNested(items[i].Item, parentID); len(sub) > 0 {
			return sub
		}
	}
	return names
}

func collectRequestDisplayNamesNested(items []postman.CollectionItem, parentID string) map[string]struct{} {
	for i := range items {
		if items[i].ID == parentID {
			return collectRequestDisplayNames(items[i].Item, "")
		}
		if sub := collectRequestDisplayNamesNested(items[i].Item, parentID); len(sub) > 0 {
			return sub
		}
	}
	return nil
}

func (pm *ProjectManager) RenameRequest(requestPath, newName string) (*models.CurlRequest, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, os.ErrInvalid
	}

	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}

	item := postman.FindItemRef(coll.Item, requestID)
	if item == nil || item.Request == nil {
		return nil, os.ErrNotExist
	}

	parentID, _ := parentFolderIDOfRequest(coll.Item, requestID)
	if requestNameExists(coll.Item, parentID, newName, requestID) {
		return nil, errors.New("同级目录下已存在同名接口")
	}

	item.Name = newName
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	cr := postman.CurlRequestFromCollectionItem(projectID, item)
	cr.UpdatedAt = time.Now()
	return cr, nil
}

func (pm *ProjectManager) RenameFolder(folderRefPath, newName string) (*models.Folder, error) {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, os.ErrInvalid
	}

	projectID, folderID, ok := postman.ParseFolderRef(folderRefPath)
	if !ok {
		return nil, os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return nil, err
	}

	item := postman.FindItemRef(coll.Item, folderID)
	if item == nil || item.Request != nil {
		return nil, os.ErrNotExist
	}

	parentID := parentFolderIDOfFolder(coll.Item, folderID)
	if folderNameExists(coll.Item, parentID, newName, folderID) {
		return nil, errors.New("同级目录下已存在同名文件夹")
	}

	item.Name = newName
	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	return &models.Folder{
		ID:        folderID,
		Name:      newName,
		ProjectID: projectID,
		ParentID:  parentID,
		Path:      postman.FolderRefPath(projectID, folderID),
		CreatedAt: time.Now(),
	}, nil
}

func parentFolderIDOfFolder(items []postman.CollectionItem, folderID string) string {
	for i := range items {
		for _, ch := range items[i].Item {
			if ch.ID == folderID && ch.Request == nil {
				return items[i].ID
			}
		}
		if p := parentFolderIDOfFolder(items[i].Item, folderID); p != "" {
			return p
		}
	}
	for i := range items {
		if items[i].ID == folderID && items[i].Request == nil {
			return ""
		}
	}
	return ""
}

func (pm *ProjectManager) MoveRequest(requestPath, targetFolderPath string, beforeID string) (string, error) {
	beforeID = strings.TrimSpace(beforeID)
	projectID, requestID, ok := postman.ParseRequestRef(requestPath)
	if !ok {
		return "", os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return "", err
	}
	targetParentID, err := resolveParentFolderID(projectPath, targetFolderPath, projectID)
	if err != nil {
		return "", err
	}

	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return "", err
	}

	if targetParentID != "" && postman.FindItemRef(coll.Item, targetParentID) == nil {
		return "", errors.New("目标文件夹不存在")
	}

	src := postman.FindItemRef(coll.Item, requestID)
	if src == nil || src.Request == nil {
		return "", os.ErrNotExist
	}

	srcParent := directParentFolderID(coll.Item, requestID)
	if srcParent != targetParentID {
		if requestNameExists(coll.Item, targetParentID, src.Name, requestID) {
			return "", errors.New("目标文件夹中已存在同名接口")
		}
	}

	if beforeID == requestID {
		beforeID = ""
	}

	next, moved, ok := postman.ExtractItem(coll.Item, requestID)
	if !ok || moved.Request == nil {
		return "", os.ErrNotExist
	}
	coll.Item = next

	var inserted bool
	coll.Item, inserted = postman.InsertItemUnderBefore(coll.Item, targetParentID, moved, beforeID)
	if !inserted {
		return "", errors.New("移动失败")
	}

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return "", err
	}
	return requestPath, nil
}

func (pm *ProjectManager) MoveFolder(folderRefPath, targetParentPath string, beforeID string) (string, error) {
	beforeID = strings.TrimSpace(beforeID)
	projectID, folderID, ok := postman.ParseFolderRef(folderRefPath)
	if !ok {
		return "", os.ErrInvalid
	}
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return "", err
	}
	targetParentID, err := resolveParentFolderID(projectPath, targetParentPath, projectID)
	if err != nil {
		return "", err
	}

	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return "", err
	}

	if folderID == targetParentID {
		return "", errors.New("不能移动到自身")
	}

	if targetParentID != "" {
		if postman.FolderSubtreeContainsID(coll.Item, folderID, targetParentID) {
			return "", errors.New("不能移动到自身或子文件夹中")
		}
		if postman.FindItemRef(coll.Item, targetParentID) == nil {
			return "", errors.New("目标位置不存在")
		}
	}

	item := postman.FindItemRef(coll.Item, folderID)
	if item == nil || item.Request != nil {
		return "", os.ErrNotExist
	}

	srcParent := directParentFolderID(coll.Item, folderID)
	if srcParent != targetParentID {
		if folderNameExists(coll.Item, targetParentID, item.Name, folderID) {
			return "", errors.New("目标位置已存在同名文件夹")
		}
	}

	if beforeID == folderID {
		beforeID = ""
	}

	next, moved, ok := postman.ExtractItem(coll.Item, folderID)
	if !ok {
		return "", os.ErrNotExist
	}
	coll.Item = next

	var inserted bool
	coll.Item, inserted = postman.InsertItemUnderBefore(coll.Item, targetParentID, moved, beforeID)
	if !inserted {
		return "", errors.New("移动失败")
	}

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return "", err
	}
	return folderRefPath, nil
}

func (pm *ProjectManager) ListProjectScripts(projectID string) ([]models.ProjectScript, error) {
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	scriptsDir := filepath.Join(projectPath, "scripts")
	if err := os.MkdirAll(scriptsDir, 0755); err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(scriptsDir)
	if err != nil {
		return nil, err
	}

	scripts := make([]models.ProjectScript, 0)
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".meta" {
			continue
		}
		metaPath := filepath.Join(scriptsDir, entry.Name())
		meta, err := loadScriptMeta(metaPath)
		if err != nil || meta.ID == "" {
			continue
		}
		scriptPath := filepath.Join(scriptsDir, buildSlugUUIDName(meta.Name, meta.ID)+".js")
		scriptContent, _ := os.ReadFile(scriptPath)
		scripts = append(scripts, models.ProjectScript{
			ID:          meta.ID,
			ProjectID:   projectID,
			Name:        meta.Name,
			Description: meta.Description,
			Path:        scriptPath,
			Content:     string(scriptContent),
			CreatedAt:   meta.CreatedAt,
			UpdatedAt:   meta.UpdatedAt,
		})
	}
	sort.Slice(scripts, func(i, j int) bool { return scripts[i].UpdatedAt.After(scripts[j].UpdatedAt) })
	return scripts, nil
}

func (pm *ProjectManager) CreateProjectScript(projectID, name, description, content string) (*models.ProjectScript, error) {
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, os.ErrInvalid
	}
	scriptsDir := filepath.Join(projectPath, "scripts")
	if err := os.MkdirAll(scriptsDir, 0755); err != nil {
		return nil, err
	}
	scriptID := uuid.New().String()
	now := time.Now()
	scriptPath := filepath.Join(scriptsDir, buildSlugUUIDName(name, scriptID)+".js")
	if err := os.WriteFile(scriptPath, []byte(content), 0644); err != nil {
		return nil, err
	}
	meta := &scriptMeta{
		ID:          scriptID,
		Name:        name,
		Description: description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := saveScriptMeta(filepath.Join(scriptsDir, scriptID+".meta"), meta); err != nil {
		return nil, err
	}
	return &models.ProjectScript{
		ID:          scriptID,
		ProjectID:   projectID,
		Name:        name,
		Description: description,
		Path:        scriptPath,
		Content:     content,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (pm *ProjectManager) UpdateProjectScript(projectID, scriptID, name, description, content string) (*models.ProjectScript, error) {
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return nil, err
	}
	scriptsDir := filepath.Join(projectPath, "scripts")
	metaPath := filepath.Join(scriptsDir, scriptID+".meta")
	meta, err := loadScriptMeta(metaPath)
	if err != nil {
		return nil, err
	}
	oldName := meta.Name
	if strings.TrimSpace(name) != "" {
		meta.Name = strings.TrimSpace(name)
	}
	meta.Description = description
	oldPath := filepath.Join(scriptsDir, buildSlugUUIDName(oldName, meta.ID)+".js")
	if _, statErr := os.Stat(oldPath); statErr != nil {
		oldPath = filepath.Join(scriptsDir, meta.ID+".js")
	}
	meta.UpdatedAt = time.Now()
	newPath := filepath.Join(scriptsDir, buildSlugUUIDName(meta.Name, meta.ID)+".js")
	if oldPath != newPath {
		_ = os.Rename(oldPath, newPath)
	}
	if err := os.WriteFile(newPath, []byte(content), 0644); err != nil {
		return nil, err
	}
	if err := saveScriptMeta(metaPath, meta); err != nil {
		return nil, err
	}
	return &models.ProjectScript{
		ID:          meta.ID,
		ProjectID:   projectID,
		Name:        meta.Name,
		Description: meta.Description,
		Path:        newPath,
		Content:     content,
		CreatedAt:   meta.CreatedAt,
		UpdatedAt:   meta.UpdatedAt,
	}, nil
}

func (pm *ProjectManager) DeleteProjectScript(projectID, scriptID string) error {
	projectPath, err := pm.findProjectPathByID(projectID)
	if err != nil {
		return err
	}
	scriptsDir := filepath.Join(projectPath, "scripts")
	metaPath := filepath.Join(scriptsDir, scriptID+".meta")
	meta, _ := loadScriptMeta(metaPath)
	if meta != nil && meta.Name != "" {
		_ = os.Remove(filepath.Join(scriptsDir, buildSlugUUIDName(meta.Name, meta.ID)+".js"))
	}
	_ = os.Remove(filepath.Join(scriptsDir, scriptID+".js"))
	_ = os.Remove(metaPath)
	return pm.clearScriptBindingsInProject(projectPath, scriptID)
}

func (pm *ProjectManager) clearScriptBindingsInProject(projectPath, scriptID string) error {
	coll, err := postman.LoadCollection(projectPath)
	if err != nil {
		return err
	}
	changed := clearScriptBindingsWalk(&coll.Item, scriptID)
	if !changed {
		return nil
	}
	return postman.SaveCollection(projectPath, coll)
}

func clearScriptBindingsWalk(items *[]postman.CollectionItem, scriptID string) bool {
	changed := false
	for i := range *items {
		it := &(*items)[i]
		if it.PreScripts != nil {
			newPre := make([]string, 0, len(it.PreScripts))
			for _, sid := range it.PreScripts {
				if sid != scriptID {
					newPre = append(newPre, sid)
				} else {
					changed = true
				}
			}
			it.PreScripts = newPre
		}
		if it.PostScripts != nil {
			newPost := make([]string, 0, len(it.PostScripts))
			for _, sid := range it.PostScripts {
				if sid != scriptID {
					newPost = append(newPost, sid)
				} else {
					changed = true
				}
			}
			it.PostScripts = newPost
		}
		if clearScriptBindingsWalk(&it.Item, scriptID) {
			changed = true
		}
	}
	return changed
}

func loadScriptMeta(metaPath string) (*scriptMeta, error) {
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, err
	}
	var meta scriptMeta
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func saveScriptMeta(metaPath string, meta *scriptMeta) error {
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(metaPath, data, 0644)
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
