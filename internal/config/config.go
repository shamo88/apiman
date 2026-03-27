package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"apiman/internal/models"

	"github.com/google/uuid"
)

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

func (c *ConfigManager) LoadEnvironments() ([]models.Environment, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	envFile := filepath.Join(c.configDir, "environments.json")
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

func (c *ConfigManager) SaveEnvironments(envs []models.Environment) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	envFile := filepath.Join(c.configDir, "environments.json")
	data, err := json.MarshalIndent(envs, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(envFile, data, 0644)
}

func (c *ConfigManager) CreateEnvironment(name string, variables map[string]string) (*models.Environment, error) {
	env := &models.Environment{
		ID:        uuid.New().String(),
		Name:      name,
		Variables: variables,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	envs, err := c.LoadEnvironments()
	if err != nil {
		return nil, err
	}

	envs = append(envs, *env)
	if err := c.SaveEnvironments(envs); err != nil {
		return nil, err
	}

	return env, nil
}

func (c *ConfigManager) UpdateEnvironment(id string, name string, variables map[string]string) error {
	envs, err := c.LoadEnvironments()
	if err != nil {
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

	return c.SaveEnvironments(envs)
}

func (c *ConfigManager) DeleteEnvironment(id string) error {
	envs, err := c.LoadEnvironments()
	if err != nil {
		return err
	}

	for i, env := range envs {
		if env.ID == id {
			envs = append(envs[:i], envs[i+1:]...)
			break
		}
	}

	return c.SaveEnvironments(envs)
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

type AppConfig struct {
	Proxy ProxyConfig `json:"proxy"`
	UI    UIConfig    `json:"ui"`
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

	return &config, nil
}

func (c *ConfigManager) SaveAppConfig(config *AppConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	configFile := filepath.Join(c.configDir, "config.json")
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configFile, data, 0644)
}
