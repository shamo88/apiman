package openapi

import (
	"apiman/internal/config"
	"apiman/internal/models"
	"apiman/internal/postman"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/google/uuid"
)

type OpenAPIImporter struct {
	configManager *config.ConfigManager
}

func NewOpenAPIImporter(cfg *config.ConfigManager) *OpenAPIImporter {
	return &OpenAPIImporter{
		configManager: cfg,
	}
}

type ParseResult struct {
	ProjectName string
	Items       []postman.CollectionItem
}

func (oi *OpenAPIImporter) ParseOpenAPICollection(jsonData string) (*ParseResult, error) {
	doc, err := openapi3.NewLoader().LoadFromData([]byte(jsonData))
	if err != nil {
		return nil, err
	}

	projectName := doc.Info.Title
	if projectName == "" {
		projectName = "Imported from OpenAPI"
	}

	items := oi.parsePaths(doc)

	return &ParseResult{
		ProjectName: projectName,
		Items:       items,
	}, nil
}

func (oi *OpenAPIImporter) parsePaths(doc *openapi3.T) []postman.CollectionItem {
	var items []postman.CollectionItem

	for path, pathItem := range doc.Paths.Map() {
		oi.processPathItem(path, pathItem, doc, &items)
	}

	return items
}

func (oi *OpenAPIImporter) processPathItem(path string, pathItem *openapi3.PathItem, doc *openapi3.T, items *[]postman.CollectionItem) {
	if pathItem == nil {
		return
	}

	operationsMap := pathItem.Operations()
	if len(operationsMap) == 0 {
		return
	}

	var firstTag string
	for _, op := range operationsMap {
		if len(op.Tags) > 0 {
			firstTag = op.Tags[0]
			break
		}
	}

	folderID := uuid.New().String()
	folderName := path
	if firstTag != "" {
		folderName = firstTag
	}

	folder := postman.CollectionItem{
		ID:   folderID,
		Name: folderName,
		Item: []postman.CollectionItem{},
	}

	for method, op := range operationsMap {
		if op == nil {
			continue
		}

		methodUpper := strings.ToUpper(method)

		itemName := op.Summary
		if itemName == "" {
			itemName = op.OperationID
		}
		if itemName == "" {
			itemName = methodUpper + " " + path
		}

		fullURL := oi.buildURL(doc, path)

		req := &postman.CollectionRequest{
			Method: methodUpper,
			URL: &postman.PostmanURL{
				Raw: fullURL,
			},
		}

		oi.parseParameters(op.Parameters, req)

		if reqBody := op.RequestBody; reqBody != nil {
			oi.parseRequestBody(reqBody, req)
		}

		item := postman.CollectionItem{
			ID:      uuid.New().String(),
			Name:    itemName,
			Request: req,
		}

		folder.Item = append(folder.Item, item)
	}

	if len(folder.Item) > 0 {
		*items = append(*items, folder)
	}
}

func (oi *OpenAPIImporter) buildURL(doc *openapi3.T, path string) string {
	baseURL := ""
	if doc.Servers != nil && len(doc.Servers) > 0 {
		server := doc.Servers[0]
		baseURL = server.URL
	}

	if baseURL == "" {
		baseURL = "https://api.example.com"
	}

	url := baseURL + path
	url = strings.ReplaceAll(url, "{", ":")
	url = strings.ReplaceAll(url, "}", "")

	return url
}

func (oi *OpenAPIImporter) parseParameters(params openapi3.Parameters, req *postman.CollectionRequest) {
	for _, param := range params {
		if param == nil || param.Value == nil {
			continue
		}

		p := param.Value
		header := postman.PostmanHeader{
			Key:   p.Name,
			Value: "",
		}

		switch p.In {
		case "query":
			if p.Schema != nil {
				header.Value = oi.getDefaultValue(p.Schema)
			}
			req.URL.Query = append(req.URL.Query, postman.PostmanQueryParam{
				Key:   p.Name,
				Value: header.Value,
			})
		case "header":
			if p.Schema != nil {
				header.Value = oi.getDefaultValue(p.Schema)
			}
			req.Header = append(req.Header, header)
		case "path":
			if p.Schema != nil {
				header.Value = oi.getDefaultValue(p.Schema)
			}
			req.URL.Raw = strings.Replace(req.URL.Raw, ":"+p.Name, header.Value, 1)
		}
	}
}

func (oi *OpenAPIImporter) getDefaultValue(schema *openapi3.SchemaRef) string {
	if schema == nil || schema.Value == nil {
		return ""
	}

	if schema.Value.Example != nil {
		return fmt.Sprintf("%v", schema.Value.Example)
	}

	if schema.Value.Default != nil {
		return fmt.Sprintf("%v", schema.Value.Default)
	}

	if schema.Value.Type != nil {
		if schema.Value.Type.Is("string") {
			if schema.Value.Enum != nil && len(schema.Value.Enum) > 0 {
				return fmt.Sprintf("%v", schema.Value.Enum[0])
			}
			return ""
		}
		if schema.Value.Type.Is("integer") || schema.Value.Type.Is("number") {
			return "0"
		}
		if schema.Value.Type.Is("boolean") {
			return "false"
		}
	}

	return ""
}

func (oi *OpenAPIImporter) parseRequestBody(reqBody *openapi3.RequestBodyRef, req *postman.CollectionRequest) {
	if reqBody == nil || reqBody.Value == nil {
		return
	}

	content := reqBody.Value.Content
	if content == nil {
		return
	}

	if mediaType := content.Get("application/json"); mediaType != nil {
		body := &postman.PostmanBody{
			Mode: "raw",
			Raw:  oi.generateJSONExample(mediaType.Schema),
		}
		req.Body = body
	} else if mediaType := content.Get("application/x-www-form-urlencoded"); mediaType != nil {
		body := &postman.PostmanBody{
			Mode: "urlencoded",
		}
		if mediaType.Schema != nil {
			oi.parseURLEncodedSchema(mediaType.Schema, body)
		}
		req.Body = body
	} else if mediaType := content.Get("multipart/form-data"); mediaType != nil {
		body := &postman.PostmanBody{
			Mode: "formdata",
		}
		if mediaType.Schema != nil {
			oi.parseFormDataSchema(mediaType.Schema, body)
		}
		req.Body = body
	} else {
		body := &postman.PostmanBody{
			Mode: "raw",
			Raw:  reqBody.Value.Description,
		}
		req.Body = body
	}
}

func (oi *OpenAPIImporter) generateJSONExample(schema *openapi3.SchemaRef) string {
	if schema == nil || schema.Value == nil {
		return "{}"
	}

	example := oi.buildSchemaExample(schema)
	data, err := json.MarshalIndent(example, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(data)
}

func (oi *OpenAPIImporter) buildSchemaExample(schema *openapi3.SchemaRef) interface{} {
	if schema == nil || schema.Value == nil {
		return nil
	}

	if schema.Value.Example != nil {
		return schema.Value.Example
	}

	if schema.Value.Type != nil {
		if schema.Value.Type.Is("object") {
			obj := make(map[string]interface{})
			for name, prop := range schema.Value.Properties {
				obj[name] = oi.buildSchemaExample(prop)
			}
			return obj
		}
		if schema.Value.Type.Is("array") {
			if len(schema.Value.AllOf) > 0 {
				return []interface{}{oi.buildSchemaExample(schema.Value.AllOf[0])}
			}
			if schema.Value.Items != nil {
				return []interface{}{oi.buildSchemaExample(schema.Value.Items)}
			}
			return []interface{}{}
		}
		if schema.Value.Type.Is("string") {
			if schema.Value.Enum != nil && len(schema.Value.Enum) > 0 {
				return fmt.Sprintf("%v", schema.Value.Enum[0])
			}
			return ""
		}
		if schema.Value.Type.Is("integer") || schema.Value.Type.Is("number") {
			return 0
		}
		if schema.Value.Type.Is("boolean") {
			return false
		}
	}

	return nil
}

func (oi *OpenAPIImporter) parseURLEncodedSchema(schema *openapi3.SchemaRef, body *postman.PostmanBody) {
	if schema == nil || schema.Value == nil {
		return
	}

	for name, prop := range schema.Value.Properties {
		body.URLEncoded = append(body.URLEncoded, postman.PostmanURLEncoded{
			Key:      name,
			Value:    oi.getDefaultValue(prop),
			Type:     "text",
			Disabled: false,
		})
	}
}

func (oi *OpenAPIImporter) parseFormDataSchema(schema *openapi3.SchemaRef, body *postman.PostmanBody) {
	if schema == nil || schema.Value == nil {
		return
	}

	for name, prop := range schema.Value.Properties {
		body.FormData = append(body.FormData, postman.PostmanFormData{
			Key:      name,
			Value:    oi.getDefaultValue(prop),
			Type:     "text",
			Disabled: false,
		})
	}
}

func (oi *OpenAPIImporter) ImportOpenAPICollection(jsonData string) (*models.Project, error) {
	parseResult, err := oi.ParseOpenAPICollection(jsonData)
	if err != nil {
		return nil, err
	}

	projectName := parseResult.ProjectName
	projectName = oi.EnsureUniqueProjectName(projectName)

	project, projectPath, err := oi.createProject(projectName)
	if err != nil {
		return nil, err
	}

	coll := postman.NewCollection(projectName)
	coll.Item = parseResult.Items

	if err := postman.SaveCollection(projectPath, coll); err != nil {
		return nil, err
	}

	return project, nil
}

func (oi *OpenAPIImporter) createProject(name string) (*models.Project, string, error) {
	projectID := uuid.New().String()
	projectDirName := buildSlugUUIDName(name, projectID)
	projectPath := filepath.Join(oi.configManager.GetProjectsDir(), projectDirName)

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

func (oi *OpenAPIImporter) EnsureUniqueProjectName(baseName string) string {
	baseName = strings.TrimSpace(baseName)
	if baseName == "" {
		baseName = "Imported from OpenAPI"
	}

	projects, err := oi.loadExistingProjectNames()
	if err != nil {
		return baseName
	}

	if _, exists := projects[baseName]; !exists {
		return baseName
	}

	for i := 2; ; i++ {
		candidate := baseName + "-导入" + strconv.Itoa(i)
		if _, exists := projects[candidate]; !exists {
			return candidate
		}
	}
}

func (oi *OpenAPIImporter) loadExistingProjectNames() (map[string]struct{}, error) {
	result := make(map[string]struct{})
	projectsDir := oi.configManager.GetWorkDir()
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
