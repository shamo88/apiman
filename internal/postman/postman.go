package postman

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

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

type PostmanCollection struct {
	Info PostmanInfo   `json:"info"`
	Item []PostmanItem `json:"item"`
}

type PostmanInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type PostmanItem struct {
	Name    string          `json:"name"`
	Item    []PostmanItem   `json:"item,omitempty"`
	Request *PostmanRequest `json:"request,omitempty"`
}

type PostmanRequest struct {
	Method string          `json:"method"`
	Header []PostmanHeader `json:"header"`
	URL    interface{}     `json:"url"`
	Body   *PostmanBody    `json:"body"`
}

type PostmanHeader struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type PostmanBody struct {
	Mode       string              `json:"mode"`
	Raw        string              `json:"raw"`
	URLEncoded []PostmanURLEncoded `json:"urlencoded"`
	FormData   []PostmanFormData   `json:"formdata"`
}

type PostmanURLEncoded struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type PostmanFormData struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (pi *PostmanImporter) ImportCollection(jsonData string) (*models.Project, error) {
	var collection PostmanCollection
	if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
		return nil, err
	}

	projectName := collection.Info.Name
	if projectName == "" {
		projectName = "Imported from Postman"
	}

	project, err := pi.createProject(projectName)
	if err != nil {
		return nil, err
	}

	if err := pi.processItems(collection.Item, project.Path); err != nil {
		return nil, err
	}

	return project, nil
}

func (pi *PostmanImporter) createProject(name string) (*models.Project, error) {
	projectID := uuid.New().String()
	projectPath := filepath.Join(pi.configManager.GetProjectsDir(), projectID)

	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return nil, err
	}

	project := &models.Project{
		ID:   projectID,
		Name: name,
		Path: projectPath,
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

func (pi *PostmanImporter) processItems(items []PostmanItem, parentPath string) error {
	for _, item := range items {
		if item.Request != nil {
			if err := pi.createRequest(parentPath, item.Name, item.Request); err != nil {
				continue
			}
		} else if len(item.Item) > 0 {
			folderPath := filepath.Join(parentPath, sanitizeFolderName(item.Name))
			if err := os.MkdirAll(folderPath, 0755); err != nil {
				continue
			}
			if err := pi.processItems(item.Item, folderPath); err != nil {
				continue
			}
		}
	}
	return nil
}

func (pi *PostmanImporter) createRequest(folderPath, name string, request *PostmanRequest) error {
	requestID := uuid.New().String()
	requestName := requestID + ".curl"
	requestPath := filepath.Join(folderPath, requestName)

	curlContent := pi.convertToCurl(request)
	if err := os.WriteFile(requestPath, []byte(curlContent), 0644); err != nil {
		return err
	}

	metaData := map[string]string{
		"id":   requestID,
		"name": name,
	}
	metaBytes, _ := json.Marshal(metaData)
	metaPath := filepath.Join(folderPath, requestID+".meta")
	return os.WriteFile(metaPath, metaBytes, 0644)
}

func (pi *PostmanImporter) convertToCurl(request *PostmanRequest) string {
	var curl strings.Builder
	curl.WriteString("curl ")

	if request.Method != "" && request.Method != "GET" {
		curl.WriteString("-X " + request.Method + " ")
	}

	if len(request.Header) > 0 {
		for _, h := range request.Header {
			curl.WriteString("-H \"" + h.Key + ": " + h.Value + "\" ")
		}
	}

	url := pi.extractURL(request.URL)
	curl.WriteString("\"" + url + "\"")

	if request.Body != nil {
		if request.Body.Mode == "raw" && request.Body.Raw != "" {
			curl.WriteString(" -d '" + request.Body.Raw + "'")
		} else if request.Body.Mode == "urlencoded" && len(request.Body.URLEncoded) > 0 {
			curl.WriteString(" -H \"Content-Type: application/x-www-form-urlencoded\"")
			var params []string
			for _, p := range request.Body.URLEncoded {
				params = append(params, p.Key+"="+p.Value)
			}
			curl.WriteString(" -d '" + strings.Join(params, "&") + "'")
		} else if request.Body.Mode == "formdata" && len(request.Body.FormData) > 0 {
			for _, f := range request.Body.FormData {
				curl.WriteString(" -F \"" + f.Key + "=" + f.Value + "\"")
			}
		}
	}

	return curl.String()
}

func (pi *PostmanImporter) extractURL(urlInterface interface{}) string {
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

func sanitizeFolderName(name string) string {
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
	)
	return replacer.Replace(name)
}
