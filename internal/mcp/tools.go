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

		// ---- P1-1: Runtime project switching ----

		{
			Name:        "mcp_list_projects",
			Description: "List all projects available to the MCP server, plus the currently bound project ID (if any). Returns {\"projects\":[...],\"bound_id\":\"...\",\"environment_id\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "mcp_bind_project",
			Description: "Switch the bound project and (optionally) the active environment at runtime. Does not restart the MCP server. Pass an empty project_id to unbind. Returns {\"project_id\":\"...\",\"environment_id\":\"...\",\"previous_id\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"project_id": map[string]interface{}{
						"type":        "string",
						"description": "ID of the project to bind. Empty string unbinds.",
					},
					"environment_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional environment ID to make active. Empty string means no active environment.",
					},
				},
				"required": []string{"project_id"},
			},
		},

		// ---- P1-2: History reading tools ----

		{
			Name:        "mcp_list_history",
			Description: "List recent request-history entries with optional filters: limit (default 50), project_name, method, status_code, keyword. Returns {\"entries\":[...],\"limit\":N,\"count\":N}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "Maximum number of entries to return. Defaults to 50.",
					},
					"project_name": map[string]interface{}{
						"type":        "string",
						"description": "Fuzzy match on project name.",
					},
					"method": map[string]interface{}{
						"type":        "string",
						"description": "Exact-match HTTP method (GET, POST, ...).",
					},
					"status_code": map[string]interface{}{
						"type":        "integer",
						"description": "Exact-match HTTP status code (e.g. 200, 404, 500).",
					},
					"keyword": map[string]interface{}{
						"type":        "string",
						"description": "Comprehensive keyword applied across URL and request name.",
					},
				},
			},
		},
		{
			Name:        "mcp_get_history_entry",
			Description: "Fetch a single history entry (including its detail-file payload) by ID. Returns {\"entry\":{...}} or empty entry if not found.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "History entry ID.",
					},
				},
				"required": []string{"id"},
			},
		},
		{
			Name:        "mcp_clear_history",
			Description: "Delete ALL request-history entries. Requires confirm=true to prevent accidental clearing. Returns {\"success\":true,\"message\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"confirm": map[string]interface{}{
						"type":        "boolean",
						"description": "Must be true to actually clear history. Pass false to be a no-op.",
					},
				},
				"required": []string{"confirm"},
			},
		},

		// ---- Script help (C-plan) ----
		// Two reference tools that close the AI knowledge gap: a full
		// am.* API reference, and a catalog of worked pre/post script
		// examples. AI clients should call these BEFORE writing
		// mcp_create_script / mcp_update_script content. See
		// internal/mcp/script_help.go for source of truth.

		{
			Name: "mcp_get_am_api_docs",
			Description: "Return the full `am.*` API reference for apiman pre/post " +
				"scripts (the runtime injected into every script's JS VM). " +
				"**Call this first** when writing a script via mcp_create_script / " +
				"mcp_update_script — am.* methods are not discoverable from " +
				"the rest of the tool catalog. The response is Markdown: " +
				"{markdown, version}. Summary of what is covered: " +
				"console (log/info/warn/error), " +
				"am.globals (get/set/unset — persisted globals), " +
				"am.environment (get — read-only), " +
				"am.locals (get/set/unset — per-chain scratch), " +
				"am.request (mutate outgoing request in pre-script only), " +
				"am.response (read in post-script only), " +
				"am.test + am.expect (assertions), " +
				"am.crypto (HMAC, hash, base64, AES, RSA). " +
				"Plus: execution order, common pitfalls, variable priority.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name: "mcp_get_script_examples",
			Description: "Return a catalog of worked pre/post script examples. " +
				"**Call this when you need to write a script that does a " +
				"common pattern** (signing, token extraction, assertions, " +
				"URL templating, body signing, cookie capture). Each example " +
				"has a stable id you can reference (e.g. \"signing\", \"token_extract\"). " +
				"Response shape: {examples: [{id, title, description, stage, code}], count}. " +
				"Use stage=\"pre\" or \"post\" to filter, omit for all.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"stage": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"pre", "post", "either"},
						"description": "Filter examples by stage. Omit to return all.",
					},
				},
			},
		},

		// ---- P1-3: Environment CRUD ----

		{
			Name:        "mcp_create_environment",
			Description: "Create a new environment in the bound project. mark must be one of 'dev' or 'test'; pre/prod/empty are rejected (production-grade environments are deliberately kept out of MCP reach). Returns {\"environment\":{\"id\":\"...\",\"name\":\"...\",\"mark\":\"...\",\"variables\":{...}}}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Display name for the new environment.",
					},
					"mark": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"dev", "test"},
						"description": "Lifecycle stage. Only 'dev' and 'test' are accepted from MCP; other values return an error.",
					},
					"variables": map[string]interface{}{
						"type":                 "object",
						"description":          "Map of key->value string variables.",
						"additionalProperties": map[string]interface{}{"type": "string"},
					},
				},
				"required": []string{"name", "mark"},
			},
		},
		{
			Name:        "mcp_update_environment",
			Description: "Update an existing environment. name, variables, and mark are all optional; omitted fields keep their previous value. mark, when provided, must be 'dev' or 'test' — pre/prod/empty are rejected. Requires a bound project.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "Environment ID to update.",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "New display name.",
					},
					"mark": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"dev", "test"},
						"description": "New lifecycle mark. Omit (or pass empty) to keep current value; pass 'dev' or 'test' to update. Other values are rejected.",
					},
					"variables": map[string]interface{}{
						"type":                 "object",
						"description":          "Replacement variables map (string keys and values).",
						"additionalProperties": map[string]interface{}{"type": "string"},
					},
				},
				"required": []string{"id"},
			},
		},
		{
			Name:        "mcp_delete_environment",
			Description: "Delete an environment from the bound project. Returns {\"deleted\":true,\"id\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "Environment ID to delete.",
					},
				},
				"required": []string{"id"},
			},
		},
		{
			Name:        "mcp_set_active_environment",
			Description: "Switch the active environment at runtime (no server restart). Pass empty id to deactivate. SSE subscribers receive a message event. Returns {\"environment_id\":\"...\",\"previous_id\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "Environment ID to activate. Empty string clears the active environment.",
					},
				},
			},
		},

		// ---- Global variables: chainable scenarios ----

		{
			Name:        "mcp_list_globals",
			Description: "List ALL global variables (saved at ~/.apiman/variables.json). These are made available to the goja script runtime as am.globals.* and to {{name}} substitution. Returns {\"variables\":{...},\"count\":N}.",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "mcp_get_globals",
			Description: "Read a filtered subset of global variables. Provide either 'keys' (array of exact names) or 'prefix' (string prefix). With neither filter this returns everything, equivalent to mcp_list_globals. Returns {\"variables\":{...},\"count\":N}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"keys": map[string]interface{}{
						"type":        "array",
						"items":       map[string]interface{}{"type": "string"},
						"description": "Optional list of exact key names to read.",
					},
					"prefix": map[string]interface{}{
						"type":        "string",
						"description": "Optional string prefix; only keys starting with this prefix are returned.",
					},
				},
			},
		},
		{
			Name:        "mcp_set_global",
			Description: "Set (upsert) a single global variable. Persists immediately to ~/.apiman/variables.json so subsequent requests / scripts can read it via {{name}} or am.globals.get('name'). SSE subscribers receive a 'message' event with kind=globals_changed. Returns {\"key\":\"...\",\"value\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"key": map[string]interface{}{
						"type":        "string",
						"description": "Variable name.",
					},
					"value": map[string]interface{}{
						"type":        "string",
						"description": "Value to store. Empty string is allowed.",
					},
				},
				"required": []string{"key", "value"},
			},
		},
		{
			Name:        "mcp_unset_global",
			Description: "Delete a single global variable. Idempotent: returns existed=false if the key was not present (no error). SSE subscribers receive a 'message' event when an actual removal happens. Returns {\"key\":\"...\",\"existed\":bool}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"key": map[string]interface{}{
						"type":        "string",
						"description": "Variable name to remove.",
					},
				},
				"required": []string{"key"},
			},
		},

		// ---- P0/P1 write tools: request update/rename/move, folder rename/move,
		//      script create/update/delete ----

		{
			Name:        "mcp_update_request",
			Description: "Partially update a saved request. spec fields (method, http_url, body, body_type, headers, params, form_data, url_encoded) are merged: fields present in the spec arg overwrite the current value, fields absent are preserved. cases (array of {id, name, spec}) is full-replacement when provided (omit to keep existing). active_case_id updates only when explicitly passed. Returns {\"id\":\"...\",\"name\":\"...\",\"path\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"spec": map[string]interface{}{
						"type":        "object",
						"description": "Partial spec. Each field is optional; omit to keep current value.",
						"properties": map[string]interface{}{
							"method":    map[string]interface{}{"type": "string"},
							"http_url":  map[string]interface{}{"type": "string"},
							"headers":   map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "object"}},
							"params":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "object"}},
							"body":      map[string]interface{}{"type": "string"},
							"body_type": map[string]interface{}{"type": "string"},
							"form_data": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "object"}},
							"url_encoded": map[string]interface{}{
								"type":  "array",
								"items": map[string]interface{}{"type": "object"},
							},
						},
					},
					"cases": map[string]interface{}{
						"type":        "array",
						"description": "Replacement list of test cases. Omit to keep existing cases.",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"id":   map[string]interface{}{"type": "string"},
								"name": map[string]interface{}{"type": "string"},
								"spec": map[string]interface{}{"type": "object"},
							},
						},
					},
					"active_case_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional id of the case to mark active. Omit to keep current active case.",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_rename_request",
			Description: "Rename a saved request. Path does not change (paths are flat). Returns {\"id\":\"...\",\"name\":\"...\",\"path\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "New display name (must be non-empty and unique within the same folder).",
					},
				},
				"required": []string{"path", "name"},
			},
		},
		{
			Name:        "mcp_move_request",
			Description: "Move a request to a different folder (or project root). target_parent_path is the full folder path 'folder|project-id|folder-id'; empty string means project root. before_id optionally inserts before a specific sibling; empty means append. Returns {\"id\":\"...\",\"path\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Request path in format 'request|project-id|request-id'",
					},
					"target_parent_path": map[string]interface{}{
						"type":        "string",
						"description": "Optional full folder path 'folder|project-id|folder-id'. Empty or omitted means project root.",
					},
					"before_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional id of the sibling under target_parent_path to insert before. Empty means append.",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_rename_folder",
			Description: "Rename a folder. Path does not change (paths are flat). Returns {\"id\":\"...\",\"name\":\"...\",\"path\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Folder path in format 'folder|project-id|folder-id'",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "New folder name (must be non-empty and unique within the same parent).",
					},
				},
				"required": []string{"path", "name"},
			},
		},
		{
			Name:        "mcp_move_folder",
			Description: "Move a folder to a different parent (or project root). target_parent_path is the full folder path of the destination parent; empty string means project root. before_id optionally inserts before a specific sibling; empty means append. Returns {\"id\":\"...\",\"path\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Folder path in format 'folder|project-id|folder-id'",
					},
					"target_parent_path": map[string]interface{}{
						"type":        "string",
						"description": "Optional full folder path 'folder|project-id|folder-id'. Empty or omitted means project root.",
					},
					"before_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional id of the sibling under target_parent_path to insert before. Empty means append.",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "mcp_create_script",
			Description: "Create a new project-level script. Requires a bound project. Returns {\"id\":\"...\",\"name\":\"...\",\"description\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Display name (must be non-empty).",
					},
					"description": map[string]interface{}{
						"type":        "string",
						"description": "Optional human-readable description.",
					},
					"content": map[string]interface{}{
						"type":        "string",
						"description": "JavaScript source. Empty string is allowed.",
					},
				},
				"required": []string{"name", "content"},
			},
		},
		{
			Name:        "mcp_update_script",
			Description: "Partially update a project-level script. name, description, and content are all optional; omitted fields keep their previous value. Returns {\"id\":\"...\",\"name\":\"...\",\"description\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "Script ID to update.",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "New display name. Omit to keep current value.",
					},
					"description": map[string]interface{}{
						"type":        "string",
						"description": "New description. Omit to keep current value.",
					},
					"content": map[string]interface{}{
						"type":        "string",
						"description": "New JavaScript source. Omit to keep current content.",
					},
				},
				"required": []string{"id"},
			},
		},
		{
			Name:        "mcp_delete_script",
			Description: "Delete a project-level script by id. Idempotent: returns deleted=false when the script does not exist (no error). Returns {\"deleted\":bool,\"id\":\"...\"}.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"id": map[string]interface{}{
						"type":        "string",
						"description": "Script ID to delete.",
					},
				},
				"required": []string{"id"},
			},
		},
	}
}
