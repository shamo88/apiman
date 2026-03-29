package postman

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type PostmanImporter struct {
	configManager *config.ConfigManager
}

func NewPostmanImporter(cfg *config.ConfigManager) *PostmanImporter {
	return &PostmanImporter{
		configManager: cfg,
	}
}

// JSON shapes for Postman Collection v2.x import (subset).
type importCollection struct {
	Info importCollectionInfo `json:"info"`
	Item []importItem         `json:"item"`
}

type importCollectionInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type importItem struct {
	Name    string       `json:"name"`
	Item    []importItem `json:"item,omitempty"`
	Request *importReq   `json:"request,omitempty"`
}

type importReq struct {
	Method string          `json:"method"`
	Header []importHdr     `json:"header"`
	URL    interface{}     `json:"url"`
	Body   *importBody    `json:"body"`
}

type importHdr struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type importBody struct {
	Mode       string           `json:"mode"`
	Raw        string           `json:"raw"`
	URLEncoded []importURLEnc   `json:"urlencoded"`
	FormData   []importFormData `json:"formdata"`
}

type importURLEnc struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled,omitempty"`
}

type importFormData struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled,omitempty"`
}

func (pi *PostmanImporter) ImportCollection(jsonData string) (*models.Project, error) {
	var raw importCollection
	if err := json.Unmarshal([]byte(jsonData), &raw); err != nil {
		return nil, err
	}

	projectName := raw.Info.Name
	if projectName == "" {
		projectName = "Imported from Postman"
	}
	projectName, err := pi.ensureUniqueProjectName(projectName)
	if err != nil {
		return nil, err
	}

	project, projectPath, err := pi.createProject(projectName)
	if err != nil {
		return nil, err
	}

	coll := NewCollection(projectName)
	coll.Info.Name = raw.Info.Name
	if raw.Info.Description != "" {
		coll.Info.Description = raw.Info.Description
	}
	coll.Item = convertImportItems(raw.Item)

	if err := SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	return project, nil
}

func convertImportItems(items []importItem) []CollectionItem {
	out := make([]CollectionItem, 0, len(items))
	for _, it := range items {
		out = append(out, convertImportItem(it))
	}
	return out
}

func convertImportItem(it importItem) CollectionItem {
	id := uuid.New().String()
	if it.Request != nil {
		return CollectionItem{
			ID:      id,
			Name:    it.Name,
			Request: convertImportRequest(it.Request),
		}
	}
	children := make([]CollectionItem, 0, len(it.Item))
	for _, ch := range it.Item {
		children = append(children, convertImportItem(ch))
	}
	return CollectionItem{
		ID:   id,
		Name: it.Name,
		Item: children,
	}
}

func convertImportRequest(req *importReq) *CollectionRequest {
	cr := &CollectionRequest{
		Method: strings.ToUpper(strings.TrimSpace(req.Method)),
		URL: &PostmanURL{
			Raw: extractImportURL(req.URL),
		},
	}
	if cr.Method == "" {
		cr.Method = "GET"
	}

	// 提取URL对象中的query参数
	if urlObj, ok := req.URL.(map[string]interface{}); ok {
		if queryArr, ok := urlObj["query"].([]interface{}); ok {
			for _, q := range queryArr {
				if qMap, ok := q.(map[string]interface{}); ok {
					key, _ := qMap["key"].(string)
					value, _ := qMap["value"].(string)
					disabled, _ := qMap["disabled"].(bool)
					if strings.TrimSpace(key) != "" {
						cr.URL.Query = append(cr.URL.Query, PostmanQueryParam{
							Key:      key,
							Value:    value,
							Disabled: disabled,
						})
					}
				}
			}
		}
	}

	for _, h := range req.Header {
		if strings.TrimSpace(h.Key) == "" {
			continue
		}
		cr.Header = append(cr.Header, PostmanHeader{
			Key:   h.Key,
			Value: h.Value,
		})
	}
	if req.Body != nil {
		b := &PostmanBody{
			Mode: req.Body.Mode,
			Raw:  req.Body.Raw,
		}
		for _, p := range req.Body.URLEncoded {
			b.URLEncoded = append(b.URLEncoded, PostmanURLEncoded{
				Key:      p.Key,
				Value:    p.Value,
				Type:     "text",
				Disabled: p.Disabled,
			})
		}
		for _, f := range req.Body.FormData {
			b.FormData = append(b.FormData, PostmanFormData{
				Key:      f.Key,
				Value:    f.Value,
				Type:     "text",
				Disabled: f.Disabled,
			})
		}
		cr.Body = b
	}
	return cr
}

func extractImportURL(urlInterface interface{}) string {
	switch v := urlInterface.(type) {
	case string:
		return v
	case map[string]interface{}:
		if raw, ok := v["raw"].(string); ok {
			return raw
		}
	case map[string]string:
		if raw, ok := v["raw"]; ok {
			return raw
		}
	}
	return ""
}

func (pi *PostmanImporter) createProject(name string) (*models.Project, string, error) {
	projectID := uuid.New().String()
	projectDirName := buildSlugUUIDName(name, projectID)
	projectPath := filepath.Join(pi.configManager.GetProjectsDir(), projectDirName)

	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return nil, "", err
	}
	if err := os.MkdirAll(filepath.Join(projectPath, "scripts"), 0755); err != nil {
		return nil, "", err
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
		return nil, "", err
	}

	if err := os.WriteFile(metaFile, data, 0644); err != nil {
		return nil, "", err
	}

	return project, projectPath, nil
}

func (pi *PostmanImporter) ensureUniqueProjectName(baseName string) (string, error) {
	baseName = strings.TrimSpace(baseName)
	if baseName == "" {
		baseName = "Imported from Postman"
	}

	projects, err := pi.loadExistingProjectNames()
	if err != nil {
		return "", err
	}

	if _, exists := projects[baseName]; !exists {
		return baseName, nil
	}

	for i := 2; ; i++ {
		candidate := baseName + "-导入" + strconv.Itoa(i)
		if _, exists := projects[candidate]; !exists {
			return candidate, nil
		}
	}
}

func (pi *PostmanImporter) loadExistingProjectNames() (map[string]struct{}, error) {
	result := make(map[string]struct{})
	projectsDir := pi.configManager.GetProjectsDir()
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return result, nil
		}
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		metaFile := filepath.Join(projectsDir, entry.Name(), "meta.json")
		data, readErr := os.ReadFile(metaFile)
		if readErr != nil {
			continue
		}

		var project models.Project
		if json.Unmarshal(data, &project) != nil {
			continue
		}
		name := strings.TrimSpace(project.Name)
		if name != "" {
			result[name] = struct{}{}
		}
	}

	return result, nil
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
