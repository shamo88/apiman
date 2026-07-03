# Apiman

#### Description
Apiman is a desktop API testing tool built with Wails v2 (Go + React/TypeScript), similar to Postman/Apifox.

#### Features
- Multi-project management
- Folder organization
- Environment variables
- Request cases (multiple test scenarios per request)
- JavaScript scripting support (via goja)
- Git sync backup
- Dark/Light theme

#### Architecture

**Backend (Go)** - `internal/`
- `config/` - Configuration management, handles `~/.apiman/` storage
- `models/` - Data structures
- `curl/` - HTTP request execution engine
- `git/` - Git sync functionality
- `project/` - Project management
- `service/` - Business logic orchestration

**Frontend (React + TypeScript)** - `frontend/src/`
- `App.tsx` - Main UI component
- `components/` - Title bar, script help window components
- `wailsjs/` - Auto-generated Wails bindings

#### Installation

1. Install Go 1.21+
2. Install Node.js 18+
3. Install Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
4. Install frontend dependencies: `cd frontend && npm install`

#### Build Commands

```bash
# Development mode
wails dev

# Production build
wails build

# Frontend only build
cd frontend && npm run build
```

#### Logs

Log file location: `~/.apiman/logs/apiman.log`

Logs support automatic rotation, max 100MB per file.

#### Data Storage

Projects are stored in `~/.apiman/projects/` with each project containing:
- `collection.postman.json` - Project data
- `environments.json` - Environment configurations
- `variables.json` - Project variables
- `scripts/` - Project scripts

#### MCP Server

Apiman ships with a built-in [Model Context Protocol](https://modelcontextprotocol.io) server so AI clients (Claude Desktop, opencode, Cline, etc.) can operate projects, execute HTTP requests, and manage environments/variables through standard JSON-RPC 2.0.

**Protocol**: MCP `2024-11-05` (JSON-RPC 2.0 over HTTP)
**Endpoint**: `http://localhost:3847/mcp/streamable`
**Server-Sent Events**: `http://localhost:3847/mcp/events` (real-time tool-list changes)
**Health**: `http://localhost:3847/mcp/health` (no auth)
**Server info**: `http://localhost:3847/mcp/info` (no auth)
**Capabilities**: `tools` only (no Resources/Prompts — apiman is an executor-type server)

**Auth**: Bearer token in `Authorization` header. Endpoints `/mcp/health` and `/mcp/info` are public.

**Setup**: apiman Settings → MCP Server → enable / port / API key. Initial project binding is optional; switch at runtime via the status bar in the title bar or the `mcp_bind_project` tool.

**Client config example** (opencode / Claude Desktop):

```json
{
  "mcpServers": {
    "apiman": {
      "url": "http://localhost:3847/mcp/streamable",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

##### Tool Matrix (36 tools)

| Category | Tools |
|---|---|
| **Project** | `list_projects` · `bind_project` |
| **Folder** | `create_folder` · `rename_folder` · `move_folder` · `delete_folder` |
| **Request** | `create_request` · `get_request` · `update_request` · `rename_request` · `move_request` · `delete_request` · `search_apis` · `list_apis` |
| **Case** | `create_case` · `get_case` · `update_case` · `delete_case` |
| **Script** | `list_scripts` · `create_script` · `update_script` · `delete_script` |
| **Environment** | `list_environments` · `create_environment` · `update_environment` · `delete_environment` · `set_active_environment` |
| **Globals** | `list_globals` · `get_globals` · `set_global` · `unset_global` |
| **History** | `list_history` · `get_history_entry` · `clear_history` |
| **Execute** | `execute_request` · `execute_raw` |

All CRUD loops closed for: project, folder, request, case, script, environment, globals, runtime project binding, runtime environment activation.

##### Key Rules

- **Environment mark filter**: only `dev` / `test`-marked environments are visible / activatable via MCP. `pre` / `prod` / unmarked are rejected to prevent AI from touching production.
- **update_* semantics**: every `update_*` tool is PATCH / merge — fields not present in the call keep their previous value; nothing is silently cleared.
- **`execute_raw`**: works without a bound project (uses global vars only, no env substitution). Supports `body` / `body_type` / `headers` / `params` / `form_data` / `url_encoded`.
- **Path formats**: Request `request\|<project-id>\|<request-id>`, Folder `folder\|<project-id>\|<folder-id>`, Case `requestCase\|<project-id>\|<request-id>\|<case-id>`
- **Tolerant value typing**: `params[].value` / `headers[].value` / `form_data[].value` accept string / number / bool / null; the server coerces to string.

##### Script Context (`am.*` objects)

pre / post scripts run inside a goja JS VM with these globals:

| Object | Fields |
|---|---|
| `am.request` | `method` · `url` · `headers.get/set/unset/all` · `params.get/set/unset/all` · `body.type` · `body.raw` · `body.update(...)` |
| `am.response` | `code` · `status_code` · `duration` · `elapsed_ms` · `headers.all()` · `text()` · `json()` |
| `am.globals` | `get(key)` · `set(key, value)` · `unset(key)` |
| `am.environment` | `get(key)` |
| `am.locals` | `get(key)` · `set(key, value)` · `unset(key)` — per request |
| `am.test(name, fn)` · `am.expect(actual)` | assertions: `.to.be()` / `.eql()` / `.include()` / `.beTrue()` / `.beFalse()` / `.have.property()` |

**Variable priority** (high → low): `am.locals.set` in pre-script → environment vars → globals → parent folder → project default.
