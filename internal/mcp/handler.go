package mcp

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
)

// Handler handles MCP tool calls.
type Handler struct {
	svc           *service.Service
	projectID     string
	environmentID string
}

// NewHandler creates a new MCP handler.
func NewHandler(svc *service.Service, projectID, environmentID string) *Handler {
	return &Handler{
		svc:           svc,
		projectID:     projectID,
		environmentID: environmentID,
	}
}

// HandleToolCall handles a single tool call.
func (h *Handler) HandleToolCall(call MCPToolCall) (*MCPToolResult, error) {
	switch call.Name {
	case "mcp_list_apis":
		return h.listAPIs()
	case "mcp_list_scripts":
		return h.listScripts()
	case "mcp_get_request":
		path, _ := call.Arguments["path"].(string)
		return h.getRequest(path)
	case "mcp_create_case":
		path, _ := call.Arguments["path"].(string)
		caseData, _ := call.Arguments["case_data"].(map[string]any)
		return h.createCase(path, caseData)
	case "mcp_update_case":
		path, _ := call.Arguments["path"].(string)
		caseID, _ := call.Arguments["case_id"].(string)
		caseData, _ := call.Arguments["case_data"].(map[string]any)
		return h.updateCase(path, caseID, caseData)
	case "mcp_create_request":
		parentID, _ := call.Arguments["parent_id"].(string)
		spec, _ := call.Arguments["spec"].(map[string]any)
		return h.createRequest(parentID, spec)
	case "mcp_create_folder":
		parentID, _ := call.Arguments["parent_id"].(string)
		name, _ := call.Arguments["name"].(string)
		return h.createFolder(parentID, name)
	case "mcp_execute_request":
		path, _ := call.Arguments["path"].(string)
		caseID, _ := call.Arguments["case_id"].(string)
		preScriptIDs := parseStringArray(call.Arguments["pre_script_ids"])
		postScriptIDs := parseStringArray(call.Arguments["post_script_ids"])
		return h.executeRequest(path, caseID, preScriptIDs, postScriptIDs)
	case "mcp_execute_raw":
		spec := call.Arguments
		preScriptIDs := parseStringArray(call.Arguments["pre_script_ids"])
		postScriptIDs := parseStringArray(call.Arguments["post_script_ids"])
		return h.executeRaw(spec, preScriptIDs, postScriptIDs)
	default:
		return nil, fmt.Errorf("unknown tool: %s", call.Name)
	}
}

// listAPIs returns all APIs in the project.
func (h *Handler) listAPIs() (*MCPToolResult, error) {
	if h.projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "{}"}},
		}, nil
	}

	tree, err := h.svc.GetProjectTree(h.projectID)
	if err != nil {
		return nil, err
	}

	// Separate folders and requests from the tree
	folders := flattenFolders(tree.Children)
	requests := flattenRequests(tree.Children)

	resp := MCPListAPIsResponse{
		Folders:  folders,
		Requests: requests,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

func flattenFolders(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		if child.Type == "folder" || child.Type == "project" {
			info := &models.MCPAPIInfo{
				ID:   child.ID,
				Name: child.Name,
				Path: child.Path,
			}
			if len(child.Children) > 0 {
				info.Children = flattenChildren(child.Children)
			}
			result = append(result, info)
		}
	}
	return result
}

func flattenRequests(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		if child.Type == "request" {
			info := &models.MCPAPIInfo{
				ID:     child.ID,
				Name:   child.Name,
				Method: child.Method,
				URL:    child.URL,
				Path:   child.Path,
			}
			if len(child.Children) > 0 {
				info.Children = flattenCaseChildren(child.Children)
			}
			result = append(result, info)
		}
	}
	return result
}

func flattenChildren(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		info := &models.MCPAPIInfo{
			ID:   child.ID,
			Name: child.Name,
			Path: child.Path,
		}
		if child.Type == "request" {
			info.Method = child.Method
			info.URL = child.URL
			if len(child.Children) > 0 {
				info.Children = flattenCaseChildren(child.Children)
			}
		} else if len(child.Children) > 0 {
			info.Children = flattenChildren(child.Children)
		}
		result = append(result, info)
	}
	return result
}

func flattenCaseChildren(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		info := &models.MCPAPIInfo{
			ID:   child.ID,
			Name: child.Name,
			Path: child.Path,
		}
		result = append(result, info)
	}
	return result
}

// listScripts returns all scripts in the project.
func (h *Handler) listScripts() (*MCPToolResult, error) {
	if h.projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "[]"}},
		}, nil
	}

	scripts, err := h.svc.ListProjectScripts(h.projectID)
	if err != nil {
		return nil, err
	}

	// Only return id, name, description
	result := make([]models.MCPScriptInfo, len(scripts))
	for i, s := range scripts {
		result[i] = models.MCPScriptInfo{
			ID:          s.ID,
			Name:        s.Name,
			Description: s.Description,
		}
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// getRequest returns detailed information about a request.
func (h *Handler) getRequest(path string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	// Parse path: request|project-id|request-id
	parts := strings.Split(path, "|")
	if len(parts) != 3 || parts[0] != "request" {
		return nil, fmt.Errorf("invalid path format: %s", path)
	}

	projectID := parts[1]

	// Security check: verify projectID matches bound project
	if h.projectID != "" && projectID != h.projectID {
		return nil, fmt.Errorf("project ID mismatch: requested %s but bound to %s", projectID, h.projectID)
	}

	curlReq, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Use InterfaceSpec for original request data if available, otherwise use curlReq fields
	var method, url, body, bodyType string
	var headers []models.RequestKeyVal
	var params []models.RequestKeyVal
	if curlReq.InterfaceSpec != nil {
		method = curlReq.InterfaceSpec.Method
		url = curlReq.InterfaceSpec.HttpURL
		headers = curlReq.InterfaceSpec.Headers
		params = curlReq.InterfaceSpec.Params
		body = curlReq.InterfaceSpec.Body
		bodyType = curlReq.InterfaceSpec.BodyType
	} else {
		method = curlReq.Method
		url = curlReq.HttpURL
		headers = curlReq.Headers
		params = curlReq.Params
		body = curlReq.Body
		bodyType = curlReq.BodyType
	}

	detail := models.MCPRequestDetail{
		ID:          curlReq.ID,
		Name:        curlReq.Name,
		Method:      method,
		URL:         url,
		Headers:     headers,
		Params:      params,
		Body:        body,
		BodyType:    bodyType,
		PreScripts:  curlReq.PreScripts,
		PostScripts: curlReq.PostScripts,
		Cases:       curlReq.Cases,
	}

	data, err := json.Marshal(detail)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// createCase creates a new test case for a request.
func (h *Handler) createCase(path string, caseData map[string]any) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if caseData == nil {
		return nil, fmt.Errorf("case_data is required")
	}

	// Security check: verify projectID in path matches bound project
	if h.projectID != "" {
		parts := strings.Split(path, "|")
		if len(parts) != 3 || parts[0] != "request" {
			return nil, fmt.Errorf("invalid path format: %s", path)
		}
		if parts[1] != h.projectID {
			return nil, fmt.Errorf("project ID mismatch: requested %s but bound to %s", parts[1], h.projectID)
		}
	}

	caseName, _ := caseData["name"].(string)
	if caseName == "" {
		return nil, fmt.Errorf("case_name is required")
	}

	curlReq, err := h.svc.AddRequestCase(path, caseName)
	if err != nil {
		return nil, fmt.Errorf("failed to create case: %s", err)
	}

	// Find the new case ID from cases (it's the last one added)
	newCaseID := ""
	if len(curlReq.Cases) > 0 {
		newCaseID = curlReq.Cases[len(curlReq.Cases)-1].ID
	}

	// Return the new case info
	result := MCPCreateCaseResponse{
		ID:   newCaseID,
		Name: caseName,
	}

	// If spec is provided, update the case with that spec
	if specData, ok := caseData["spec"].(map[string]any); ok {
		spec := parseSpecFromMap(specData)
		if spec.Method != "" || spec.HttpURL != "" || spec.Body != "" {
			// Get the latest request to find the new case ID
			updatedReq, err := h.svc.GetRequest(path)
			if err != nil {
				return nil, fmt.Errorf("failed to get updated request: %s", err)
			}
			if len(updatedReq.Cases) > 0 {
				newCaseID := updatedReq.Cases[len(updatedReq.Cases)-1].ID
				// Update the case with the provided spec
				updatedCases := make([]models.HttpRequestCase, len(updatedReq.Cases))
				copy(updatedCases, updatedReq.Cases)
				for i, c := range updatedCases {
					if c.ID == newCaseID {
						updatedCases[i].Spec = spec
						break
					}
				}
				var interfaceSpec models.HttpRequestSpec
				if updatedReq.InterfaceSpec != nil {
					interfaceSpec = *updatedReq.InterfaceSpec
				}
				if err := h.svc.UpdateRequest(path, interfaceSpec, updatedCases, newCaseID); err != nil {
					return nil, fmt.Errorf("failed to update case spec: %s", err)
				}
			}
		}
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// executeRequest executes a saved request.
func (h *Handler) executeRequest(path, caseID string, preScriptIDs, postScriptIDs []string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	// Parse path to get project ID
	parts := strings.Split(path, "|")
	if len(parts) != 3 || parts[0] != "request" {
		return nil, fmt.Errorf("invalid path format: %s", path)
	}
	projectID := parts[1]

	// Security check: verify projectID matches bound project
	if h.projectID != "" && projectID != h.projectID {
		return nil, fmt.Errorf("project ID mismatch: requested %s but bound to %s", projectID, h.projectID)
	}

	// Get project name for history
	projectName, _ := h.svc.GetProjectName(projectID)

	// Get the request first
	curlReq, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Determine which spec to use
	var spec models.HttpRequestSpec
	if caseID != "" {
		// Use the specified case's spec
		for _, c := range curlReq.Cases {
			if c.ID == caseID {
				spec = c.Spec
				break
			}
		}
	} else {
		// Use interface's original spec (InterfaceSpec if available, otherwise the curlReq fields)
		if curlReq.InterfaceSpec != nil {
			spec = *curlReq.InterfaceSpec
		} else {
			spec = models.SpecFromCurlRequest(curlReq)
		}
	}

	// Execute with scripts
	resp, err := h.svc.ExecuteHTTPRequestWithScriptsWithSource(
		projectID,
		projectName,
		curlReq.Name,
		curlReq.Path,
		h.environmentID,
		spec,
		preScriptIDs,
		postScriptIDs,
		models.HistorySourceMCP,
		"mcp_execute_request",
	)
	if err != nil {
		return nil, fmt.Errorf("execution failed: %s", err)
	}

	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}

	isError := resp.Error != ""
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
		IsError: isError,
	}, nil
}

// executeRaw executes a raw HTTP request.
func (h *Handler) executeRaw(args map[string]interface{}, preScriptIDs, postScriptIDs []string) (*MCPToolResult, error) {
	method, _ := args["method"].(string)
	httpURL, _ := args["http_url"].(string)

	if method == "" || httpURL == "" {
		return nil, fmt.Errorf("method and http_url are required")
	}

	spec := parseSpecFromMap(args)

	// Get project name for history
	projectName, _ := h.svc.GetProjectName(h.projectID)

	var resp *models.CurlResponse
	var err error

	// Use ExecuteHTTPRequestWithScriptsWithSource if scripts are provided, otherwise use ExecuteHTTPRequest
	if len(preScriptIDs) > 0 || len(postScriptIDs) > 0 {
		resp, err = h.svc.ExecuteHTTPRequestWithScriptsWithSource(
			h.projectID,
			projectName,
			"raw_request",
			"",
			h.environmentID,
			spec,
			preScriptIDs,
			postScriptIDs,
			models.HistorySourceMCP,
			"mcp_execute_raw",
		)
	} else {
		resp, err = h.svc.ExecuteHTTPRequest(spec)
		// Record history for raw request without scripts
		if err == nil {
			if historyErr := h.svc.RecordHistoryWithSource(
				h.projectID,
				projectName,
				"raw_request",
				"",
				spec,
				resp,
				models.HistorySourceMCP,
				"mcp_execute_raw",
			); historyErr != nil {
				// Log but don't fail the request for history recording errors
				log.Printf("[MCP] Warning: failed to record history: %v", historyErr)
			}
		}
	}
	if err != nil {
		return nil, fmt.Errorf("execution failed: %s", err)
	}

	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}

	isError := resp.Error != ""
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
		IsError: isError,
	}, nil
}

func parseSpecFromMap(data map[string]any) models.HttpRequestSpec {
	spec := models.HttpRequestSpec{}

	if method, ok := data["method"].(string); ok {
		spec.Method = method
	}
	if url, ok := data["http_url"].(string); ok {
		spec.HttpURL = url
	}
	if body, ok := data["body"].(string); ok {
		spec.Body = body
	}
	if bodyType, ok := data["body_type"].(string); ok {
		spec.BodyType = bodyType
	}

	// Parse headers
	if headers, ok := data["headers"].([]any); ok {
		for _, h := range headers {
			if hm, ok := h.(map[string]any); ok {
				kv := models.RequestKeyVal{}
				if k, ok := hm["key"].(string); ok {
					kv.Key = k
				}
				if v, ok := hm["value"].(string); ok {
					kv.Value = v
				}
				if e, ok := hm["enabled"].(bool); ok {
					kv.Enabled = e
				} else {
					kv.Enabled = true
				}
				spec.Headers = append(spec.Headers, kv)
			}
		}
	}

	// Parse params
	if params, ok := data["params"].([]any); ok {
		for _, p := range params {
			if pm, ok := p.(map[string]any); ok {
				kv := models.RequestKeyVal{}
				if k, ok := pm["key"].(string); ok {
					kv.Key = k
				}
				if v, ok := pm["value"].(string); ok {
					kv.Value = v
				}
				if e, ok := pm["enabled"].(bool); ok {
					kv.Enabled = e
				} else {
					kv.Enabled = true
				}
				spec.Params = append(spec.Params, kv)
			}
		}
	}

	return spec
}

// parseStringArray parses a string array from interface{}.
func parseStringArray(v interface{}) []string {
	if v == nil {
		return nil
	}
	if arr, ok := v.([]any); ok {
		result := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	}
	return nil
}

// updateCase updates an existing test case for a request.
func (h *Handler) updateCase(path, caseID string, caseData map[string]any) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if caseID == "" {
		return nil, fmt.Errorf("case_id is required")
	}
	if caseData == nil {
		return nil, fmt.Errorf("case_data is required")
	}

	// Security check: verify projectID in path matches bound project
	if h.projectID != "" {
		parts := strings.Split(path, "|")
		if len(parts) != 3 || parts[0] != "request" {
			return nil, fmt.Errorf("invalid path format: %s", path)
		}
		if parts[1] != h.projectID {
			return nil, fmt.Errorf("project ID mismatch: requested %s but bound to %s", parts[1], h.projectID)
		}
	}

	// Get the current request
	curlReq, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Find and update the case
	found := false
	updatedCases := make([]models.HttpRequestCase, len(curlReq.Cases))
	copy(updatedCases, curlReq.Cases)

	for i, c := range updatedCases {
		if c.ID == caseID {
			found = true
			// Update name if provided
			if name, ok := caseData["name"].(string); ok && name != "" {
				updatedCases[i].Name = name
			}
			// Update spec if provided
			if specData, ok := caseData["spec"].(map[string]any); ok {
				spec := parseSpecFromMap(specData)
				updatedCases[i].Spec = spec
			}
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("case not found: %s", caseID)
	}

	// Determine active case ID
	activeCaseID := curlReq.Cases[0].ID
	if len(updatedCases) > 0 {
		activeCaseID = updatedCases[0].ID
	}

	// Get interface spec
	var interfaceSpec models.HttpRequestSpec
	if curlReq.InterfaceSpec != nil {
		interfaceSpec = *curlReq.InterfaceSpec
	}

	// Update the request with updated cases
	if err := h.svc.UpdateRequest(path, interfaceSpec, updatedCases, activeCaseID); err != nil {
		return nil, fmt.Errorf("failed to update case: %s", err)
	}

	// Find the updated case to return its info
	var updatedCaseName string
	for _, c := range updatedCases {
		if c.ID == caseID {
			updatedCaseName = c.Name
			break
		}
	}

	result := MCPUpdateCaseResponse{
		ID:   caseID,
		Name: updatedCaseName,
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// createRequest creates a new API request in the bound project.
func (h *Handler) createRequest(parentID string, specData map[string]any) (*MCPToolResult, error) {
	if h.projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}
	if specData == nil {
		return nil, fmt.Errorf("spec is required")
	}

	name, _ := specData["name"].(string)
	if name == "" {
		return nil, fmt.Errorf("request name is required")
	}

	method, _ := specData["method"].(string)
	if method == "" {
		method = "GET"
	}

	httpURL, _ := specData["http_url"].(string)
	if httpURL == "" {
		return nil, fmt.Errorf("http_url is required")
	}

	// Parse the spec
	spec := parseSpecFromMap(specData)
	spec.Method = method
	spec.HttpURL = httpURL

	// Determine parent path
	parentPath := ""
	if parentID != "" {
		// Get folder info to build path
		parentPath = "folder|" + h.projectID + "|" + parentID
	}

	// Create the request
	curlReq, err := h.svc.CreateRequest(h.projectID, parentPath, name, spec)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %s", err)
	}

	result := MCPCreateRequestResponse{
		ID:   curlReq.ID,
		Name: curlReq.Name,
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// createFolder creates a new folder in the bound project.
func (h *Handler) createFolder(parentID, name string) (*MCPToolResult, error) {
	if h.projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}
	if name == "" {
		return nil, fmt.Errorf("folder name is required")
	}

	// Determine parent path
	parentPath := ""
	if parentID != "" {
		parentPath = "folder|" + h.projectID + "|" + parentID
	}

	// Create the folder
	folder, err := h.svc.CreateFolder(h.projectID, parentPath, name)
	if err != nil {
		return nil, fmt.Errorf("failed to create folder: %s", err)
	}

	result := MCPCreateFolderResponse{
		ID:   folder.ID,
		Name: folder.Name,
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}
