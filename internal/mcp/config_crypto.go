package mcp

import (
	"strings"

	"apiman/internal/config"
)

// encryptedPrefix marks an MCP API key as encrypted on disk.
const encryptedPrefix = "enc:"

// EncryptAPIKey returns the on-disk representation of an MCP API key.
// Empty keys pass through untouched; already-encrypted keys remain unchanged.
func EncryptAPIKey(plaintext string) string {
	if plaintext == "" {
		return ""
	}
	if strings.HasPrefix(plaintext, encryptedPrefix) {
		return plaintext
	}
	return encryptedPrefix + config.EncryptSecret(plaintext)
}

// DecryptAPIKey returns the plaintext MCP API key.
// Values without the enc: prefix pass through unchanged so legacy configs
// continue to work.
func DecryptAPIKey(stored string) string {
	if stored == "" {
		return ""
	}
	if !strings.HasPrefix(stored, encryptedPrefix) {
		return stored
	}
	return config.DecryptSecret(strings.TrimPrefix(stored, encryptedPrefix))
}

// EncryptMCPConfig returns a copy of cfg with the api_key field encrypted
// for persistence to disk.
func EncryptMCPConfig(cfg *config.MCPConfig) *config.MCPConfig {
	if cfg == nil {
		return nil
	}
	out := *cfg
	out.APIKey = EncryptAPIKey(cfg.APIKey)
	return &out
}

// DecryptMCPConfig returns a copy of cfg with the api_key field decrypted
// for in-memory use.
func DecryptMCPConfig(cfg *config.MCPConfig) *config.MCPConfig {
	if cfg == nil {
		return nil
	}
	out := *cfg
	out.APIKey = DecryptAPIKey(cfg.APIKey)
	return &out
}
