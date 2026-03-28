# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

apiman is a desktop API testing tool built with Wails (Go backend + React frontend). It manages API requests organized into projects, folders, and individual .curl files, with support for variables, environments, pre/post scripts, proxy configuration, and Postman collection import.

## Build Commands

```bash
# Install frontend dependencies
cd frontend && npm install

# Development mode (frontend dev server + Go backend)
wails dev

# Production build
wails build

# Frontend only
cd frontend && npm run build
```

## Architecture

### Backend (Go)

- **main.go**: Wails app entry point. Creates frameless window, binds `App` struct as the Wails runtime bridge.
- **app.go**: `App` struct exposing all backend methods to frontend via Wails bindings. Delegates to `Service`.
- **internal/service/service.go**: Facade coordinating `ConfigManager`, `ProjectManager`, `CurlExecutor`, `PostmanImporter`.
- **internal/config/config.go**: Manages `~/.apiman/` directory. Handles app config (proxy, UI), environments, and global variables. All JSON files in config dir.
- **internal/project/project.go**: Manages projects stored on disk under `~/.apiman/projects/`. Each project is a directory containing `.curl` request files and `scripts/` subdirectory. Uses slug-UUID naming: `name__<uuid>/`.
- **internal/curl/curl.go**: Parses curl command syntax and executes HTTP requests via Go's `net/http`. Supports proxy (HTTP, HTTPS, SOCKS5). Extracts/replaces `{{variable}}` placeholders.
- **internal/postman/postman.go**: Imports Postman v2.1 collections by converting them to `.curl` files.

### Frontend (React)

- **frontend/src/App.tsx**: Main component. State management for projects, request tabs, environments, API config, response display. Uses Ant Design components.
- **frontend/src/components/TitleBar.tsx**: Custom frameless window title bar.

### Data Storage

- **Config dir**: `~/.apiman/`
  - `config.json` - App settings (proxy, UI)
  - `environments.json` - Named environment variable sets
  - `variables.json` - Global variables
  - `projects/projects.json` - Project group assignments and collapsed state
- **Projects dir**: `~/.apiman/projects/<slug>__<uuid>/`
  - `meta.json` - Project metadata
  - `scripts/` - Project-level JavaScript scripts
  - `<folder>/` - Directories containing `.curl` files
  - `.folder.meta` - Folder metadata
  - `<request-id>.meta` - Request metadata (name, script bindings)
  - `<slug>__<uuid>.curl` - Individual request files

### Request File Format

`.curl` files contain raw curl commands. The `CurlExecutor` parses method, URL, headers, body, and auth from the curl syntax. Variables use `{{varname}}` syntax, replaced at runtime from environment or global variables.

## Key Patterns

- Wails bindings: methods on `App` struct with return types serializable to JSON
- UI uses `wailsjs/go/main/App` bindings to call Go methods from React
- Frameless window requires custom title bar component for drag and window controls
- Proxy settings apply to all HTTP requests executed by `CurlExecutor`
