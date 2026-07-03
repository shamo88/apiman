package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"apiman/internal/config"
	"apiman/internal/service"
)

// sseKeepaliveInterval is the cadence at which the SSE endpoint emits a
// comment frame to keep idle proxies from closing the connection.
const sseKeepaliveInterval = 15 * time.Second

// Server represents the MCP HTTP Server.
type Server struct {
	svc      *service.Service
	config   *config.MCPConfig
	handler  *Handler
	notifier *Notifier
	server   *http.Server
	mu       sync.RWMutex
	running  bool
}

// NewServer creates a new MCP server.
func NewServer(svc *service.Service, cfg *config.MCPConfig) *Server {
	notifier := NewNotifier()
	handler := NewHandler(svc, cfg.ProjectID, cfg.EnvironmentID)
	handler.SetNotifier(notifier)
	return &Server{
		svc:      svc,
		config:   cfg,
		handler:  handler,
		notifier: notifier,
	}
}

// Notifier returns the server's event broker. Used by Handler methods to
// publish notifications on project-data mutations.
func (s *Server) Notifier() *Notifier {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.notifier
}

// Handler returns the bound Handler. Used by the frontend bridge
// (app.go) to mutate runtime state — project / environment switching —
// without going through a full config-rewrite cycle.
func (s *Server) Handler() *Handler {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.handler
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
	mux.HandleFunc("/mcp/events", s.handleEvents)
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

// RuntimeState is a snapshot of the server's live binding state. It is
// returned by GetRuntimeState and consumed by the frontend status UI.
// ProjectName / EnvironmentName are intentionally NOT filled in here so the
// caller can resolve them against the user's project list (the MCP package
// has no direct access to display names).
type RuntimeState struct {
	Running        bool   `json:"running"`
	BoundProjectID string `json:"boundProjectId"`
	EnvironmentID  string `json:"environmentId"`
	ActiveClients  int    `json:"activeClients"`
	Port           int    `json:"port"`
}

// GetRuntimeState returns a snapshot of the server's current binding state.
// Safe to call whether or not the server is running: when stopped, Running
// is false and the ID fields are empty.
func (s *Server) GetRuntimeState() RuntimeState {
	s.mu.RLock()
	defer s.mu.RUnlock()

	state := RuntimeState{
		Running:        s.running,
		BoundProjectID: s.handler.GetProjectID(),
		EnvironmentID:  s.handler.GetEnvironmentID(),
		Port:           s.config.Port,
	}
	if s.notifier != nil {
		state.ActiveClients = s.notifier.ClientCount()
	}
	return state
}

// UpdateConfig updates the server configuration and restarts if needed.
func (s *Server) UpdateConfig(cfg *config.MCPConfig) error {
	s.mu.Lock()
	s.config = cfg
	if s.notifier == nil {
		s.notifier = NewNotifier()
	}
	if s.handler != nil {
		s.handler.SetProjectID(cfg.ProjectID)
		s.handler.SetEnvironmentID(cfg.EnvironmentID)
	} else {
		newHandler := NewHandler(s.svc, cfg.ProjectID, cfg.EnvironmentID)
		newHandler.SetNotifier(s.notifier)
		s.handler = newHandler
	}
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

// BindProject switches the bound project and active environment at runtime.
// Does not restart the server. Broadcasts a notification so SSE subscribers
// can refresh.
func (s *Server) BindProject(projectID, environmentID string) error {
	s.mu.Lock()
	handler := s.handler
	notifier := s.notifier
	s.mu.Unlock()
	if handler == nil {
		return fmt.Errorf("server not initialized")
	}
	handler.SetProjectID(projectID)
	handler.SetEnvironmentID(environmentID)
	if notifier != nil {
		notifier.Broadcast(Event{
			Type: "message",
			Data: map[string]any{
				"kind":          "mcp_bind_project",
				"projectID":     projectID,
				"environmentID": environmentID,
			},
		})
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

// handleEvents upgrades the response to an SSE stream and pushes events from
// the server's Notifier. Closes the stream when the client disconnects.
// A comment frame is sent every 15s to keep proxies from idling out.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	// Initial greeting so the client knows the stream is open.
	_, _ = w.Write([]byte(": connected\n\n"))
	flusher.Flush()

	s.mu.RLock()
	notifier := s.notifier
	s.mu.RUnlock()
	if notifier == nil {
		// Should never happen since NewNotifier runs in NewServer,
		// but guard against a torn-down server.
		return
	}

	ch, unsub := notifier.Subscribe(32)
	defer unsub()

	keepalive := time.NewTicker(sseKeepaliveInterval)
	defer keepalive.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case <-keepalive.C:
			if _, err := w.Write([]byte(": keepalive\n\n")); err != nil {
				return
			}
			flusher.Flush()
		case evt, open := <-ch:
			if !open {
				return
			}
			if _, err := w.Write(EncodeSSE(evt)); err != nil {
				return
			}
			flusher.Flush()
		}
	}
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
			Tools:     struct{}{},
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
