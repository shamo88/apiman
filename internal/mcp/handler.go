package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"apiman/internal/models"
	"apiman/internal/project"
	"apiman/internal/service"
)

// Handler handles MCP tool calls.
//
// projectID and environmentID are guarded by mu so they can be swapped at
// runtime without restarting the MCP server (see P1-1 and P1-3).
type Handler struct {
	svc           *service.Service
	mu            sync.RWMutex
	projectID     string
	environmentID string
	notifier      *Notifier
}

// NewHandler creates a new MCP handler.
func NewHandler(svc *service.Service, projectID, environmentID string) *Handler {
	return &Handler{
		svc:           svc,
		projectID:     projectID,
		environmentID: environmentID,
	}
}

// GetProjectID returns the currently bound project ID.
func (h *Handler) GetProjectID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.projectID
}

// SetProjectID atomically updates the bound project ID.
func (h *Handler) SetProjectID(id string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.projectID = id
}

// GetEnvironmentID returns the currently active environment ID.
// Empty string means "no active environment".
func (h *Handler) GetEnvironmentID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.environmentID
}

// SetEnvironmentID atomically updates the active environment ID.
// Pass an empty string to clear the active environment.
func (h *Handler) SetEnvironmentID(id string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.environmentID = id
}

// SetNotifier attaches a Notifier used to broadcast mutation events.
// Pass nil to disable broadcasting (used in tests or one-shot handlers).
func (h *Handler) SetNotifier(n *Notifier) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.notifier = n
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
	case "mcp_delete_request":
		path, _ := call.Arguments["path"].(string)
		return h.deleteRequest(path)
	case "mcp_delete_folder":
		path, _ := call.Arguments["path"].(string)
		return h.deleteFolder(path)
	case "mcp_delete_case":
		path, _ := call.Arguments["path"].(string)
		caseID, _ := call.Arguments["case_id"].(string)
		return h.deleteCase(path, caseID)
	case "mcp_list_environments":
		return h.listEnvironments()
	case "mcp_get_case":
		path, _ := call.Arguments["path"].(string)
		caseID, _ := call.Arguments["case_id"].(string)
		return h.getCase(path, caseID)
	case "mcp_search_apis":
		keyword, _ := call.Arguments["keyword"].(string)
		return h.searchAPIs(keyword)

	// ---- P1-1: Runtime project switching ----
	case "mcp_list_projects":
		return h.listProjects()
	case "mcp_bind_project":
		projectID, _ := call.Arguments["project_id"].(string)
		environmentID, _ := call.Arguments["environment_id"].(string)
		return h.bindProject(projectID, environmentID)

	// ---- P1-2: History reading ----
	case "mcp_list_history":
		return h.listHistory(call.Arguments)
	case "mcp_get_history_entry":
		id, _ := call.Arguments["id"].(string)
		return h.getHistoryEntry(id)
	case "mcp_clear_history":
		confirm, _ := call.Arguments["confirm"].(bool)
		return h.clearHistory(confirm)

	// ---- P1-3: Environment CRUD ----
	case "mcp_create_environment":
		name, _ := call.Arguments["name"].(string)
		variables, _ := call.Arguments["variables"].(map[string]any)
		mark, _ := call.Arguments["mark"].(string)
		return h.createEnvironment(name, variables, mark)
	case "mcp_update_environment":
		id, _ := call.Arguments["id"].(string)
		name, _ := call.Arguments["name"].(string)
		variables, _ := call.Arguments["variables"].(map[string]any)
		mark, _ := call.Arguments["mark"].(string)
		return h.updateEnvironment(id, name, variables, mark)
	case "mcp_delete_environment":
		id, _ := call.Arguments["id"].(string)
		return h.deleteEnvironment(id)
	case "mcp_set_active_environment":
		id, _ := call.Arguments["id"].(string)
		return h.setActiveEnvironment(id)

	// ---- Globals: chainable scenarios (login → set token → reuse) ----
	case "mcp_list_globals":
		return h.listGlobals()
	case "mcp_get_globals":
		return h.getGlobals(call.Arguments)
	case "mcp_set_global":
		key, _ := call.Arguments["key"].(string)
		value, _ := call.Arguments["value"].(string)
		return h.setGlobal(key, value)
	case "mcp_unset_global":
		key, _ := call.Arguments["key"].(string)
		return h.unsetGlobal(key)

	// ---- P0/P1 write tools: request update/rename/move, folder rename/move,
	//      script create/update/delete ----
	case "mcp_update_request":
		path, _ := call.Arguments["path"].(string)
		return h.updateRequest(path, call.Arguments)
	case "mcp_rename_request":
		path, _ := call.Arguments["path"].(string)
		name, _ := call.Arguments["name"].(string)
		return h.renameRequest(path, name)
	case "mcp_move_request":
		path, _ := call.Arguments["path"].(string)
		targetParentPath, _ := call.Arguments["target_parent_path"].(string)
		beforeID, _ := call.Arguments["before_id"].(string)
		return h.moveRequest(path, targetParentPath, beforeID)
	case "mcp_rename_folder":
		path, _ := call.Arguments["path"].(string)
		name, _ := call.Arguments["name"].(string)
		return h.renameFolder(path, name)
	case "mcp_move_folder":
		path, _ := call.Arguments["path"].(string)
		targetParentPath, _ := call.Arguments["target_parent_path"].(string)
		beforeID, _ := call.Arguments["before_id"].(string)
		return h.moveFolder(path, targetParentPath, beforeID)
	case "mcp_create_script":
		name, _ := call.Arguments["name"].(string)
		description, _ := call.Arguments["description"].(string)
		content, _ := call.Arguments["content"].(string)
		return h.createScript(name, description, content)
	case "mcp_update_script":
		id, _ := call.Arguments["id"].(string)
		return h.updateScript(id, call.Arguments)
	case "mcp_delete_script":
		id, _ := call.Arguments["id"].(string)
		return h.deleteScript(id)

	default:
		return nil, fmt.Errorf("unknown tool: %s", call.Name)
	}
}

// ensureProjectAllowed verifies that the project ID extracted from a path
// matches the currently-bound project (if one is bound). Returns a parsed
// [parts] slice and re-sliced parts[1], or an error suitable for direct return.
//
// expectedType is the expected first element of the path (e.g. "request" or
// "folder"); pass "" to skip the type check.
func (h *Handler) ensureProjectAllowed(path, expectedType string) (parts []string, projectID string, err error) {
	parts = strings.Split(path, "|")
	if len(parts) != 3 {
		return nil, "", fmt.Errorf("invalid path format: %s", path)
	}
	if expectedType != "" && parts[0] != expectedType {
		return nil, "", fmt.Errorf("invalid path format: %s", path)
	}
	projectID = parts[1]
	bound := h.GetProjectID()
	if bound != "" && projectID != bound {
		return nil, "", fmt.Errorf("project ID mismatch: requested %s but bound to %s", projectID, bound)
	}
	return parts, projectID, nil
}

// listAPIs returns all APIs in the project.
func (h *Handler) listAPIs() (*MCPToolResult, error) {
	projectID := h.GetProjectID()
	if projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "{}"}},
		}, nil
	}

	tree, err := h.svc.GetProjectTree(projectID)
	if err != nil {
		return nil, err
	}

	// Separate folders and requests from the tree. Folders pull
	// pre/post-script IDs from the persisted ProjectScriptsCollection;
	// requests already carry them on the CurlRequest itself.
	folders := h.flattenFolders(tree.Children)
	requests := h.flattenRequests(tree.Children)

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

// folderScripts returns the configured pre/post-script IDs for a folder
// path. Errors are swallowed (returning nil) so a missing/broken scripts
// file doesn't break listAPIs — script IDs are decorative metadata here.
func (h *Handler) folderScripts(folderPath string) (pre, post []string) {
	if folderPath == "" {
		return nil, nil
	}
	pre, post, err := h.svc.GetFolderScripts(folderPath)
	if err != nil {
		return nil, nil
	}
	if pre == nil {
		pre = []string{}
	}
	if post == nil {
		post = []string{}
	}
	return pre, post
}

// requestScripts reads PreScripts/PostScripts off a CurlRequest by path.
// Same fault-tolerant pattern as folderScripts.
func (h *Handler) requestScripts(requestPath string) (pre, post []string) {
	if requestPath == "" {
		return nil, nil
	}
	req, err := h.svc.GetRequest(requestPath)
	if err != nil {
		return nil, nil
	}
	if req.PreScripts == nil {
		req.PreScripts = []string{}
	}
	if req.PostScripts == nil {
		req.PostScripts = []string{}
	}
	return req.PreScripts, req.PostScripts
}

func (h *Handler) flattenFolders(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		if child.Type == "folder" || child.Type == "project" {
			pre, post := h.folderScripts(child.Path)
			info := &models.MCPAPIInfo{
				ID:          child.ID,
				Name:        child.Name,
				Path:        child.Path,
				PreScripts:  pre,
				PostScripts: post,
			}
			if len(child.Children) > 0 {
				info.Children = h.flattenChildren(child.Children)
			}
			result = append(result, info)
		}
	}
	return result
}

func (h *Handler) flattenRequests(children []*project.ProjectTree) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	for _, child := range children {
		if child.Type == "request" {
			pre, post := h.requestScripts(child.Path)
			info := &models.MCPAPIInfo{
				ID:          child.ID,
				Name:        child.Name,
				Method:      child.Method,
				URL:         child.URL,
				Path:        child.Path,
				PreScripts:  pre,
				PostScripts: post,
			}
			if len(child.Children) > 0 {
				info.Children = h.flattenCaseChildren(child.Children)
			}
			result = append(result, info)
		}
	}
	return result
}

func (h *Handler) flattenChildren(children []*project.ProjectTree) []*models.MCPAPIInfo {
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
			pre, post := h.requestScripts(child.Path)
			info.PreScripts = pre
			info.PostScripts = post
			if len(child.Children) > 0 {
				info.Children = h.flattenCaseChildren(child.Children)
			}
		} else if child.Type == "folder" {
			pre, post := h.folderScripts(child.Path)
			info.PreScripts = pre
			info.PostScripts = post
			if len(child.Children) > 0 {
				info.Children = h.flattenChildren(child.Children)
			}
		}
		result = append(result, info)
	}
	return result
}

func (h *Handler) flattenCaseChildren(children []*project.ProjectTree) []*models.MCPAPIInfo {
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
	projectID := h.GetProjectID()
	if projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "[]"}},
		}, nil
	}

	scripts, err := h.svc.ListProjectScripts(projectID)
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

	// Security check: verify projectID in path matches bound project
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
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

	// Security check: verify projectID in path matches bound project. Only
	// enforced when a project is currently bound.
	if h.GetProjectID() != "" {
		if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
			return nil, err
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

	// If spec is provided, update the case with that spec. We no
	// longer gate this on method/http_url/body being non-empty — if
	// the caller only sends headers/params/cookies, those still
	// belong in the case spec. The previous check would silently
	// discard those mutations and is the root cause of report #1.
	if specData, ok := caseData["spec"].(map[string]any); ok {
		spec := parseSpecFromMap(specData)
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

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "case_create", "path": path, "case_id": result.ID}})
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

	// Parse path to get project ID and enforce binding
	_, projectID, err := h.ensureProjectAllowed(path, "request")
	if err != nil {
		return nil, err
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

	// Snapshot the notifier once so we don't race with swap-out.
	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()

	broadcastMsg := func(kind string) {
		if n == nil {
			return
		}
		payload := map[string]any{
			"kind":        kind,
			"requestName": curlReq.Name,
			"path":        path,
		}
		if caseID != "" {
			payload["caseID"] = caseID
		}
		n.Broadcast(Event{Type: "message", Data: payload})
	}

	broadcastMsg("pre_script_start")
	// Execute with scripts. The service layer does not expose fine-grained
	// pre/post hooks, so we emit best-effort start/end pairs.
	resp, err := h.svc.ExecuteHTTPRequestWithScriptsWithSource(
		projectID,
		projectName,
		curlReq.Name,
		curlReq.Path,
		h.GetEnvironmentID(),
		spec,
		preScriptIDs,
		postScriptIDs,
		models.HistorySourceMCP,
		"mcp_execute_request",
	)
	broadcastMsg("post_script_end")
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

	projectID := h.GetProjectID()
	environmentID := h.GetEnvironmentID()

	spec := parseSpecFromMap(args)

	// Get project name for history
	projectName, _ := h.svc.GetProjectName(projectID)

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	broadcastMsg := func(kind string) {
		if n == nil {
			return
		}
		n.Broadcast(Event{Type: "message", Data: map[string]any{
			"kind":        kind,
			"requestName": "raw_request",
		}})
	}
	broadcastMsg("pre_script_start")

	// Always use ExecuteHTTPRequestWithScriptsWithSource to ensure variable substitution
	resp, err := h.svc.ExecuteHTTPRequestWithScriptsWithSource(
		projectID,
		projectName,
		"raw_request",
		"",
		environmentID,
		spec,
		preScriptIDs,
		postScriptIDs,
		models.HistorySourceMCP,
		"mcp_execute_raw",
	)
	broadcastMsg("post_script_end")
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
	if h.GetProjectID() != "" {
		if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
			return nil, err
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
			// Update spec if provided. Like update_request, this is a
			// merge (PATCH): only fields present in specData replace
			// the existing ones; missing fields keep their previous
			// values. Arrays (headers, params, form_data, url_encoded)
			// are replaced wholesale when the corresponding key is
			// present, otherwise preserved.
			if specData, ok := caseData["spec"].(map[string]any); ok {
				merged := updatedCases[i].Spec
				if presentField(specData, "method") {
					if v, ok := specData["method"].(string); ok {
						merged.Method = v
					}
				}
				if presentField(specData, "http_url") {
					if v, ok := specData["http_url"].(string); ok {
						merged.HttpURL = v
					}
				}
				if presentField(specData, "body") {
					if v, ok := specData["body"].(string); ok {
						merged.Body = v
					}
				}
				if presentField(specData, "body_type") {
					if v, ok := specData["body_type"].(string); ok {
						merged.BodyType = v
					}
				}
				if presentField(specData, "headers") {
					merged.Headers = parseRequestKeyValArray(specData["headers"])
				}
				if presentField(specData, "params") {
					merged.Params = parseRequestKeyValArray(specData["params"])
				}
				if presentField(specData, "form_data") {
					merged.FormData = parseRequestPairArray(specData["form_data"])
				}
				if presentField(specData, "url_encoded") {
					merged.UrlEncoded = parseRequestPairArray(specData["url_encoded"])
				}
				if presentField(specData, "cookies") {
					merged.Cookies = parseRequestKeyValArray(specData["cookies"])
				}
				updatedCases[i].Spec = merged
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

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "case_update", "path": path, "case_id": caseID}})
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
	projectID := h.GetProjectID()
	if projectID == "" {
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
		parentPath = "folder|" + projectID + "|" + parentID
	}

	// Create the request
	curlReq, err := h.svc.CreateRequest(projectID, parentPath, name, spec)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "request_create", "id": curlReq.ID}})
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
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}
	if name == "" {
		return nil, fmt.Errorf("folder name is required")
	}

	// Determine parent path
	parentPath := ""
	if parentID != "" {
		parentPath = "folder|" + projectID + "|" + parentID
	}

	// Create the folder
	folder, err := h.svc.CreateFolder(projectID, parentPath, name)
	if err != nil {
		return nil, fmt.Errorf("failed to create folder: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "folder_create", "id": folder.ID}})
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

// deleteRequest deletes a saved request from the bound project.
func (h *Handler) deleteRequest(path string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	// Security check: verify projectID matches bound project
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}

	if err := h.svc.DeleteRequest(path); err != nil {
		return nil, fmt.Errorf("failed to delete request: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "request_delete", "path": path}})
	}

	result := MCPDeleteResponse{
		Success: true,
		Message: "Request deleted successfully",
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// deleteFolder deletes a folder and all its contents from the bound project.
func (h *Handler) deleteFolder(path string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	// Security check: verify projectID matches bound project
	if _, _, err := h.ensureProjectAllowed(path, "folder"); err != nil {
		return nil, err
	}

	if err := h.svc.DeleteFolder(path); err != nil {
		return nil, fmt.Errorf("failed to delete folder: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "folder_delete", "path": path}})
	}

	result := MCPDeleteResponse{
		Success: true,
		Message: "Folder deleted successfully",
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// deleteCase deletes a test case from a specific request.
func (h *Handler) deleteCase(path, caseID string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if caseID == "" {
		return nil, fmt.Errorf("case_id is required")
	}

	// Security check: verify projectID matches bound project
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}

	if _, err := h.svc.DeleteRequestCase(path, caseID); err != nil {
		return nil, fmt.Errorf("failed to delete case: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "case_delete", "path": path, "case_id": caseID}})
	}

	result := MCPDeleteResponse{
		Success: true,
		Message: "Case deleted successfully",
	}

	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// listEnvironments lists all environments in the bound project.
// MCP only sees environments marked dev or test; pre/prod/unmarked
// are filtered out so AI clients cannot read production variables.
func (h *Handler) listEnvironments() (*MCPToolResult, error) {
	projectID := h.GetProjectID()
	if projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "[]"}},
		}, nil
	}

	envs, err := h.svc.LoadEnvironments(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list environments: %s", err)
	}

	filtered := make([]models.Environment, 0, len(envs))
	for _, env := range envs {
		if env.Mark.IsMCPAccessible() {
			filtered = append(filtered, env)
		}
	}

	resp := MCPListEnvironmentsResponse{
		Environments: filtered,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}

	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// getCase gets detailed information about a specific test case.
func (h *Handler) getCase(path, caseID string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if caseID == "" {
		return nil, fmt.Errorf("case_id is required")
	}

	// Security check: verify projectID matches bound project
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}

	curlReq, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Find the case
	for _, c := range curlReq.Cases {
		if c.ID == caseID {
			result := MCPGetCaseResponse{
				ID:   c.ID,
				Name: c.Name,
				Spec: c.Spec,
			}

			data, err := json.Marshal(result)
			if err != nil {
				return nil, err
			}

			return &MCPToolResult{
				Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
			}, nil
		}
	}

	return nil, fmt.Errorf("case not found: %s", caseID)
}

// searchAPIs searches APIs by keyword in the bound project.
func (h *Handler) searchAPIs(keyword string) (*MCPToolResult, error) {
	projectID := h.GetProjectID()
	if projectID == "" {
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: "{\"folders\":[],\"requests\":[]}"}},
		}, nil
	}

	if keyword == "" {
		return nil, fmt.Errorf("keyword is required")
	}

	tree, err := h.svc.GetProjectTree(projectID)
	if err != nil {
		return nil, err
	}

	// Search and filter
	folders := searchFolders(tree.Children, keyword)
	requests := h.searchRequests(tree.Children, keyword)

	resp := MCPSearchAPIsResponse{
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

// searchFolders recursively searches folders by keyword.
func searchFolders(children []*project.ProjectTree, keyword string) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	keywordLower := strings.ToLower(keyword)

	for _, child := range children {
		if child.Type == "folder" || child.Type == "project" {
			matches := strings.Contains(strings.ToLower(child.Name), keywordLower)
			if matches {
				info := &models.MCPAPIInfo{
					ID:   child.ID,
					Name: child.Name,
					Path: child.Path,
				}
				if len(child.Children) > 0 {
					info.Children = searchChildrenRecursive(child.Children, keyword)
				}
				result = append(result, info)
			} else if len(child.Children) > 0 {
				subFolders := searchFolders(child.Children, keyword)
				if len(subFolders) > 0 {
					info := &models.MCPAPIInfo{
						ID:       child.ID,
						Name:     child.Name,
						Path:     child.Path,
						Children: subFolders,
					}
					result = append(result, info)
				}
			}
		}
	}
	return result
}

// searchRequests recursively searches requests by keyword.
func (h *Handler) searchRequests(children []*project.ProjectTree, keyword string) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	keywordLower := strings.ToLower(keyword)

	for _, child := range children {
		if child.Type == "request" {
			matchesName := strings.Contains(strings.ToLower(child.Name), keywordLower)
			matchesURL := strings.Contains(strings.ToLower(child.URL), keywordLower)
			if matchesName || matchesURL {
				pre, post := h.requestScripts(child.Path)
				info := &models.MCPAPIInfo{
					ID:          child.ID,
					Name:        child.Name,
					Method:      child.Method,
					URL:         child.URL,
					Path:        child.Path,
					PreScripts:  pre,
					PostScripts: post,
				}
				if len(child.Children) > 0 {
					info.Children = h.flattenCaseChildren(child.Children)
				}
				result = append(result, info)
			}
		} else if len(child.Children) > 0 {
			result = append(result, h.searchRequests(child.Children, keyword)...)
		}
	}
	return result
}

// searchChildrenRecursive searches both folders and requests in children.
func searchChildrenRecursive(children []*project.ProjectTree, keyword string) []*models.MCPAPIInfo {
	var result []*models.MCPAPIInfo
	keywordLower := strings.ToLower(keyword)

	for _, child := range children {
		if child.Type == "folder" {
			matches := strings.Contains(strings.ToLower(child.Name), keywordLower)
			if matches {
				info := &models.MCPAPIInfo{
					ID:   child.ID,
					Name: child.Name,
					Path: child.Path,
				}
				if len(child.Children) > 0 {
					info.Children = searchChildrenRecursive(child.Children, keyword)
				}
				result = append(result, info)
			} else if len(child.Children) > 0 {
				info := &models.MCPAPIInfo{
					ID:       child.ID,
					Name:     child.Name,
					Path:     child.Path,
					Children: searchChildrenRecursive(child.Children, keyword),
				}
				if len(info.Children) > 0 {
					result = append(result, info)
				}
			}
		} else if child.Type == "request" {
			matchesName := strings.Contains(strings.ToLower(child.Name), keywordLower)
			matchesURL := strings.Contains(strings.ToLower(child.URL), keywordLower)
			if matchesName || matchesURL {
				info := &models.MCPAPIInfo{
					ID:     child.ID,
					Name:   child.Name,
					Method: child.Method,
					URL:    child.URL,
					Path:   child.Path,
				}
				result = append(result, info)
			}
		}
	}
	return result
}

// ---- P1-1: Runtime project switching ----

// listProjects returns all projects and the currently bound project ID.
func (h *Handler) listProjects() (*MCPToolResult, error) {
	projects, err := h.svc.ListProjects()
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %s", err)
	}
	if projects == nil {
		projects = []models.Project{}
	}
	resp := MCPListProjectsResponse{
		Projects:    projects,
		BoundID:     h.GetProjectID(),
		Environment: h.GetEnvironmentID(),
	}
	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// bindProject atomically switches the bound project and active environment.
// Broadcasts a "message" event so SSE subscribers can refresh.
func (h *Handler) bindProject(projectID, environmentID string) (*MCPToolResult, error) {
	// Validate the project exists when a non-empty ID is given. An empty
	// ID is allowed and means "unbind".
	if projectID != "" {
		found := false
		projects, err := h.svc.ListProjects()
		if err != nil {
			return nil, fmt.Errorf("failed to list projects: %s", err)
		}
		for _, p := range projects {
			if p.ID == projectID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("project not found: %s", projectID)
		}
	}

	h.mu.Lock()
	previous := h.projectID
	h.projectID = projectID
	h.environmentID = environmentID
	n := h.notifier
	h.mu.Unlock()

	if n != nil {
		n.Broadcast(Event{
			Type: "message",
			Data: map[string]any{
				"kind":           "mcp_bind_project",
				"project_id":     projectID,
				"environment_id": environmentID,
				"previous_id":    previous,
			},
		})
		n.Broadcast(Event{
			Type: "tools/list_changed",
			Data: map[string]any{"reason": "project_bind"},
		})
	}

	resp := MCPBindProjectResponse{
		ProjectID:     projectID,
		EnvironmentID: environmentID,
		PreviousID:    previous,
	}
	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// ---- P1-2: History reading tools ----

// listHistory returns history entries with optional filters.
func (h *Handler) listHistory(args map[string]any) (*MCPToolResult, error) {
	limit := 50
	if v, ok := args["limit"].(float64); ok && v > 0 {
		limit = int(v)
	}

	params := models.HistorySearchParams{}
	if v, ok := args["project_name"].(string); ok {
		params.Project = v
	}
	if v, ok := args["method"].(string); ok {
		params.Method = strings.ToUpper(v)
	}
	if v, ok := args["status_code"].(float64); ok {
		params.Status = int(v)
	}
	if v, ok := args["keyword"].(string); ok {
		params.Keyword = v
	}

	hasFilter := params != (models.HistorySearchParams{})

	var entries []models.HistoryEntry
	var err error
	if hasFilter {
		entries, err = h.svc.SearchHistory(params, limit)
	} else {
		entries, err = h.svc.ListHistory(limit)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list history: %s", err)
	}
	if entries == nil {
		entries = []models.HistoryEntry{}
	}
	resp := MCPListHistoryResponse{
		Entries: entries,
		Limit:   limit,
		Count:   len(entries),
	}
	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// getHistoryEntry fetches a single history entry by ID.
func (h *Handler) getHistoryEntry(id string) (*MCPToolResult, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	entry, err := h.svc.GetHistoryEntry(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get history entry: %s", err)
	}
	data, err := json.Marshal(MCPHistoryEntryResponse{Entry: entry})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// clearHistory wipes all history entries when confirm is true.
func (h *Handler) clearHistory(confirm bool) (*MCPToolResult, error) {
	if !confirm {
		resp := MCPClearHistoryResponse{Success: false, Message: "clear not confirmed"}
		data, _ := json.Marshal(resp)
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
		}, nil
	}
	if err := h.svc.ClearHistory(); err != nil {
		return nil, fmt.Errorf("failed to clear history: %s", err)
	}
	resp := MCPClearHistoryResponse{Success: true, Message: "history cleared"}
	data, err := json.Marshal(resp)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// ---- P1-3: Environment CRUD ----

// createEnvironment creates a new environment in the bound project.
// MCP may only create dev/test-marked environments; any other mark (or
// no mark) is rejected to prevent AI clients from injecting production
// or pre data sources into the project.
func (h *Handler) createEnvironment(name string, variables map[string]any, mark string) (*MCPToolResult, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	envMark := models.EnvironmentMark(mark)
	if !envMark.IsMCPAccessible() {
		return nil, fmt.Errorf("mark %q is not accessible from MCP; allowed: dev, test", envMark)
	}

	vars := anyMapToStringMap(variables)
	env, err := h.svc.CreateEnvironment(projectID, name, vars, envMark)
	if err != nil {
		return nil, fmt.Errorf("failed to create environment: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "environment_create", "id": env.ID}})
	}

	data, err := json.Marshal(MCPCreateEnvironmentResponse{Environment: env})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// updateEnvironment updates an existing environment's name, variables, and/or mark.
// All three fields are optional; omitted fields keep their previous value.
// mark, when present, must be dev or test (the only values MCP may set).
func (h *Handler) updateEnvironment(id, name string, variables map[string]any, mark string) (*MCPToolResult, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	// Read the current environment so unset fields can be preserved.
	existing, err := h.findEnvironment(projectID, id)
	if err != nil {
		return nil, err
	}

	newName := name
	if newName == "" {
		newName = existing.Name
	}
	var newVars map[string]string
	if variables == nil {
		newVars = existing.Variables
	} else {
		newVars = anyMapToStringMap(variables)
	}

	// Mark resolution: empty string in the args means "do not touch";
	// we pass the Unspecified sentinel so the service layer preserves
	// the existing value. A non-empty value must be dev/test or reject.
	var newMark models.EnvironmentMark = models.EnvironmentMarkUnspecified
	if mark != "" {
		candidate := models.EnvironmentMark(mark)
		if !candidate.IsMCPAccessible() {
			return nil, fmt.Errorf("mark %q is not accessible from MCP; allowed: dev, test", candidate)
		}
		newMark = candidate
	}

	if err := h.svc.UpdateEnvironment(projectID, id, newName, newVars, newMark); err != nil {
		return nil, fmt.Errorf("failed to update environment: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "environment_update", "id": id}})
	}

	data, err := json.Marshal(MCPUpdateEnvironmentResponse{
		ID:        id,
		Name:      newName,
		Variables: newVars,
		Updated:   true,
	})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// deleteEnvironment removes an environment from the bound project.
func (h *Handler) deleteEnvironment(id string) (*MCPToolResult, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	if err := h.svc.DeleteEnvironment(projectID, id); err != nil {
		return nil, fmt.Errorf("failed to delete environment: %s", err)
	}

	// If the deleted environment was active, clear it.
	h.mu.Lock()
	if h.environmentID == id {
		h.environmentID = ""
	}
	n := h.notifier
	h.mu.Unlock()

	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "environment_delete", "id": id}})
	}

	data, err := json.Marshal(MCPDeleteEnvironmentResponse{Deleted: true, ID: id})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// setActiveEnvironment switches the active environment at runtime. Empty id
// clears the current selection. The requested environment must be marked
// dev or test; pre/prod/unmarked environments are rejected so MCP
// can never drive traffic against production data sources.
func (h *Handler) setActiveEnvironment(id string) (*MCPToolResult, error) {
	projectID := h.GetProjectID()

	if id != "" && projectID != "" {
		existing, err := h.findEnvironment(projectID, id)
		if err != nil {
			return nil, err
		}
		if !existing.Mark.IsMCPAccessible() {
			return nil, fmt.Errorf("environment %s (mark=%q) is not accessible from MCP; only dev/test environments may be activated", id, existing.Mark)
		}
	}

	h.mu.Lock()
	previous := h.environmentID
	h.environmentID = id
	n := h.notifier
	h.mu.Unlock()

	if n != nil {
		n.Broadcast(Event{
			Type: "message",
			Data: map[string]any{
				"kind":           "mcp_set_active_environment",
				"environment_id": id,
				"previous_id":    previous,
			},
		})
	}

	data, err := json.Marshal(MCPSetActiveEnvironmentResponse{
		EnvironmentID: id,
		Previous:      previous,
	})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// findEnvironment locates an environment by id within a project.
func (h *Handler) findEnvironment(projectID, id string) (*models.Environment, error) {
	envs, err := h.svc.LoadEnvironments(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to load environments: %s", err)
	}
	for i := range envs {
		if envs[i].ID == id {
			return &envs[i], nil
		}
	}
	return nil, fmt.Errorf("environment not found: %s", id)
}

// ---- Global variable tools ----
//
// Globals are persisted at ~/.apiman/variables.json and made available
// to the goja script runtime as `am.globals.*`. These tools let an AI
// client drive chainable scenarios: log in, extract a token, store it,
// then run follow-up requests whose {{token}} resolves to it.

// listGlobals returns the entire globals map.
func (h *Handler) listGlobals() (*MCPToolResult, error) {
	vars, err := h.svc.GetGlobalVariables()
	if err != nil {
		return nil, fmt.Errorf("failed to read globals: %s", err)
	}
	if vars == nil {
		vars = map[string]string{}
	}
	data, err := json.Marshal(MCPListGlobalsResponse{Variables: vars, Count: len(vars)})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// getGlobals returns a filtered view. Caller may pass:
//   - keys: array of strings — return only those keys
//   - prefix: string — return keys whose name starts with the prefix
//
// At least one of keys / prefix is recommended; without filters this is
// equivalent to listGlobals.
func (h *Handler) getGlobals(args map[string]any) (*MCPToolResult, error) {
	all, err := h.svc.GetGlobalVariables()
	if err != nil {
		return nil, fmt.Errorf("failed to read globals: %s", err)
	}
	if all == nil {
		all = map[string]string{}
	}

	filtered := map[string]string{}

	if rawKeys, ok := args["keys"].([]any); ok && len(rawKeys) > 0 {
		for _, k := range rawKeys {
			ks, ok := k.(string)
			if !ok || ks == "" {
				continue
			}
			if v, present := all[ks]; present {
				filtered[ks] = v
			}
		}
	} else if prefix, ok := args["prefix"].(string); ok && prefix != "" {
		for k, v := range all {
			if strings.HasPrefix(k, prefix) {
				filtered[k] = v
			}
		}
	} else {
		// No filter — return everything.
		filtered = all
	}

	data, err := json.Marshal(MCPGetGlobalsResponse{Variables: filtered, Count: len(filtered)})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// setGlobal upserts a single key. The whole map is rewritten on disk;
// this is the same pattern as am.globals.set() inside the script runtime.
func (h *Handler) setGlobal(key, value string) (*MCPToolResult, error) {
	if key == "" {
		return nil, fmt.Errorf("key is required")
	}
	all, err := h.svc.GetGlobalVariables()
	if err != nil {
		return nil, fmt.Errorf("failed to read globals: %s", err)
	}
	if all == nil {
		all = map[string]string{}
	}
	all[key] = value
	if err := h.svc.SaveGlobalVariables(all); err != nil {
		return nil, fmt.Errorf("failed to save globals: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{
			Type: "message",
			Data: map[string]any{
				"kind": "globals_changed",
				"op":   "set",
				"key":  key,
			},
		})
	}

	data, err := json.Marshal(MCPSetGlobalResponse{Key: key, Value: value})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// unsetGlobal removes a single key. Returns existed=false (not an error)
// when the key was not present — this makes it idempotent and safe to
// call from agent loops.
func (h *Handler) unsetGlobal(key string) (*MCPToolResult, error) {
	if key == "" {
		return nil, fmt.Errorf("key is required")
	}
	all, err := h.svc.GetGlobalVariables()
	if err != nil {
		return nil, fmt.Errorf("failed to read globals: %s", err)
	}
	if all == nil {
		all = map[string]string{}
	}
	existed := false
	if _, ok := all[key]; ok {
		delete(all, key)
		existed = true
		if err := h.svc.SaveGlobalVariables(all); err != nil {
			return nil, fmt.Errorf("failed to save globals: %s", err)
		}
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil && existed {
		n.Broadcast(Event{
			Type: "message",
			Data: map[string]any{
				"kind": "globals_changed",
				"op":   "unset",
				"key":  key,
			},
		})
	}

	data, err := json.Marshal(MCPUnsetGlobalResponse{Key: key, Existed: existed})
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// anyMapToStringMap converts a JSON-decoded map[string]any into a
// map[string]string suitable for the service layer. Non-string values are
// stringified; nil values produce empty strings.
func anyMapToStringMap(in map[string]any) map[string]string {
	if in == nil {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		if v == nil {
			out[k] = ""
			continue
		}
		if s, ok := v.(string); ok {
			out[k] = s
			continue
		}
		out[k] = fmt.Sprintf("%v", v)
	}
	return out
}

// ---- P0/P1 write tools: request update/rename/move, folder rename/move,
//      script create/update/delete ----
//
// These eight tools close the CRUD symmetry gap exposed by the existing
// read paths. They all delegate to the service layer and broadcast a
// tools/list_changed event so the GUI can refresh its tree.

// presentField reports whether key was explicitly present in the decoded
// JSON arguments map. JSON unmarshalling cannot distinguish "absent" from
// "present with zero value", so we keep the original arg map around for
// membership checks when partial-merge semantics matter.
func presentField(args map[string]interface{}, key string) bool {
	if args == nil {
		return false
	}
	_, ok := args[key]
	return ok
}

// updateRequest applies a partial update to a request's spec, cases, and
// active case. Fields absent from `spec` keep their current value; fields
// present in `spec` (even when empty) overwrite. `cases` is full-replacement
// when provided; otherwise the existing cases are preserved. `active_case_id`
// is only updated when explicitly passed.
func (h *Handler) updateRequest(path string, args map[string]interface{}) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}

	existing, err := h.svc.GetRequest(path)
	if err != nil {
		return nil, fmt.Errorf("request not found: %s", err)
	}

	// Build the merged spec from the existing one.
	mergedSpec := models.SpecFromCurlRequest(existing)
	// CurlRequest stores Method/URL at the top level; SpecFromCurlRequest
	// already populates them. When the item has cases, InterfaceSpec holds
	// the "original" spec (the request-level defaults). Prefer that when
	// available so partial updates start from the same baseline the GUI
	// shows for the request itself.
	if existing.InterfaceSpec != nil {
		mergedSpec = *existing.InterfaceSpec
	}

	if specArg, ok := args["spec"].(map[string]any); ok && specArg != nil {
		// Scalars: only overwrite when key was present in the raw args.
		// parseSpecFromMap's `ok` checks already drop absent keys, so we
		// use presentField to distinguish "explicit empty string" from
		// "missing" for fields where "" is a meaningful value (method,
		// http_url, body_type, body).
		if presentField(specArg, "method") {
			if v, ok := specArg["method"].(string); ok {
				mergedSpec.Method = v
			}
		}
		if presentField(specArg, "http_url") {
			if v, ok := specArg["http_url"].(string); ok {
				mergedSpec.HttpURL = v
			}
		}
		if presentField(specArg, "body") {
			if v, ok := specArg["body"].(string); ok {
				mergedSpec.Body = v
			}
		}
		if presentField(specArg, "body_type") {
			if v, ok := specArg["body_type"].(string); ok {
				mergedSpec.BodyType = v
			}
		}
		// Arrays: full replacement when key present in args.
		if presentField(specArg, "headers") {
			mergedSpec.Headers = parseRequestKeyValArray(specArg["headers"])
		}
		if presentField(specArg, "params") {
			mergedSpec.Params = parseRequestKeyValArray(specArg["params"])
		}
		if presentField(specArg, "form_data") {
			mergedSpec.FormData = parseRequestPairArray(specArg["form_data"])
		}
		if presentField(specArg, "url_encoded") {
			mergedSpec.UrlEncoded = parseRequestPairArray(specArg["url_encoded"])
		}
	}

	// Cases: full replacement when "cases" key present. An explicit empty
	// array clears all cases. Absent key keeps whatever is on disk.
	var mergedCases []models.HttpRequestCase
	if presentField(args, "cases") {
		rawCases, _ := args["cases"].([]any)
		mergedCases = parseCases(rawCases)
	} else {
		mergedCases = append([]models.HttpRequestCase(nil), existing.Cases...)
	}

	// Active case id: only update when key present. We can't read the
	// stored active id through CurlRequest, so passing empty preserves
	// whatever the service layer does on empty input (the project layer
	// trims and assigns as-is; an explicit empty string clears it).
	activeCaseID := ""
	if presentField(args, "active_case_id") {
		if v, ok := args["active_case_id"].(string); ok {
			activeCaseID = v
		}
	} else if len(mergedCases) > 0 {
		// Preserve the first case as active when no explicit override and
		// we are about to write cases through. UpdateRequest's empty-string
		// path clears the active id, which would orphan the case list; we
		// mirror what updateCase does to avoid that surprise.
		activeCaseID = mergedCases[0].ID
	}

	if err := h.svc.UpdateRequest(path, mergedSpec, mergedCases, activeCaseID); err != nil {
		return nil, fmt.Errorf("failed to update request: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "request_update", "path": path, "id": existing.ID}})
	}

	result := MCPUpdateRequestResponse{
		ID:   existing.ID,
		Name: existing.Name,
		Path: existing.Path,
	}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// parseRequestKeyValArray decodes an array of {key, value, enabled?}
// objects into []models.RequestKeyVal. Returns nil when the input is nil
// or wrong-typed; returns an empty (non-nil) slice for an explicit [].
func parseRequestKeyValArray(v interface{}) []models.RequestKeyVal {
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]models.RequestKeyVal, 0, len(arr))
	for _, item := range arr {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		kv := models.RequestKeyVal{}
		if s, ok := m["key"].(string); ok {
			kv.Key = s
		}
		if s, ok := m["value"].(string); ok {
			kv.Value = s
		}
		// Default enabled=true when the field is missing; honour an
		// explicit false so callers can disable rows.
		if b, ok := m["enabled"].(bool); ok {
			kv.Enabled = b
		} else {
			kv.Enabled = true
		}
		out = append(out, kv)
	}
	return out
}

// parseRequestPairArray is the same shape as parseRequestKeyValArray but
// produces models.RequestPair (form_data / url_encoded entries).
func parseRequestPairArray(v interface{}) []models.RequestPair {
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]models.RequestPair, 0, len(arr))
	for _, item := range arr {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		p := models.RequestPair{}
		if s, ok := m["key"].(string); ok {
			p.Key = s
		}
		if s, ok := m["value"].(string); ok {
			p.Value = s
		}
		if b, ok := m["enabled"].(bool); ok {
			p.Enabled = b
		} else {
			p.Enabled = true
		}
		out = append(out, p)
	}
	return out
}

// parseCases decodes an array of {id, name, spec} case objects. The id
// field is preserved as-is so callers can update existing case ids; empty
// id is left alone (the service layer / postman layer will reject blanks
// when actually saving, but we don't fail fast on decode).
func parseCases(v []any) []models.HttpRequestCase {
	out := make([]models.HttpRequestCase, 0, len(v))
	for _, item := range v {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		c := models.HttpRequestCase{}
		if s, ok := m["id"].(string); ok {
			c.ID = s
		}
		if s, ok := m["name"].(string); ok {
			c.Name = s
		}
		if specMap, ok := m["spec"].(map[string]any); ok {
			c.Spec = parseSpecFromMap(specMap)
		}
		out = append(out, c)
	}
	return out
}

// renameRequest renames a request. The path does not change (path format
// is flat: request|<projectID>|<requestID>).
func (h *Handler) renameRequest(path, name string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}

	req, err := h.svc.RenameRequest(path, name)
	if err != nil {
		return nil, fmt.Errorf("failed to rename request: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "request_rename", "path": path, "id": req.ID}})
	}

	result := MCPRenameResponse{ID: req.ID, Name: req.Name, Path: req.Path}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// moveRequest moves a request to a different folder. target_parent_path is
// the full "folder|<projectID>|<folderID>" path of the destination; empty
// string means "project root". before_id is the id of the sibling to
// insert before; empty means append. The request's path stays the same
// after a move because paths are flat.
func (h *Handler) moveRequest(path, targetParentPath, beforeID string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if _, _, err := h.ensureProjectAllowed(path, "request"); err != nil {
		return nil, err
	}
	// Validate target_parent_path format when non-empty. An invalid target
	// path would otherwise bubble up from the service layer as an opaque
	// os.ErrInvalid; this gives a more direct error message.
	if targetParentPath != "" {
		if !strings.HasPrefix(targetParentPath, "folder|") {
			return nil, fmt.Errorf("target_parent_path must be a folder path like 'folder|<project-id>|<folder-id>'")
		}
	}

	id, err := h.svc.MoveRequest(path, targetParentPath, beforeID)
	if err != nil {
		return nil, fmt.Errorf("failed to move request: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "request_move", "path": path, "id": id}})
	}

	result := MCPMoveResponse{ID: id, Path: path}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// renameFolder renames a folder. The path does not change.
func (h *Handler) renameFolder(path, name string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if _, _, err := h.ensureProjectAllowed(path, "folder"); err != nil {
		return nil, err
	}

	folder, err := h.svc.RenameFolder(path, name)
	if err != nil {
		return nil, fmt.Errorf("failed to rename folder: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "folder_rename", "path": path, "id": folder.ID}})
	}

	result := MCPRenameResponse{ID: folder.ID, Name: folder.Name, Path: folder.Path}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// moveFolder moves a folder to a different parent. The folder's own path
// stays the same (folder paths are flat).
func (h *Handler) moveFolder(path, targetParentPath, beforeID string) (*MCPToolResult, error) {
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}
	if _, _, err := h.ensureProjectAllowed(path, "folder"); err != nil {
		return nil, err
	}
	if targetParentPath != "" {
		if !strings.HasPrefix(targetParentPath, "folder|") {
			return nil, fmt.Errorf("target_parent_path must be a folder path like 'folder|<project-id>|<folder-id>'")
		}
	}

	id, err := h.svc.MoveFolder(path, targetParentPath, beforeID)
	if err != nil {
		return nil, fmt.Errorf("failed to move folder: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "folder_move", "path": path, "id": id}})
	}

	result := MCPMoveResponse{ID: id, Path: path}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// createScript creates a new project-level script. Requires a bound project.
func (h *Handler) createScript(name, description, content string) (*MCPToolResult, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	script, err := h.svc.CreateProjectScript(projectID, name, description, content)
	if err != nil {
		return nil, fmt.Errorf("failed to create script: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "script_create", "id": script.ID}})
	}

	result := MCPCreateScriptResponse{ID: script.ID, Name: script.Name, Description: script.Description}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// updateScript partially updates a project-level script. The id is required
// and identifies which script to mutate; absent fields keep their previous
// value. We have to read existing values via ListProjectScripts because
// the service's UpdateProjectScript takes (name, description, content)
// as a single positional set and treats empty strings as valid writes.
func (h *Handler) updateScript(id string, args map[string]interface{}) (*MCPToolResult, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	scripts, err := h.svc.ListProjectScripts(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list scripts: %s", err)
	}
	var existing *models.ProjectScript
	for i := range scripts {
		if scripts[i].ID == id {
			existing = &scripts[i]
			break
		}
	}
	if existing == nil {
		return nil, fmt.Errorf("script not found: %s", id)
	}

	newName := existing.Name
	if presentField(args, "name") {
		if v, ok := args["name"].(string); ok && v != "" {
			newName = v
		}
	}
	newDescription := existing.Description
	if presentField(args, "description") {
		if v, ok := args["description"].(string); ok {
			newDescription = v
		}
	}
	newContent := existing.Content
	if presentField(args, "content") {
		if v, ok := args["content"].(string); ok {
			newContent = v
		}
	}

	script, err := h.svc.UpdateProjectScript(projectID, id, newName, newDescription, newContent)
	if err != nil {
		return nil, fmt.Errorf("failed to update script: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "script_update", "id": id}})
	}

	result := MCPUpdateScriptResponse{ID: script.ID, Name: script.Name, Description: script.Description}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}

// deleteScript removes a script by id. Idempotent: returns deleted=false
// when the script does not exist, rather than erroring.
func (h *Handler) deleteScript(id string) (*MCPToolResult, error) {
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	projectID := h.GetProjectID()
	if projectID == "" {
		return nil, fmt.Errorf("no project bound to MCP server")
	}

	// Existence check up front so we can report deleted=false honestly.
	// The service layer's DeleteProjectScript ignores remove errors and
	// always returns nil, so it would silently succeed for missing ids.
	scripts, err := h.svc.ListProjectScripts(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list scripts: %s", err)
	}
	found := false
	for _, s := range scripts {
		if s.ID == id {
			found = true
			break
		}
	}
	if !found {
		result := MCPDeleteScriptResponse{Deleted: false, ID: id}
		data, _ := json.Marshal(result)
		return &MCPToolResult{
			Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
		}, nil
	}

	if err := h.svc.DeleteProjectScript(projectID, id); err != nil {
		return nil, fmt.Errorf("failed to delete script: %s", err)
	}

	h.mu.RLock()
	n := h.notifier
	h.mu.RUnlock()
	if n != nil {
		n.Broadcast(Event{Type: "tools/list_changed", Data: map[string]any{"reason": "script_delete", "id": id}})
	}

	result := MCPDeleteScriptResponse{Deleted: true, ID: id}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return &MCPToolResult{
		Content: []MCPContentBlock{{Type: "text", Text: string(data)}},
	}, nil
}
