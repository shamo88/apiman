package config

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"apiman/internal/models"

	"github.com/google/uuid"
)

// Simple obfuscation key - not true encryption but better than plain text
var obfuscationKey = []byte("apiman-git-sync-key-2024")

func obfuscate(input string) string {
	if input == "" {
		return ""
	}
	result := make([]byte, len(input))
	for i, c := range input {
		result[i] = byte(c) ^ obfuscationKey[i%len(obfuscationKey)]
	}
	return base64.StdEncoding.EncodeToString(result)
}

func deobfuscate(input string) string {
	if input == "" {
		return ""
	}
	data, err := base64.StdEncoding.DecodeString(input)
	if err != nil {
		return input // Not obfuscated, return as-is
	}
	result := make([]byte, len(data))
	for i, c := range data {
		result[i] = c ^ obfuscationKey[i%len(obfuscationKey)]
	}
	return string(result)
}

type ConfigManager struct {
	configDir string
	mu        sync.RWMutex
}

func NewConfigManager() *ConfigManager {
	homeDir, _ := os.UserHomeDir()
	configDir := filepath.Join(homeDir, ".apiman")

	if err := os.MkdirAll(configDir, 0755); err != nil {
		panic(err)
	}

	return &ConfigManager{
		configDir: configDir,
	}
}

func (c *ConfigManager) GetConfigDir() string {
	return c.configDir
}

func (c *ConfigManager) GetProjectsDir() string {
	return filepath.Join(c.configDir, "projects")
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
func (c *ConfigManager) CreateProjectEnvironment(projectPath string, name string, variables map[string]string) (*models.Environment, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	env := &models.Environment{
		ID:        uuid.New().String(),
		Name:      name,
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
func (c *ConfigManager) UpdateProjectEnvironment(projectPath string, id string, name string, variables map[string]string) error {
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
	Username  string `json:"username,omitempty"`
	Password  string `json:"password,omitempty"` // obfuscated when authType is "token"
	AutoSync  bool   `json:"autoSync"`
}

type AppConfig struct {
	Proxy    ProxyConfig    `json:"proxy"`
	UI       UIConfig      `json:"ui"`
	GitSync  GitSyncConfig `json:"gitSync"`
}

type UIConfig struct {
	EnableListAnimation bool `json:"enableListAnimation"`
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

	// Deobfuscate password/token when loading
	if config.GitSync.AuthType == "token" && config.GitSync.Password != "" {
		config.GitSync.Password = deobfuscate(config.GitSync.Password)
	}

	return &config, nil
}

func (c *ConfigManager) SaveAppConfig(config *AppConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Obfuscate password/token when saving
	configToSave := *config
	if configToSave.GitSync.AuthType == "token" && configToSave.GitSync.Password != "" {
		configToSave.GitSync.Password = obfuscate(configToSave.GitSync.Password)
	}

	configFile := filepath.Join(c.configDir, "config.json")
	data, err := json.MarshalIndent(&configToSave, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configFile, data, 0644)
}
