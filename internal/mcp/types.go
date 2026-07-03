package mcp

import "apiman/internal/models"

// MCP JSON-RPC 2.0 Types

type JSONRPCRequest struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      interface{}    `json:"id"`
	Method  string         `json:"method"`
	Params  map[string]any `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      interface{}   `json:"id"`
	Result  any           `json:"result,omitempty"`
	Error   *JSONRPCError `json:"error,omitempty"`
}

type JSONRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MCP Protocol Types

type MCPMessage struct {
	Method string         `json:"method,omitempty"`
	Params map[string]any `json:"params,omitempty"`
}

type MCPInitializeResult struct {
	ProtocolVersion string          `json:"protocolVersion"`
	Capabilities    MCPCapabilities `json:"capabilities"`
	ServerInfo      MCPServerInfo   `json:"serverInfo"`
}

type MCPCapabilities struct {
	Tools     any `json:"tools"`
	Resources any `json:"resources,omitempty"`
}

type MCPServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// Tool Types

type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

type MCPToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments,omitempty"`
}

type MCPToolResult struct {
	Content []MCPContentBlock `json:"content"`
	IsError bool              `json:"isError,omitempty"`
}

type MCPContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// List APIs Response

type MCPListAPIsResponse struct {
	Folders  []*models.MCPAPIInfo `json:"folders"`
	Requests []*models.MCPAPIInfo `json:"requests"`
}

// Create Case Response

type MCPCreateCaseResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Create Request Response

type MCPCreateRequestResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Create Folder Response

type MCPCreateFolderResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Update Case Response

type MCPUpdateCaseResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Delete Response

type MCPDeleteResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// Get Case Response

type MCPGetCaseResponse struct {
	ID   string                 `json:"id"`
	Name string                 `json:"name"`
	Spec models.HttpRequestSpec `json:"spec"`
}

// List Environments Response

type MCPListEnvironmentsResponse struct {
	Environments []models.Environment `json:"environments"`
}

// Search APIs Response

type MCPSearchAPIsResponse struct {
	Folders  []*models.MCPAPIInfo `json:"folders"`
	Requests []*models.MCPAPIInfo `json:"requests"`
}

// List Projects Response (P1-1)

type MCPListProjectsResponse struct {
	Projects    []models.Project `json:"projects"`
	BoundID     string           `json:"bound_id,omitempty"`
	Environment string           `json:"environment_id,omitempty"`
}

// Bind Project Response (P1-1)

type MCPBindProjectResponse struct {
	ProjectID     string `json:"project_id"`
	EnvironmentID string `json:"environment_id,omitempty"`
	PreviousID    string `json:"previous_id,omitempty"`
}

// List History Response (P1-2)

type MCPListHistoryResponse struct {
	Entries []models.HistoryEntry `json:"entries"`
	Limit   int                   `json:"limit"`
	Count   int                   `json:"count"`
}

// History Entry Response (P1-2)

type MCPHistoryEntryResponse struct {
	Entry *models.RequestHistory `json:"entry,omitempty"`
}

// Clear History Response (P1-2)

type MCPClearHistoryResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// Create Environment Response (P1-3)

type MCPCreateEnvironmentResponse struct {
	Environment *models.Environment `json:"environment"`
}

// Update Environment Response (P1-3)

type MCPUpdateEnvironmentResponse struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Variables map[string]string `json:"variables"`
	Updated   bool              `json:"updated"`
}

// Delete Environment Response (P1-3)

type MCPDeleteEnvironmentResponse struct {
	Deleted bool   `json:"deleted"`
	ID      string `json:"id"`
}

// Set Active Environment Response (P1-3)

type MCPSetActiveEnvironmentResponse struct {
	EnvironmentID string `json:"environment_id,omitempty"`
	Previous      string `json:"previous_id,omitempty"`
}

// ---- Global variables ----
//
// Global variables are persisted at ~/.apiman/variables.json and made
// available to the goja script runtime as `am.globals.*`. The MCP tools
// let an AI client read/write them so chainable scenarios work end-to-end
// (e.g. login → extract token → am.globals.set("token", ...) →
// subsequent mcp_execute_request uses {{token}}).

// MCPListGlobalsResponse returns the full key/value map.
type MCPListGlobalsResponse struct {
	Variables map[string]string `json:"variables"`
	Count     int               `json:"count"`
}

// MCPGetGlobalsResponse returns a filtered view of globals.
type MCPGetGlobalsResponse struct {
	Variables map[string]string `json:"variables"`
	Count     int               `json:"count"`
}

// MCPSetGlobalResponse reports the value that was stored.
type MCPSetGlobalResponse struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// MCPUnsetGlobalResponse indicates whether a key was present and removed.
type MCPUnsetGlobalResponse struct {
	Key     string `json:"key"`
	Existed bool   `json:"existed"`
}

// ---- Request / folder / script write operations ----
//
// These response shapes cover the 8 P0/P1 write tools: request
// update/rename/move, folder rename/move, and script create/update/delete.
// Each is intentionally narrow: callers that need full state should re-fetch
// via the existing read tools (mcp_get_request, mcp_list_apis, mcp_list_scripts).

// MCPUpdateRequestResponse is returned by mcp_update_request. The full merged
// state is not echoed back; callers re-read via mcp_get_request when needed.
type MCPUpdateRequestResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

// MCPRenameResponse is returned by mcp_rename_request and mcp_rename_folder.
type MCPRenameResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

// MCPMoveResponse is returned by mcp_move_request and mcp_move_folder. The
// path format stays request|<projectID>|<requestID> (or folder|...) regardless
// of parent, so we echo back the same path the caller used.
type MCPMoveResponse struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

// MCPCreateScriptResponse is returned by mcp_create_script.
type MCPCreateScriptResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// MCPUpdateScriptResponse is returned by mcp_update_script.
type MCPUpdateScriptResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// MCPDeleteScriptResponse is returned by mcp_delete_script. deleted=false
// indicates the script did not exist; the call is idempotent.
type MCPDeleteScriptResponse struct {
	Deleted bool   `json:"deleted"`
	ID      string `json:"id"`
}

// ---- Script help (so AI clients can write am.* pre/post scripts) ----
//
// AI clients connected to apiman via MCP have no other way to learn the
// `am.*` script runtime API — schema is the only protocol-level channel.
// These two tools let an AI client pull a full reference on demand, the
// same as a human reading the GUI's "Script Help" window.

// MCPScriptExample is a single worked example returned by
// mcp_get_script_examples. Each example includes a stable id (so an AI
// can reference "example:signing"), a title, a short description of
// when to use it, and the actual JavaScript source.
type MCPScriptExample struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Stage       string `json:"stage"` // "pre" | "post" | "either"
	Code        string `json:"code"`
}

// MCPGetScriptExamplesResponse returns the full example catalog. The AI
// can call this once to load a mental model, then write a custom script
// adapted to the current request.
type MCPGetScriptExamplesResponse struct {
	Examples []MCPScriptExample `json:"examples"`
	Count    int                `json:"count"`
}

// MCPGetAmApiDocsResponse is the full `am.*` reference. Markdown is
// intentional: every modern MCP client renders it readably in tool
// output, and the structured field lets the AI consume it without
// re-parsing free text.
type MCPGetAmApiDocsResponse struct {
	Markdown string `json:"markdown"`
	Version  string `json:"version"`
}
