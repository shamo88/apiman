# AGENTS.md - Apiman Developer Guide

## Project Overview

Apiman is a Wails v2 desktop API testing tool (Go + React/TypeScript), similar to Postman/Apifox.

## Build Commands

```bash
# Install frontend deps (once or when package.json changes)
cd frontend && npm install

# Development mode with hot reload
wails dev

# Frontend only (separate terminal)
cd frontend && npm run dev

# Production build
wails build

# Go backend test (without Wails)
go build -o apiman.exe

# Run Go tests
go test ./...
```

## Architecture

### Stack
- **Go**: 1.25.0 (check `go.mod`, not README)
- **Frontend**: React 18.2 + TypeScript 5.6 + Vite 5.x
- **UI**: Ant Design 6.3.4 + @ant-design/icons 6.1.0
- **State**: Zustand 5.0.12 (8 stores in `frontend/src/store/`)
- **Desktop**: Wails v2.11.0, frameless window

### Key Entry Points
- `main.go` - App entry, frameless window config, MCP auto-start
- `app.go` - Wails app class (binds to frontend via ~380 methods)
- `internal/` - All Go business logic
- `frontend/src/App.tsx` - Main React component (~2000 lines)

### Internal Packages (`internal/`)
```
config/      # App config, encrypted storage
crypto/      # Key derivation, encryption (NaCl secretbox)
curl/        # HTTP execution engine, cookie handling
git/         # Git sync operations
history/     # Request history storage
logger/      # Logging with lumberjack rotation
mcp/         # MCP server implementation (port 3847)
models/      # Data structures
openapi/     # OpenAPI import
postman/     # Postman collection import
project/     # Project tree, groups state
script/      # goja JS runtime, am API (crypto, executor)
service/     # Business logic orchestration
```

### Data Storage
```
~/.apiman/                         # Windows: C:\Users\{user}\.apiman\
├── projects/
│   └── {slug}__{uuid}/
│       ├── meta.json               # Project metadata
│       ├── collection.postman.json # API collection (Postman v2.1 format, single source of truth)
│       ├── environments.json       # Environment configurations
│       ├── variables.json         # Project-level variables
│       └── scripts/               # Project scripts (*.js)
├── config.json                    # App config (proxy, theme, gitSync, mcp)
├── environments.json              # Environment variables (legacy)
├── variables.json                # Global variables
└── history/                       # Request history
```

## Frontend Conventions

### State Management (Zustand)
Stores in `frontend/src/store/`:
```
useProjectStore    // Projects, tabs, tree, drag state
useUIStore         // Theme, modals
useWorkspaceStore  // Active request, cases
useEnvironmentStore
useScriptStore
useHistoryStore
useDragStore       // Drag and drop state
useModalStore      # Modal visibility states
```

### Hooks Pattern (`frontend/src/hooks/`)
Custom hooks separate concerns:
- `useProjects`, `useEnvironments`, `useScripts` - Data fetching
- `useProjectHandlers`, `useWorkspaceHandlers`, `useEnvironmentHandlers` - Business logic
- `useRequest` - Request execution
- `useHistory` - History management
- `useMCP` - MCP server interaction
- `useKeyboardShortcuts` - Keyboard shortcuts with `SHORTCUTS_LIST`

### Components Structure
```
frontend/src/components/
├── TitleBar/          # Custom frameless window title bar + settings modal
├── HomePage/          # Project list page with project groups
├── ProjectWorkspace/  # Main editor area (env/script/workspace panels)
├── ApiTree/           # Sidebar folder/request tree with drag reorder
├── RequestPanel/      # Request editor (params, headers, body, scripts)
├── ResponsePanel/     # Response viewer with JSON formatting
├── ScriptHelp/        # Floating script API docs window
├── MCPSettings/       # MCP server config modal
├── VariableInput/     # Reusable variable-aware input component
└── modals/            # Various dialogs (create, rename, import, etc.)
```

## Key Patterns

### Variable Syntax
- `{{variableName}}` - variable substitution (NOT `${name}` or `@name@`)
- Dynamic generators: `{{$date.now}}`, `{{$date.timestamp}}`, `{{$uuid}}`, `{{$random.int}}`, `{{$random.alpha(10)}}`

### Request Cases (用例)
Each request can have multiple named test scenarios (`HttpRequestCase`):
- Stored in `CurlRequest.Cases` array
- `ActiveCaseID` tracks currently selected case
- Cases can be created/updated via UI or MCP

### HTTP Method Colors
| Method   | Color     | Sidebar Label |
|----------|-----------|---------------|
| GET      | #61affe   | GET           |
| POST     | #49cc90   | POST          |
| PUT      | #fca130   | PUT           |
| DELETE   | #f93e3e   | DEL           |
| PATCH    | #50e3c2   | PAT           |
| OPTIONS  | #0d5aa7   | OPT           |
| HEAD     | #9012fe   | HEAD          |

## Script Runtime (`am` API)

Engine: goja (JavaScript VM in Go)
- Pre-script: runs before HTTP request (modify request)
- Post-script: runs after response (tests/assertions)

### am.globals（全局变量）
```javascript
am.globals.get(key)       // Get global variable
am.globals.set(key, value) // Set global variable (persists)
am.globals.unset(key)     // Delete global variable
```

### am.environment（环境变量）
```javascript
am.environment.get(key)   // Get environment variable value
```

### am.locals（局部变量）
```javascript
am.locals.get(key)        // Get local variable
am.locals.set(key, value) // Set local variable
am.locals.unset(key)      // Delete local variable
```

### am.request（请求信息）
```javascript
am.request.method          // HTTP method
am.request.url             // Request URL
am.request.headers.get(key) / .set(key, value) / .unset(key) / .all()
am.request.params.get(key) / .set(key, value) / .unset(key) / .all()
am.request.body.type       // body type
am.request.body.raw        // raw body content
am.request.body.update(newBody) // update body
```

### am.response（响应信息）
```javascript
am.response.code           // HTTP status code
am.response.headers.all()  // All response headers
am.response.text()         // Response body as text
am.response.json()         // Response body parsed as JSON
```

### am.test & am.expect（测试断言）
```javascript
am.test(name, fn)          // Define a test case
am.expect(actual)          // Chainable assertions
  .to.be() / .eql() / .include() / .beTrue() / .beFalse() / .have.property()
```

### am.crypto（加密工具）
- Hash: `md5`, `sha1`, `sha256`, `sha512`
- Encode: `base64Encode`, `base64Decode`, `base64URLEncode`, `base64URLDecode`
- HMAC: `hmacSHA256`, `hmacSHA1`
- AES: `aesEncrypt`, `aesDecrypt`, `aesEncryptWithIV`, `aesDecryptWithIV`
- RSA: `rsaEncrypt`, `rsaDecrypt`, `rsaSign`, `rsaVerify`, `rsaEncryptOAEP`, `rsaDecryptOAEP`, `generateKeyPair`
- Other: `randomString(length)`, `formatJSON(obj)`

## MCP Server

- Runs in-process on port 3847 (default, configurable)
- Auth: Bearer token in `Authorization` header
- Config: `~/.apiman/config.json` → `mcp`
- Endpoints: `POST /mcp/streamable`, `GET /mcp/health`, `GET /mcp/info`

### MCP Tools
| Tool | Description |
|------|-------------|
| `mcp_list_apis` | List all APIs in bound project |
| `mcp_list_scripts` | List all scripts in project |
| `mcp_get_request` | Get full request details |
| `mcp_create_case` | Create new test case for request |
| `mcp_update_case` | Update existing test case |
| `mcp_create_request` | Create new API in project |
| `mcp_create_folder` | Create new folder in project |
| `mcp_execute_request` | Execute saved HTTP request |
| `mcp_execute_raw` | Execute raw HTTP request |

### Path Formats
- Request: `request|project-id|request-id`
- Case: `requestCase|project-id|request-id|case-id`

## Settings Modal

Three tabs in **Settings** modal:
1. **通用 (General)** - Interface animation toggle, theme selection
2. **网络代理 (Proxy)** - HTTP/HTTPS/SOCKS5 proxy configuration
3. **Git 同步 (Git Sync)** - Remote repo URL, branch, access token

## Window System
- Frameless window (`Frameless: true` in `main.go`)
- **Default size**: 1300*900 (configured in `main.go`, not configurable via UI)
- Custom title bar: `frontend/src/components/TitleBar/TitleBar.tsx`
- Drag region: `--wails-draggable: drag` / `no-drag` for buttons
- Controls use Wails runtime: `WindowMinimise()`, `WindowToggleMaximise()`, `Quit()`

## Theme
- Light: default (white background)
- Dark: `--bg-primary: rgb(36, 36, 36)` (#242424)
- Config: `~/.apiman/config.json` → `ui.theme`

## Code Generation
- Wails auto-generates bindings: `frontend/wailsjs/go/main/App.js` (JS) and `.d.ts` (TS)
- After modifying `app.go`, bindings regenerate automatically in dev mode
- Manual regeneration: `wails generate bindings`

## Security Notes
- Sensitive config values encrypted with NaCl secretbox (AES-GCM equivalent)
- Git sync tokens stored encrypted, with legacy XOR obfuscation for backward compat
- Encryption key derived from machine-specific data (`internal/crypto/keys.go`)

## Common Mistakes
1. **Go version**: README says 1.21+, but `go.mod` requires **1.25.0**
2. **Frontend deps**: Always `cd frontend && npm install` first
3. **Variable syntax**: Must be `{{name}}` not `${name}` or `@name@`
4. **wailsjs regeneration**: Edit `app.go` → bindings auto-regenerate in dev mode
5. **collection.postman.json**: Single source of truth - don't edit manually
6. **Config encryption**: Use `decrypt()` function from `config` package when reading sensitive values
