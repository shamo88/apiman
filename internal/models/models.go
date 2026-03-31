package models

import (
	"encoding/json"
	"time"
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
	ActiveCaseID string            `json:"active_case_id,omitempty"`
	// InterfaceSpec is the collection item's root request (item.Request) when the item has cases.
	// It is independent from per-case specs; the flattened Method/URL/Body fields still reflect the active case for convenience.
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
	StatusCode int               `json:"status_code"`
	Headers    map[string][]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   int64             `json:"duration"`
	Error      string            `json:"error"`
	ScriptLogs []string          `json:"script_logs,omitempty"`
	Tests      []TestResult      `json:"tests,omitempty"`
	Cookies    []ResponseCookie  `json:"cookies,omitempty"`
}

type TestResult struct {
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Message  string `json:"message,omitempty"`
	Duration int64  `json:"duration"`
}
