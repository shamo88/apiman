package mcp

import (
	"net/http"
	"strings"
)

// AuthMiddleware creates an authentication middleware for MCP endpoints.
func AuthMiddleware(apiKey string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for health and info endpoints
		if r.URL.Path == "/mcp/health" || r.URL.Path == "/mcp/info" {
			next.ServeHTTP(w, r)
			return
		}

		// Check Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeError(w, r, http.StatusUnauthorized, "Missing Authorization header")
			return
		}

		// Parse Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeError(w, r, http.StatusUnauthorized, "Invalid Authorization format. Use 'Bearer <token>'")
			return
		}

		token := parts[1]
		if token != apiKey {
			writeError(w, r, http.StatusUnauthorized, "Invalid API key")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// writeError writes an error response.
func writeError(w http.ResponseWriter, r *http.Request, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error": "` + message + `"}`))
}
