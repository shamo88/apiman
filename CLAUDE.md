# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apiman is a desktop API testing tool built with Wails v2 (Go + React/TypeScript). It mimics Postman/Apifox functionality with features like multi-project management, folder organization, environment variables, request cases (test cases per request), and JavaScript scripting support via goja (a JavaScript VM in Go).

## Build Commands

### Development
```bash
# Install frontend dependencies (only needed once or when package.json changes)
cd frontend && npm install

# Run the application in development mode with hot reload
wails dev

# Or run frontend dev server separately
cd frontend && npm run dev
```

### Build
```bash
# Build the production application
wails build

# Frontend only build
cd frontend && npm run build
```

### Go Commands
```bash
# Run Go tests
go test ./...

# Build Go backend (for testing without Wails)
go build -o apiman.exe
```

## Architecture

### Backend (Go) - `internal/`

- **config/** - Configuration manager handling `~/.apiman/` storage (environments, global variables, app config)
- **models/** - Data structures: `Environment`, `Project`, `Folder`, `CurlRequest`, `HttpRequestSpec`, `HttpRequestCase`, `CurlResponse`, `ProjectScript`
- **curl/** - HTTP request execution engine. `curl.go` handles raw curl parsing and HTTP execution; `exec_with_scripts.go` adds pre/post script execution via goja
- **project/** - `ProjectManager` handles project CRUD, folder management, request management, and Postman collection persistence (`collection.postman.json`)
- **postman/** - Postman collection format support (import/export)
- **script/** - JavaScript runtime using goja VM. `runtime.go` sets up the VM with `am` API object; `executor.go` runs scripts; `crypto.go` provides MD5/SHA/AES/RSA utilities
- **service/** - `Service` struct orchestrates all managers and provides business logic

### Frontend (React + TypeScript) - `frontend/src/`

- **App.tsx** - Main UI component (~2000 lines) containing all views: project tree, request editor, environment editor, response viewer
- **components/TitleBar.tsx** - Custom frameless window title bar with window controls
- **components/ScriptHelpWindow.tsx** - Floating draggable window for script API documentation
- **wailsjs/** - Auto-generated Wails bindings (do not edit manually). `go/main/App.js` provides Go method bindings; `go/models.ts` provides TypeScript models

### Data Storage

Projects are stored as directories under `~/.apiman/projects/` with this structure:
```
~/.apiman/projects/<project-id>/
├── collection.postman.json   # Project data (folders, requests, cases)
├── environments.json         # Environment configurations
├── variables.json            # Project-level variables
└── scripts/                 # Project scripts (*.js files)
```

Global config: `~/.apiman/config.json`

## Key Bindings (Wails)

Frontend calls Go methods via `wailsjs/go/main/App.js`. Key methods:
- `ExecuteHTTPRequest(spec)` - Execute HTTP request without scripts
- `ExecuteHTTPRequestWithScripts(projectID, envID, spec, preScriptID, postScriptID)` - Execute with pre/post scripts
- `GetRequest(path)` / `UpdateRequest(path, spec, cases, activeCaseID)` - Request CRUD
- `ListProjects()` / `CreateProject(name)` / `DeleteProject(id)` - Project management
- `LoadEnvironments(projectID)` / `CreateEnvironment(...)` - Environment management
- `ExtractVariables(text)` / `ReplaceVariables(text, variables)` - Variable substitution

## Variable Syntax

Uses `{{variableName}}` syntax for variable substitution. Variables are resolved from:
1. Environment variables (selected environment)
2. Project variables (`variables.json`)
3. Global variables (`~/.apiman/variables.json`)

## Request Cases

Each request can have multiple "cases" (test scenarios). Cases are stored as `HttpRequestCase` in the `CurlRequest.Cases` array with an `ActiveCaseID` to track which is currently selected.

## Scripting

Pre/post scripts run in a goja JavaScript VM with access to an `am` API object.

### am.globals（全局变量）
- `am.globals.get(key)` - Get global variable
- `am.globals.set(key, value)` - Set global variable (persists to variables.json)
- `am.globals.unset(key)` - Delete global variable

### am.environment（环境变量）
- `am.environment.get(key)` - Get environment variable value

### am.locals（局部变量）
- `am.locals.get(key)` - Get local variable
- `am.locals.set(key, value)` - Set local variable
- `am.locals.unset(key)` - Delete local variable

### am.request（请求信息）
- `am.request.method` - HTTP method
- `am.request.url` - Request URL
- `am.request.headers` - Headers object with `get(key)`, `set(key, value)`, `unset(key)`, `all()`, `_data`
- `am.request.params` - URL params object with `get(key)`, `set(key, value)`, `unset(key)`, `all()`, `_data`
- `am.request.body` - Body object with `type`, `raw`, `update(newBody)`

### am.response（响应信息）
- `am.response.code` - HTTP status code
- `am.response.headers.all()` - All response headers
- `am.response.text()` - Response body as text
- `am.response.json()` - Response body parsed as JSON

### am.test & am.expect（测试断言）
- `am.test(name, fn)` - Define a test case
- `am.expect(actual)` - Chainable assertions: `.to.be()`, `.eql()`, `.include()`, `.beTrue()`, `.beFalse()`, `.have.property()`

### am.crypto（加密工具）
- Hash: `md5`, `sha1`, `sha256`, `sha512`
- Encode: `base64Encode`, `base64Decode`, `base64URLEncode`, `base64URLDecode`
- HMAC: `hmacSHA256`, `hmacSHA1`
- AES: `aesEncrypt`, `aesDecrypt`, `aesEncryptWithIV`, `aesDecryptWithIV`
- RSA: `rsaEncrypt`, `rsaDecrypt`, `rsaSign`, `rsaVerify`, `rsaEncryptOAEP`, `rsaDecryptOAEP`, `generateKeyPair`
- Other: `randomString(length)`, `formatJSON(obj)`

## Window Configuration

The app runs frameless (`Frameless: true` in `main.go`). The custom title bar is in `frontend/src/components/TitleBar.tsx` which calls Wails runtime methods for window minimize/close/maximize.
