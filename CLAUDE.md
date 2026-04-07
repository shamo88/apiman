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
- **git/** - Git sync functionality for backing up projects to remote repositories
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

## HTTP Methods

Supported HTTP methods with color coding:
| Method | Color | Sidebar Label |
|--------|-------|---------------|
| GET | #61affe (蓝) | GET |
| POST | #49cc90 (绿) | POST |
| PUT | #fca130 (橙) | PUT |
| DELETE | #f93e3e (红) | DEL |
| PATCH | #50e3c2 (青) | PAT |
| OPTIONS | #0d5aa7 (深蓝) | OPT |
| HEAD | #9012fe (紫) | HEAD |

## Theme Settings

The app supports light and dark themes. Theme can be changed in **Settings → General → Theme**:
- **浅色** - Light theme (default)
- **深色** - Dark theme with `rgb(36, 36, 36)` (#242424) as primary background color

Dark theme CSS variables are defined in `frontend/src/App.css` under `.theme-dark` class.

## Settings

The app has three settings tabs in **Settings** modal:

### 通用 (General)
- **接口列表动画** - Enable/disable animation effects in the API list
- **主题** - Choose between light and dark theme

### 网络代理 (Proxy)
- **启用代理** - Toggle proxy usage
- HTTP/HTTPS/SOCKS5 proxy server configuration with host and port

### Git 同步 (Git Sync)
- **启用 Git 同步** - Enable/disable automatic project backup to git repository
- **仓库地址** - Remote git repository URL
- **分支** - Branch name (default: main)
- **Access Token** - Authentication token for the repository

## MCP Server

Apiman 内置 MCP (Model Context Protocol) Server，允许 AI 助手（如 Claude Code）通过标准 MCP 协议直接调用 Apiman 的项目管理、API 请求执行等功能。

### 配置文件

`~/.apiman/config.json` 中的 MCP 配置：
```json
{
  "mcp": {
    "enabled": true,
    "port": 3847,
    "project_id": "<project-uuid>",
    "api_key": "mcp_sk_xxxxxxxxxxxx"
  }
}
```

### 目录结构

```
internal/mcp/
├── server.go       # HTTP Streamable Server 主循环
├── handler.go      # MCP 工具调用 → service 映射
├── middleware.go  # API Key 认证中间件
├── tools.go        # MCP 工具定义 (name, description, schema)
└── types.go        # MCP 协议类型定义
```

### MCP 工具列表

| 工具名 | 描述 |
|--------|------|
| `mcp_list_apis` | 列出绑定项目下所有接口（含多级目录） |
| `mcp_list_scripts` | 列出绑定项目下所有脚本 |
| `mcp_get_request` | 获取指定请求的完整详情（headers/params/body/scripts） |
| `mcp_create_case` | 为指定请求创建新用例 |
| `mcp_update_case` | 更新指定请求的已有用例 |
| `mcp_create_request` | 在绑定项目中创建新接口 |
| `mcp_create_folder` | 在绑定项目中创建新文件夹 |
| `mcp_execute_request` | 执行已保存的 HTTP 请求（支持指定用例） |
| `mcp_execute_raw` | 执行原始 HTTP 请求（不依赖已保存的请求） |

### Claude Code 配置

在 `~/.claude/settings.json` 或项目级 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "apiman": {
      "transport": "streamable-http",
      "url": "http://localhost:3847/mcp/streamable",
      "headers": {
        "Authorization": "Bearer <配置的API密钥>"
      }
    }
  }
}
```

### 路径格式

请求路径格式为 `request|project-id|request-id`，用例路径格式为 `requestCase|project-id|request-id|case-id`。

详细技术方案见 [docs/mcp-server-design.md](docs/mcp-server-design.md)。



# 代码规范：
### 严格遵守单一职责
### 模块化编程，每段代码都应该归属各自的模块

# 使用中文回答