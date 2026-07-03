package config

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"apiman/internal/crypto"
	"apiman/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/nacl/secretbox"
)

// EncryptSecret encrypts a string using NaCl secretbox. Public wrapper around
// the package-private encrypt for cross-package use (e.g. MCP API keys).
func EncryptSecret(plaintext string) string {
	return encrypt(plaintext)
}

// DecryptSecret decrypts a NaCl secretbox ciphertext. Returns plaintext on
// failure, which is safe for legacy data that predates encryption.
func DecryptSecret(ciphertext string) string {
	return decrypt(ciphertext)
}

// encrypt uses NaCl secretbox for secure encryption
func encrypt(plaintext string) string {
	if plaintext == "" {
		return ""
	}
	key, err := crypto.GetEncryptionKey()
	if err != nil {
		// Fallback to base64 of random bytes if key loading fails
		return base64.StdEncoding.EncodeToString([]byte(plaintext))
	}
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		// Fallback to base64 of random bytes if crypto/rand fails
		return base64.StdEncoding.EncodeToString([]byte(plaintext))
	}

	encrypted := secretbox.Seal(nil, []byte(plaintext), &nonce, &key)
	// Prepend nonce to encrypted data
	result := make([]byte, len(nonce)+len(encrypted))
	copy(result, nonce[:])
	copy(result[len(nonce):], encrypted)
	return base64.StdEncoding.EncodeToString(result)
}

// decrypt uses NaCl secretbox for secure decryption
func decrypt(ciphertext string) string {
	if ciphertext == "" {
		return ""
	}
	key, err := crypto.GetEncryptionKey()
	if err != nil {
		return ciphertext // Key loading failed, return original
	}
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return ciphertext // Not encrypted, return as-is
	}

	if len(data) < 24 {
		return ciphertext // Invalid ciphertext
	}

	var nonce [24]byte
	copy(nonce[:], data[:24])
	decrypted, ok := secretbox.Open(nil, data[24:], &nonce, &key)
	if !ok {
		return ciphertext // Decryption failed, return original
	}
	return string(decrypted)
}

// Legacy obfuscation for backward compatibility with existing configs
var legacyObfuscationKey = []byte("apiman-git-sync-key-2024")

func legacyObfuscate(input string) string {
	if input == "" {
		return ""
	}
	result := make([]byte, len(input))
	for i, c := range input {
		result[i] = byte(c) ^ legacyObfuscationKey[i%len(legacyObfuscationKey)]
	}
	return base64.StdEncoding.EncodeToString(result)
}

func legacyDeobfuscate(input string) string {
	if input == "" {
		return ""
	}
	data, err := base64.StdEncoding.DecodeString(input)
	if err != nil {
		return input // Not obfuscated, return as-is
	}
	result := make([]byte, len(data))
	for i, c := range data {
		result[i] = c ^ legacyObfuscationKey[i%len(legacyObfuscationKey)]
	}
	return string(result)
}

type ConfigManager struct {
	configDir string
	mu        sync.RWMutex
}

func NewConfigManager() (*ConfigManager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get user home directory: %w", err)
	}
	configDir := filepath.Join(homeDir, ".apiman")

	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	return &ConfigManager{
		configDir: configDir,
	}, nil
}

func (c *ConfigManager) GetConfigDir() string {
	return c.configDir
}

func (c *ConfigManager) GetProjectsDir() string {
	return filepath.Join(c.configDir, "projects")
}

// GetWorkDir 返回当前工作目录，如果配置了 WorkDir 则返回，否则返回默认的 projectsDir
func (c *ConfigManager) GetWorkDir() string {
	appCfg, _ := c.LoadAppConfig()
	if appCfg != nil && appCfg.GitSync.WorkDir != "" {
		return appCfg.GitSync.WorkDir
	}
	return c.GetProjectsDir()
}

// SaveWorkDir 保存工作目录到配置
func (c *ConfigManager) SaveWorkDir(dir string) error {
	appCfg, _ := c.LoadAppConfig()
	if appCfg == nil {
		appCfg = &AppConfig{}
	}
	appCfg.GitSync.WorkDir = dir
	return c.SaveAppConfig(appCfg)
}

func (c *ConfigManager) ensureDir(dir string) error {
	return os.MkdirAll(dir, 0755)
}

func projectEnvironmentsFile(projectPath string) string {
	return filepath.Join(projectPath, "environments.json")
}

// LoadProjectEnvironments reads environments stored under the project directory.
func (c *ConfigManager) LoadProjectEnvironments(projectPath string) ([]models.Environment, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	envFile := projectEnvironmentsFile(projectPath)
	data, err := os.ReadFile(envFile)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.Environment{}, nil
		}
		return nil, err
	}

	var envs []models.Environment
	if err := json.Unmarshal(data, &envs); err != nil {
		return nil, err
	}

	return envs, nil
}

func (c *ConfigManager) saveProjectEnvironmentsLocked(projectPath string, envs []models.Environment) error {
	if err := c.ensureDir(projectPath); err != nil {
		return err
	}
	envFile := projectEnvironmentsFile(projectPath)
	data, err := json.MarshalIndent(envs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(envFile, data, 0644)
}

// CreateProjectEnvironment appends an environment to the project's environments.json.
func (c *ConfigManager) CreateProjectEnvironment(projectPath string, name string, variables map[string]string, mark models.EnvironmentMark) (*models.Environment, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	env := &models.Environment{
		ID:        uuid.New().String(),
		Name:      name,
		Mark:      mark,
		Variables: variables,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	envFile := projectEnvironmentsFile(projectPath)
	data, err := os.ReadFile(envFile)
	var envs []models.Environment
	if err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	} else if len(data) > 0 {
		if err := json.Unmarshal(data, &envs); err != nil {
			return nil, err
		}
	}

	envs = append(envs, *env)
	if err := c.saveProjectEnvironmentsLocked(projectPath, envs); err != nil {
		return nil, err
	}

	return env, nil
}

// UpdateProjectEnvironment updates one environment in the project's file.
// Passing an empty mark preserves the previous value (mirrors name/variables).
func (c *ConfigManager) UpdateProjectEnvironment(projectPath string, id string, name string, variables map[string]string, mark models.EnvironmentMark) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	envFile := projectEnvironmentsFile(projectPath)
	data, err := os.ReadFile(envFile)
	if err != nil {
		return err
	}
	var envs []models.Environment
	if err := json.Unmarshal(data, &envs); err != nil {
		return err
	}

	for i, env := range envs {
		if env.ID == id {
			envs[i].Name = name
			envs[i].Variables = variables
			// mark == Unspecified → caller does not want to touch mark.
			// mark == "" or any other value → caller wants to set it.
			if mark != models.EnvironmentMarkUnspecified {
				envs[i].Mark = mark
			}
			envs[i].UpdatedAt = time.Now()
			break
		}
	}

	return c.saveProjectEnvironmentsLocked(projectPath, envs)
}

// DeleteProjectEnvironment removes an environment from the project's file.
func (c *ConfigManager) DeleteProjectEnvironment(projectPath string, id string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	envFile := projectEnvironmentsFile(projectPath)
	data, err := os.ReadFile(envFile)
	if err != nil {
		return err
	}
	var envs []models.Environment
	if err := json.Unmarshal(data, &envs); err != nil {
		return err
	}

	for i, env := range envs {
		if env.ID == id {
			envs = append(envs[:i], envs[i+1:]...)
			break
		}
	}

	return c.saveProjectEnvironmentsLocked(projectPath, envs)
}

func (c *ConfigManager) GetGlobalVariables() (map[string]string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	varFile := filepath.Join(c.configDir, "variables.json")
	data, err := os.ReadFile(varFile)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]string), nil
		}
		return nil, err
	}

	var vars map[string]string
	if err := json.Unmarshal(data, &vars); err != nil {
		return nil, err
	}

	return vars, nil
}

func (c *ConfigManager) SaveGlobalVariables(variables map[string]string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	varFile := filepath.Join(c.configDir, "variables.json")
	data, err := json.MarshalIndent(variables, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(varFile, data, 0644)
}

type ProxyConfig struct {
	Enabled    bool   `json:"enabled"`
	HTTPHost   string `json:"httpHost,omitempty"`
	HTTPPort   int    `json:"httpPort,omitempty"`
	HTTPSHost  string `json:"httpsHost,omitempty"`
	HTTPSPort  int    `json:"httpsPort,omitempty"`
	SOCKS5Host string `json:"socks5Host,omitempty"`
	SOCKS5Port int    `json:"socks5Port,omitempty"`
}

type GitSyncConfig struct {
	Enabled   bool   `json:"enabled"`
	RemoteURL string `json:"remoteUrl,omitempty"`
	Branch    string `json:"branch,omitempty"`
	AuthType  string `json:"authType,omitempty"` // "password" or "token"
	Password  string `json:"password,omitempty"` // obfuscated when authType is "token"
	AutoSync  bool   `json:"autoSync"`
	WorkDir   string `json:"workDir,omitempty"` // 当前工作目录路径
}

type MCPConfig struct {
	Enabled       bool   `json:"enabled"`
	Port          int    `json:"port"`
	ProjectID     string `json:"project_id"`
	EnvironmentID string `json:"environment_id"`
	APIKey        string `json:"api_key"`
}

// LogConfig holds logger configuration
type LogConfig struct {
	MaxSizeMB  int  `json:"maxSizeMB"`
	MaxBackups int  `json:"maxBackups"`
	Compress   bool `json:"compress"`
}

type HTTPConfig struct {
	Timeout int `json:"timeout"` // HTTP request timeout in seconds
}

type AppConfig struct {
	Proxy   ProxyConfig   `json:"proxy"`
	UI      UIConfig      `json:"ui"`
	GitSync GitSyncConfig `json:"gitSync"`
	MCP     MCPConfig     `json:"mcp"`
	Log     LogConfig     `json:"log"`
	HTTP    HTTPConfig    `json:"http"`
}

type UIConfig struct {
	EnableListAnimation bool   `json:"enableListAnimation"`
	Theme               string `json:"theme"`
}

func (c *ConfigManager) LoadAppConfig() (*AppConfig, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	configFile := filepath.Join(c.configDir, "config.json")
	data, err := os.ReadFile(configFile)
	if err != nil {
		if os.IsNotExist(err) {
			return &AppConfig{
				UI: UIConfig{
					EnableListAnimation: false,
				},
				GitSync: GitSyncConfig{
					Branch:   "main",
					AutoSync: true,
				},
			}, nil
		}
		return nil, err
	}

	var config AppConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	// Keep stable defaults for newly added fields.
	if !config.UI.EnableListAnimation {
		config.UI.EnableListAnimation = false
	}
	if config.GitSync.Branch == "" {
		config.GitSync.Branch = "main"
	}
	// MCP defaults
	if config.MCP.Port == 0 {
		config.MCP.Port = 3847
	}
	// Log defaults
	if config.Log.MaxSizeMB == 0 {
		config.Log.MaxSizeMB = 100
	}
	// HTTP defaults
	if config.HTTP.Timeout == 0 {
		config.HTTP.Timeout = 30
	}

	// Decrypt password/token when loading
	if config.GitSync.AuthType == "token" && config.GitSync.Password != "" {
		config.GitSync.Password = decrypt(config.GitSync.Password)
	}

	return &config, nil
}

func (c *ConfigManager) SaveAppConfig(config *AppConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Encrypt password/token when saving
	configToSave := *config
	if configToSave.GitSync.AuthType == "token" && configToSave.GitSync.Password != "" {
		configToSave.GitSync.Password = encrypt(configToSave.GitSync.Password)
	}

	configFile := filepath.Join(c.configDir, "config.json")
	data, err := json.MarshalIndent(&configToSave, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configFile, data, 0644)
}

// GlobalCookieFile returns the path to the global cookie file.
func (c *ConfigManager) GlobalCookieFile() string {
	return filepath.Join(c.configDir, "cookie")
}

// LoadGlobalCookies reads global cookies from the cookie file.
func (c *ConfigManager) LoadGlobalCookies() ([]models.GlobalCookie, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	cookieFile := c.GlobalCookieFile()
	data, err := os.ReadFile(cookieFile)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.GlobalCookie{}, nil
		}
		return nil, err
	}

	var cookies []models.GlobalCookie
	if err := json.Unmarshal(data, &cookies); err != nil {
		return nil, err
	}

	return cookies, nil
}

// SaveGlobalCookies saves all global cookies to the cookie file.
func (c *ConfigManager) SaveGlobalCookies(cookies []models.GlobalCookie) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	cookieFile := c.GlobalCookieFile()
	data, err := json.MarshalIndent(cookies, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(cookieFile, data, 0644)
}

// AddGlobalCookie adds a single cookie to the cookie file.
func (c *ConfigManager) AddGlobalCookie(cookie models.GlobalCookie) error {
	cookies, err := c.LoadGlobalCookies()
	if err != nil {
		return err
	}
	cookies = append(cookies, cookie)
	return c.SaveGlobalCookies(cookies)
}

// DeleteGlobalCookie removes a cookie by its ID.
func (c *ConfigManager) DeleteGlobalCookie(id string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	cookieFile := c.GlobalCookieFile()
	data, err := os.ReadFile(cookieFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var cookies []models.GlobalCookie
	if err := json.Unmarshal(data, &cookies); err != nil {
		return err
	}

	for i, cookie := range cookies {
		if cookie.ID == id {
			cookies = append(cookies[:i], cookies[i+1:]...)
			break
		}
	}

	data, err = json.MarshalIndent(cookies, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cookieFile, data, 0644)
}
