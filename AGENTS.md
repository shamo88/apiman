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
```

## Architecture

### Stack
- **Go**: 1.24.0 (check `go.mod`, not README)
- **Frontend**: React 18.2 + TypeScript 4.6 + Vite 3.x
- **UI**: Ant Design 6.3.4 + @ant-design/icons 6.1.0
- **State**: Zustand (7 stores in `frontend/src/store/`)
- **Desktop**: Wails v2.11.0, frameless window

### Key Entry Points
- `main.go` - App entry, frameless window config, MCP auto-start
- `app.go` - Wails app class (~380 methods bound to frontend)
- `internal/` - All Go business logic (config, curl, git, mcp, models, postman, project, script, service)
- `frontend/src/App.tsx` - Main React component

### Data Storage
- Windows: `C:\Users\{username}\.apiman\`
- macOS: `~/.apiman/`
- Linux: `~/.config/apiman/`

```
~/.apiman/
├── projects/                    # Project data
│   └── {slug}__{uuid}/
│       ├── meta.json            # Project metadata
│       ├── collection.postman.json  # API collection (Postman v2.1 format)
│       └── scripts/             # Project scripts
├── config.json                  # App config (proxy, theme, gitSync, mcp)
├── environments.json            # Environment variables
└── variables.json              # Global variables
```

## Frontend Conventions

### State Management (Zustand)
```typescript
// Stores in frontend/src/store/
useProjectStore   // Projects, tabs, tree
useUIStore        // Theme, modals
useWorkspaceStore // Active request, cases
useEnvironmentStore
useScriptStore
useHistoryStore
```

### Components
```
frontend/src/components/
├── TitleBar/         # Custom frameless window title bar
├── HomePage/         # Project list page
├── ProjectWorkspace/ # Main editor area
├── ApiTree/          # Sidebar folder/request tree
├── RequestPanel/     # Request editor (params, headers, body, scripts)
├── ResponsePanel/    # Response viewer
├── ScriptHelp/       # Floating script API docs
├── MCPSettings/      # MCP server config modal
└── modals/           # Various dialogs (create, rename, case, etc.)
```

### Variable Syntax
- `{{variableName}}` - variable substitution
- Dynamic generators: `{{$date.now}}`, `{{$date.timestamp}}`, `{{$uuid}}`, `{{$random.int}}`, `{{$random.alpha(10)}}`

## HTTP Method Colors
| Method    | Color     | Sidebar Label |
|-----------|-----------|---------------|
| GET       | #61affe   | GET           |
| POST      | #49cc90   | POST          |
| PUT       | #fca130   | PUT           |
| DELETE    | #93e3e3   | DEL           |
| PATCH     | #50e3c2   | PAT           |
| OPTIONS   | #0d5aa7   | OPT           |
| HEAD      | #9012fe   | HEAD          |

## Theme
- Light: default
- Dark: `--bg-primary: rgb(36, 36, 36)` (#242424)
- Config: `~/.apiman/config.json` → `ui.theme`

## Window System
- Frameless window (`Frameless: true` in `main.go`)
- Custom title bar in `frontend/src/components/TitleBar/TitleBar.tsx`
- Drag region: `--wails-draggable: drag` / `no-drag` for buttons
- Controls use Wails runtime: `WindowMinimise()`, `WindowToggleMaximise()`, `Quit()`

## Script Runtime (`am` API)
- Engine: goja (JavaScript VM in Go)
- Pre-script: runs before HTTP request
- Post-script: runs after response (tests)
- Crypto: md5, sha1/256/512, base64, hmac, aes, rsa

## MCP Server
- Runs in-process on port 3847 (default)
- Auth: Bearer token in `Authorization` header
- Config: `~/.apiman/config.json` → `mcp`
- Endpoints: `POST /mcp/streamable`, `GET /mcp/health`, `GET /mcp/info`

## Code Generation
- Wails auto-generates bindings: `frontend/wailsjs/go/main/App.js` (JS) and `.d.ts` (TS)
- After modifying `app.go`, regenerate with `wails dev` or `wails generate bindings`

## Common Mistakes
1. **Go version**: README says 1.21+, but `go.mod` requires 1.24.0
2. **Frontend deps**: Always `cd frontend && npm install` first
3. **Variable syntax**: Must be `{{name}}` not `${name}` or `@name@`
4. **wailsjs regeneration**: Edit `app.go` → bindings auto-regenerate in dev mode
5. **collection.postman.json**: Single source of truth for project data - don't edit manually
