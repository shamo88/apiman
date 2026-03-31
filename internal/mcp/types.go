package mcp

import "apiman/internal/models"

// MCP JSON-RPC 2.0 Types

type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string          `json:"method"`
	Params  map[string]any  `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  any        `json:"result,omitempty"`
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
	ProtocolVersion string         `json:"protocolVersion"`
	Capabilities     MCPCapabilities `json:"capabilities"`
	ServerInfo       MCPServerInfo   `json:"serverInfo"`
}

type MCPCapabilities struct {
	Tools   any `json:"tools"`
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
	Folders   []*models.MCPAPIInfo `json:"folders"`
	Requests  []*models.MCPAPIInfo `json:"requests"`
}

// Create Case Response

type MCPCreateCaseResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
