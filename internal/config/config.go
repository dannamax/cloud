package config

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/mitchellh/go-homedir"
)

// Config 配置结构
type Config struct {
	AccessKeyID     string `json:"access_key_id"`
	AccessKeySecret string `json:"access_key_secret"`
	RegionID        string `json:"region_id"`
	OutputFormat    string `json:"output_format"`
	Profile         string `json:"profile"`
}

// GetDefaultConfig 获取默认配置
func GetDefaultConfig() *Config {
	return &Config{
		RegionID:     "cn-north-1",
		OutputFormat: "json",
		Profile:      "default",
	}
}

// GetConfigPath 获取配置文件路径
func GetConfigPath() (string, error) {
	home, err := homedir.Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".jdcloud", "config"), nil
}

// LoadConfig 加载配置
func LoadConfig(profile string) (*Config, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return nil, err
	}

	// 如果配置文件不存在，返回默认配置
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return GetDefaultConfig(), nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	// 如果没有指定profile，使用默认配置
	if profile == "" {
		profile = "default"
	}
	config.Profile = profile

	return &config, nil
}

// SaveConfig 保存配置
func SaveConfig(config *Config) error {
	configPath, err := GetConfigPath()
	if err != nil {
		return err
	}

	// 创建配置目录
	configDir := filepath.Dir(configPath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}

// Validate 验证配置
func (c *Config) Validate() error {
	if c.AccessKeyID == "" {
		return &ConfigError{Message: "Access Key ID is required"}
	}
	if c.AccessKeySecret == "" {
		return &ConfigError{Message: "Access Key Secret is required"}
	}
	if c.RegionID == "" {
		return &ConfigError{Message: "Region ID is required"}
	}
	return nil
}

// ConfigError 配置错误
type ConfigError struct {
	Message string
}

func (e *ConfigError) Error() string {
	return e.Message
}