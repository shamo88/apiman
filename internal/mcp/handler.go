package mcp

import (
	"encoding/json"
	"fmt"
	"strings"

	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
)

// Handler handles MCP tool calls.
type Handler struct {
	svc       *service.Service
	projectID string
}

// NewHandler creates a new MCP handler.
func NewHandler(svc *service.Service, projectID string) *Handler {
	return &Handler{
		svc:       svc,
		projectID: projectID,
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
	case "mcp_execute_request":
		path, _ := call.Arguments["path"].(string)
		caseID, _ := call.Arguments["case_id"].(string)
		return h.executeRequest(path, caseID)
	case "mcp_execute_raw":
		spec := call.Arguments
		return h.executeRaw(spec)
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
	requestID := parts[2]

	// Build the actual path for GetRequest
	actualPath := fmt.Sprintf("request|%s|%s", projectID, requestID)

	curlReq, err := h.svc.GetRequest(actualPath)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	detail := models.MCPRequestDetail{
		ID:          curlReq.ID,
		Name:        curlReq.Name,
		Method:      curlReq.Method,
		URL:         curlReq.HttpURL,
		Headers:     curlReq.Headers,
		Params:      curlReq.Params,
		Body:        curlReq.Body,
		BodyType:    curlReq.BodyType,
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

	caseName, _ := caseData["name"].(string)
	if caseName == "" {
		return nil, fmt.Errorf("case_name is required")
	}

	curlReq, err := h.svc.AddRequestCase(path, caseName)
	if err != nil {
		return nil, fmt.Errorf("failed to create case: %s", err)
	}

	// Return the new case info
	result := MCPCreateCaseResponse{
		ID:   curlReq.ID,
		Name: caseName,
	}

	// If spec is provided, update the case with that spec
	if specData, ok := caseData["spec"].(map[string]any); ok {
		spec := parseSpecFromMap(specData)
		if spec.Method != "" || spec.HttpURL != "" || spec.Body != "" {
			// Get the latest request to find the new case ID
			updatedReq, err := h.svc.GetRequest(path)
			if err == nil && len(updatedReq.Cases) > 0 {
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
				_ = h.svc.UpdateRequest(path, interfaceSpec, updatedCases, newCaseID)
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
func (h *Handler) executeRequest(path, caseID string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	// Parse path to get project ID
	parts := strings.Split(path, "|")
	if len(parts) != 3 || parts[0] != "request" {
		return nil, fmt.Errorf("invalid path format: %s", path)
	}
	projectID := parts[1]

	// Get the request first
	curlReq, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Determine which case to use
	useCaseID := caseID
	if useCaseID == "" {
		useCaseID = curlReq.ActiveCaseID
	}

	// Execute with scripts
	resp, err := h.svc.ExecuteHTTPRequestWithScripts(
		projectID,
		"", // projectName
		curlReq.Name,
		curlReq.Path,
		"", // environment ID - could be extended
		models.SpecFromCurlRequest(curlReq),
		nil, // preScriptIDs
		nil, // postScriptIDs
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
func (h *Handler) executeRaw(args map[string]interface{}) (*MCPToolResult, error) {
	method, _ := args["method"].(string)
	httpURL, _ := args["http_url"].(string)

	if method == "" || httpURL == "" {
		return nil, fmt.Errorf("method and http_url are required")
	}

	spec := parseSpecFromMap(args)

	resp, err := h.svc.ExecuteHTTPRequest(spec)
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
