# Agent Guidelines for apiman

This document provides guidelines for AI agents working on this codebase.

## Project Overview

apiman is a desktop API testing tool built with Wails (Go + React/TypeScript). It allows users to manage API projects, execute curl commands, import Postman collections, and manage environments/variables.

## Build Commands

### Go Backend
```bash
go build -o apiman.exe    # Build the application
wails dev                # Run in development mode
wails build              # Build for production
```

### Frontend (Node.js)
```bash
cd frontend
npm install             # Install dependencies
npm run dev              # Run development server
npm run build            # Build for production
```

### Single Test Execution
- Currently there are **no tests** in this repository
- To add tests, create `*_test.go` files
- Run single test: `go test -v -run TestName ./internal/package/...`

## Go Code Style

### Imports
Group imports: standard library, third-party, then internal. Do NOT use `_` imports unless necessary.

```go
import (
    "fmt"
    "net/http"
    "github.com/wailsapp/wails/v2"
    "apiman/internal/config"
    "apiman/internal/models"
)
```

### Naming Conventions
- **Files**: lowercase with underscores (`config_manager.go`)
- **Types**: PascalCase (`ConfigManager`, `CurlExecutor`)
- **Functions/Methods**: PascalCase
- **Variables**: camelCase (`proxyOpts`, `httpClient`)
- **Interfaces**: Add `er` suffix when simple (`Reader`, `Writer`)

### Types and Structs
- Use explicit struct tags: `json:"field_name"`
- Use pointers (`*Type`) when nil values are meaningful

### Error Handling
- Return errors explicitly (no panic for expected failures)
- Use `fmt.Errorf` with `%v` for wrapping errors
- For HTTP-like responses, return error in result struct with nil error

```go
// Business errors in responses
if err != nil {
    return &models.CurlResponse{
        Error: fmt.Sprintf("Failed to parse: %v", err),
    }, nil
}

// Operational failures
func (s *Service) LoadAppConfig() (*AppConfig, error) {
    if err != nil {
        return nil, fmt.Errorf("failed to load: %w", err)
    }
    return cfg, nil
}
```

### Code Formatting
- Run `go fmt` before committing
- Keep functions focused (under 50-80 lines when possible)

## TypeScript/React Code Style

### Imports
Group: React/hooks, external libraries, internal components, styles.

```tsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TitleBar } from './components/TitleBar';
import { ListProjects, CreateProject } from '../wailsjs/go/main/App';
import './App.css';
```

### Naming Conventions
- **Components**: PascalCase (`TitleBar`)
- **Props interfaces**: `ComponentNameProps`
- **Other interfaces**: PascalCase (`Project`, `Environment`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### Types
- Use explicit TypeScript types
- Prefer interfaces over type aliases
- Use `Record<string, T>` for map-like objects

### Component Structure
- Keep component files under ~500 lines
- Extract complex logic to custom hooks
- Use functional components with hooks exclusively

### CSS/Styling
- Use CSS classes (existing `.api-item`, `.folder-toggle-icon` pattern)
- Use inline styles sparingly for dynamic values

## File Organization

```
apiman/
├── main.go              # Entry point
├── app.go               # Wails app setup
├── internal/
│   ├── config/          # Configuration management
│   ├── curl/            # Curl execution logic
│   ├── models/          # Data models
│   ├── postman/         # Postman import
│   ├── project/         # Project management
│   └── service/         # Main service layer
└── frontend/src/
    ├── components/      # React components
    ├── types/           # TypeScript definitions
    ├── App.tsx          # Main app component
    └── main.tsx         # React entry point
```

## Development Workflow

1. **Backend changes**: Edit files in `internal/`, rebuild with `wails dev`
2. **Frontend changes**: Edit files in `frontend/src/`, hot-reload works automatically
3. **Type bindings**: Run `wails dev` to regenerate TypeScript bindings in `frontend/src/wailsjs/`

## Wails-Specific Notes

- Go methods exposed to frontend must be capitalized
- Frontend communicates with Go via auto-generated bindings in `wailsjs/go/main/App`
- All binding methods are called as async functions in TypeScript