package models

import (
	"encoding/json"
	"time"
)

// HistorySourceType represents the source of a history entry.
type HistorySourceType string

const (
	HistorySourceGUI HistorySourceType = "GUI"
	HistorySourceMCP HistorySourceType = "MCP"
)

type Environment struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Variables map[string]string `json:"variables"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Folder struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"project_id"`
	ParentID  string    `json:"parent_id"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"created_at"`
}

// RequestKeyVal is a key/value row with an on/off flag (headers, query params).
type RequestKeyVal struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// RequestPair is a key/value row for form body fields (with enable flag).
type RequestPair struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// UnmarshalJSON sets Enabled to true when "enabled" is absent (older collections).
func (p *RequestPair) UnmarshalJSON(data []byte) error {
	aux := struct {
		Key     string `json:"key"`
		Value   string `json:"value"`
		Enabled *bool  `json:"enabled"`
	}{}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	p.Key = aux.Key
	p.Value = aux.Value
	if aux.Enabled != nil {
		p.Enabled = *aux.Enabled
	} else {
		p.Enabled = true
	}
	return nil
}

// HttpRequestSpec is the structured request shape (Postman-aligned) used for save and execute.
type HttpRequestSpec struct {
	Method     string          `json:"method"`
	HttpURL    string          `json:"http_url"`
	Headers    []RequestKeyVal `json:"headers"`
	Params     []RequestKeyVal `json:"params"`
	Body       string          `json:"body"`
	BodyType   string          `json:"body_type"`
	FormData   []RequestPair   `json:"form_data"`
	UrlEncoded []RequestPair   `json:"url_encoded"`
	Cookies    []RequestKeyVal `json:"cookies"`
}

// HttpRequestCase is a named variant of a request under one interface (用例).
type HttpRequestCase struct {
	ID   string          `json:"id"`
	Name string          `json:"name"`
	Spec HttpRequestSpec `json:"spec"`
}

type CurlRequest struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	ProjectID    string    `json:"project_id"`
	FolderID     string    `json:"folder_id"`
	Path         string    `json:"path"`
	Content      string    `json:"content,omitempty"`
	PreScripts   []string  `json:"pre_scripts,omitempty"`
	PostScripts  []string  `json:"post_scripts,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Method     string          `json:"method,omitempty"`
	HttpURL    string          `json:"http_url,omitempty"`
	Headers    []RequestKeyVal `json:"headers,omitempty"`
	Params     []RequestKeyVal `json:"params,omitempty"`
	Body       string          `json:"body,omitempty"`
	BodyType   string          `json:"body_type,omitempty"`
	FormData   []RequestPair   `json:"form_data,omitempty"`
	UrlEncoded []RequestPair   `json:"url_encoded,omitempty"`

	Cases        []HttpRequestCase `json:"cases,omitempty"`
	// InterfaceSpec is the collection item's root request (item.Request) when the item has cases.
	InterfaceSpec *HttpRequestSpec `json:"interface_spec,omitempty"`
}

// SpecFromCurlRequest builds HttpRequestSpec from flattened CurlRequest fields.
func SpecFromCurlRequest(cr *CurlRequest) HttpRequestSpec {
	if cr == nil {
		return HttpRequestSpec{}
	}
	return HttpRequestSpec{
		Method:     cr.Method,
		HttpURL:    cr.HttpURL,
		Headers:    append([]RequestKeyVal(nil), cr.Headers...),
		Params:     append([]RequestKeyVal(nil), cr.Params...),
		Body:       cr.Body,
		BodyType:   cr.BodyType,
		FormData:   append([]RequestPair(nil), cr.FormData...),
		UrlEncoded: append([]RequestPair(nil), cr.UrlEncoded...),
	}
}

type ProjectScript struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Path        string    `json:"path"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ResponseCookie 响应Cookie结构
type ResponseCookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain"`
	Path     string `json:"path"`
	Expires  string `json:"expires"`
	HttpOnly bool   `json:"http_only"`
	Secure   bool   `json:"secure"`
}

type CurlResponse struct {
	StatusCode  int               `json:"status_code"`
	Headers     map[string][]string `json:"headers"`
	Body        string            `json:"body"`
	BodyBase64  string            `json:"body_base64,omitempty"`
	IsBinary    bool              `json:"is_binary"`
	Duration    int64             `json:"duration"`
	Error       string            `json:"error"`
	ScriptLogs  []string          `json:"script_logs,omitempty"`
	Tests       []TestResult      `json:"tests,omitempty"`
	Cookies     []ResponseCookie  `json:"cookies,omitempty"`
}

type TestResult struct {
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Message  string `json:"message,omitempty"`
	Duration int64  `json:"duration"`
}

// MCPAPIInfo represents an API item in the project tree (for MCP).
type MCPAPIInfo struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Method   string         `json:"method,omitempty"`
	URL      string         `json:"url,omitempty"`
	Path     string         `json:"path,omitempty"`
	Children []*MCPAPIInfo  `json:"children,omitempty"`
}

// MCPScriptInfo represents a script's metadata (for MCP list_scripts).
type MCPScriptInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// MCPRequestDetail represents full request details (for MCP get_request).
type MCPRequestDetail struct {
	ID          string               `json:"id"`
	Name        string               `json:"name"`
	Method      string               `json:"method"`
	URL         string               `json:"url"`
	Headers     []RequestKeyVal      `json:"headers"`
	Params      []RequestKeyVal      `json:"params"`
	Body        string               `json:"body"`
	BodyType    string               `json:"body_type"`
	PreScripts  []string             `json:"pre_scripts"`
	PostScripts []string             `json:"post_scripts"`
	Cases       []HttpRequestCase    `json:"cases"`
}

// MCPCaseData represents case creation input (for MCP create_case).
type MCPCaseData struct {
	Name string            `json:"name"`
	Spec HttpRequestSpec  `json:"spec"`
}

// RequestHistory records a single HTTP request execution.
type RequestHistory struct {
	ID          string            `json:"id"`
	Source      HistorySourceType `json:"source"`
	SourceTool  string            `json:"source_tool"`
	ProjectID   string            `json:"project_id"`
	ProjectName string            `json:"project_name"`
	RequestName string            `json:"request_name"`
	RequestPath string            `json:"request_path"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Spec        HttpRequestSpec   `json:"spec"`
	Response    *CurlResponse     `json:"response"`
	CreatedAt   time.Time         `json:"created_at"`
}

// HistoryEntry is a lightweight summary for listing.
type HistoryEntry struct {
	ID          string            `json:"id"`
	Source      HistorySourceType `json:"source"`
	SourceTool  string            `json:"source_tool"`
	ProjectName string            `json:"project_name"`
	RequestName string            `json:"request_name"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	StatusCode  int               `json:"status_code"`
	Duration    int64             `json:"duration"`
	CreatedAt   time.Time         `json:"created_at"`
}

// HistoryIndex is the index file entry for a history item.
type HistoryIndex struct {
	ID           string            `json:"id"`
	Timestamp    time.Time         `json:"timestamp"`
	Source       HistorySourceType `json:"source"`
	SourceTool   string            `json:"source_tool"`
	ProjectID    string            `json:"project_id"`
	ProjectName  string            `json:"project_name"`
	RequestName  string            `json:"request_name"`
	RequestPath  string            `json:"request_path"`
	Method       string            `json:"method"`
	URL          string            `json:"url"`
	Status       string            `json:"status"`
	ResponseCode int               `json:"response_code"`
	Duration     int64             `json:"duration"`
	DetailFile   string            `json:"detail_file"`
}

// HistorySearchParams defines search/filter parameters for history.
type HistorySearchParams struct {
	Project  string `json:"project"`  // project name fuzzy search
	Name     string `json:"name"`     // request name fuzzy search
	URL      string `json:"url"`      // URL fuzzy search
	Method   string `json:"method"`   // HTTP method exact match
	Status   int    `json:"status"`   // status code exact match
	Source   string `json:"source"`   // source exact match (GUI/MCP)
	Tool     string `json:"tool"`     // MCP tool name exact match
	From     string `json:"from"`     // start time (YYYY-MM-DD)
	To       string `json:"to"`       // end time (YYYY-MM-DD)
	Keyword  string `json:"keyword"`  // comprehensive search (URL + request name)
}
