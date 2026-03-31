package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"apiman/internal/config"
	"apiman/internal/service"
)

// Server represents the MCP HTTP Server.
type Server struct {
	svc       *service.Service
	config    *config.MCPConfig
	handler   *Handler
	server    *http.Server
	mu        sync.RWMutex
	running   bool
}

// NewServer creates a new MCP server.
func NewServer(svc *service.Service, cfg *config.MCPConfig) *Server {
	return &Server{
		svc:     svc,
		config:  cfg,
		handler: NewHandler(svc, cfg.ProjectID, cfg.EnvironmentID),
	}
}

// Start starts the MCP server.
func (s *Server) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("server already running")
	}

	addr := fmt.Sprintf(":%d", s.config.Port)
	mux := http.NewServeMux()

	// MCP endpoints
	mux.HandleFunc("/mcp/streamable", s.handleStreamable)
	mux.HandleFunc("/mcp/health", s.handleHealth)
	mux.HandleFunc("/mcp/info", s.handleInfo)

	// Apply auth middleware
	var handler http.Handler = mux
	if s.config.APIKey != "" {
		handler = AuthMiddleware(s.config.APIKey, mux)
	}

	s.server = &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	go func() {
		log.Printf("[MCP] Server starting on %s", addr)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[MCP] Server error: %v", err)
		}
	}()

	s.running = true
	log.Printf("[MCP] Server started on %s", addr)
	return nil
}

// Stop stops the MCP server.
func (s *Server) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return nil
	}

	if s.server != nil {
		ctx := context.Background()
		if err := s.server.Shutdown(ctx); err != nil {
			return err
		}
	}

	s.running = false
	log.Println("[MCP] Server stopped")
	return nil
}

// IsRunning returns whether the server is running.
func (s *Server) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// UpdateConfig updates the server configuration and restarts if needed.
func (s *Server) UpdateConfig(cfg *config.MCPConfig) error {
	s.mu.Lock()
	s.config = cfg
	s.handler = NewHandler(s.svc, cfg.ProjectID, cfg.EnvironmentID)
	s.mu.Unlock()

	// If running, restart with new config
	if s.IsRunning() {
		if err := s.Stop(); err != nil {
			return err
		}
		if cfg.Enabled {
			return s.Start()
		}
	}
	return nil
}

// handleStreamable handles the main MCP streamable endpoint.
func (s *Server) handleStreamable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Handle GET for SSE-like polling (simplified)
	if r.Method == http.MethodGet {
		s.handleSSE(w, r)
		return
	}

	// Handle POST for JSON-RPC requests
	var req JSONRPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSONRPCError(w, nil, -32700, "Parse error")
		return
	}

	s.mu.RLock()
	handler := s.handler
	s.mu.RUnlock()

	var result any
	var err error

	switch req.Method {
	case "initialize":
		result = s.handleInitialize()
	case "tools/list":
		result = s.handleToolsList()
	case "tools/call":
		if handler == nil {
			s.writeJSONRPCError(w, req.ID, -32603, "Internal error: handler not initialized")
			return
		}
		toolResult, toolErr := s.handleToolCall(req.Params)
		result = toolResult
		err = toolErr
	default:
		s.writeJSONRPCError(w, req.ID, -32601, fmt.Sprintf("Method not found: %s", req.Method))
		return
	}

	if err != nil {
		s.writeJSONRPCError(w, req.ID, -32603, err.Error())
		return
	}

	s.writeJSONRPCResponse(w, req.ID, result)
}

// handleSSE handles simple polling GET requests.
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte("{\"status\": \"ok\"}"))
}

// handleHealth handles health check requests.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	status := "stopped"
	if s.IsRunning() {
		status = "running"
	}
	json.NewEncoder(w).Encode(map[string]string{"status": status})
}

// handleInfo handles server info requests.
func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"name":    "apiman-mcp",
		"version": "1.0.0",
	})
}

func (s *Server) handleInitialize() *MCPInitializeResult {
	return &MCPInitializeResult{
		ProtocolVersion: "2024-11-05",
		Capabilities: MCPCapabilities{
			Tools:    struct{}{},
			Resources: nil,
		},
		ServerInfo: MCPServerInfo{
			Name:    "apiman-mcp",
			Version: "1.0.0",
		},
	}
}

func (s *Server) handleToolsList() map[string]any {
	return map[string]any{"tools": GetToolDefinitions()}
}

func (s *Server) handleToolCall(params map[string]any) (map[string]any, error) {
	name, _ := params["name"].(string)
	arguments, _ := params["arguments"].(map[string]any)

	call := MCPToolCall{
		Name:      name,
		Arguments: arguments,
	}

	result, err := s.handler.HandleToolCall(call)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"content": result.Content,
		"isError": result.IsError,
	}, nil
}

func (s *Server) writeJSONRPCResponse(w http.ResponseWriter, id interface{}, result any) {
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Result:  result,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) writeJSONRPCError(w http.ResponseWriter, id interface{}, code int, message string) {
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      id,
		Error: &JSONRPCError{
			Code:    code,
			Message: message,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
