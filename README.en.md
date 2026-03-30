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
