package mcp

// GetToolDefinitions returns all available MCP tools.
func GetToolDefinitions() []MCPTool {
	return []MCPTool{
		{
			Name:        "mcp_list_apis",
			Description: "List all APIs (requests) in the bound project, including folders and multi-level hierarchy.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "mcp_list_scripts",
			Description: "List all scripts in the bound project. Returns only id, name, and description.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "mcp_get_request",
			Description: "Get detailed information about a specific request including headers, params, body, and scripts.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_create_case",
			Description: "Create a new test case for a specific request.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"case_data": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"name": map[string]interface{}{
								"type": "string",
							},
							"spec": map[string]interface{}{
								"type": "object",
								"properties": map[string]interface{}{
									"method":    map[string]interface{}{"type": "string"},
									"http_url":  map[string]interface{}{"type": "string"},
									"headers":   map[string]interface{}{"type": "array"},
									"params":    map[string]interface{}{"type": "array"},
									"body":      map[string]interface{}{"type": "string"},
									"body_type": map[string]interface{}{"type": "string"},
								},
							},
						},
						"required": []string{"name", "spec"},
					},
				},
				"required": []string{"path", "case_data"},
			},
		},
		{
			Name:        "mcp_update_case",
			Description: "Update an existing test case for a specific request.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"case_id": map[string]interface{}{
						"type":        "string",
						"description": "The ID of the case to update",
					},
					"case_data": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"name": map[string]interface{}{
								"type": "string",
							},
							"spec": map[string]interface{}{
								"type": "object",
								"properties": map[string]interface{}{
									"method":    map[string]interface{}{"type": "string"},
									"http_url":  map[string]interface{}{"type": "string"},
									"headers":   map[string]interface{}{"type": "array"},
									"params":    map[string]interface{}{"type": "array"},
									"body":      map[string]interface{}{"type": "string"},
									"body_type": map[string]interface{}{"type": "string"},
								},
							},
						},
					},
				},
				"required": []string{"path", "case_id", "case_data"},
			},
		},
		{
			Name:        "mcp_create_request",
			Description: "Create a new API request in the bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"parent_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional parent folder ID. If not specified, creates at root level.",
					},
					"spec": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"name":      map[string]interface{}{"type": "string"},
							"method":    map[string]interface{}{"type": "string"},
							"http_url":  map[string]interface{}{"type": "string"},
							"headers":   map[string]interface{}{"type": "array"},
							"params":    map[string]interface{}{"type": "array"},
							"body":      map[string]interface{}{"type": "string"},
							"body_type": map[string]interface{}{"type": "string"},
						},
						"required": []string{"name", "method", "http_url"},
					},
				},
				"required": []string{"spec"},
			},
		},
		{
			Name:        "mcp_create_folder",
			Description: "Create a new folder in the bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"parent_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional parent folder ID. If not specified, creates at root level.",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "The name of the folder to create",
					},
				},
				"required": []string{"name"},
			},
		},
		{
			Name:        "mcp_execute_request",
			Description: "Execute an HTTP request by its path. Optionally specify a case_id to use that test case, and pre/post script IDs for script execution.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"case_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional case ID to execute. If not specified, uses the active case.",
					},
					"pre_script_ids": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "string",
						},
						"description": "Optional array of pre-script IDs to execute before the request.",
					},
					"post_script_ids": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "string",
						},
						"description": "Optional array of post-script IDs to execute after the response is received.",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_execute_raw",
			Description: "Execute a raw HTTP request without referencing a saved request. Useful for quick API tests. Supports scripts from the bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"method": map[string]interface{}{
						"type":        "string",
						"description": "HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)",
					},
					"http_url": map[string]interface{}{
						"type":        "string",
						"description": "Full URL or path for the request",
					},
					"headers": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"key":     map[string]interface{}{"type": "string"},
								"value":   map[string]interface{}{"type": "string"},
								"enabled": map[string]interface{}{"type": "boolean"},
							},
						},
					},
					"params": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"key":     map[string]interface{}{"type": "string"},
								"value":   map[string]interface{}{"type": "string"},
								"enabled": map[string]interface{}{"type": "boolean"},
							},
						},
					},
					"body": map[string]interface{}{
						"type":        "string",
						"description": "Request body content",
					},
					"body_type": map[string]interface{}{
						"type":        "string",
						"description": "Body type: raw, form_data, urlencoded, etc.",
					},
					"pre_script_ids": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "string",
						},
						"description": "Optional array of pre-script IDs to execute before the request.",
					},
					"post_script_ids": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "string",
						},
						"description": "Optional array of post-script IDs to execute after the response is received.",
					},
				},
				"required": []string{"method", "http_url"},
			},
		},
		{
			Name:        "mcp_delete_request",
			Description: "Delete a saved API request from the bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_delete_folder",
			Description: "Delete a folder and all its contents (subfolders and requests) from the bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Folder path in format 'folder|project-id|folder-id'",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_delete_case",
			Description: "Delete a test case from a specific request.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"case_id": map[string]interface{}{
						"type":        "string",
						"description": "The ID of the case to delete",
					},
				},
				"required": []string{"path", "case_id"},
			},
		},
		{
			Name:        "mcp_list_environments",
			Description: "List all environments in the bound project.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "mcp_get_case",
			Description: "Get detailed information about a specific test case.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"case_id": map[string]interface{}{
						"type":        "string",
						"description": "The ID of the case to retrieve",
					},
				},
				"required": []string{"path", "case_id"},
			},
		},
		{
			Name:        "mcp_search_apis",
			Description: "Search APIs (requests) in the bound project by name or URL keyword.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"keyword": map[string]interface{}{
						"type":        "string",
						"description": "Keyword to search for in request name or URL",
					},
				},
				"required": []string{"keyword"},
			},
		},
	}
}
