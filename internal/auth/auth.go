package auth

import (
	"fmt"
	"os"

	"github.com/jdcloud-api/jdcloud-sdk-go/core"
	"github.com/jdcloud/jdcloud-cli/internal/config"
)

// CredentialProvider 凭证提供者接口
type CredentialProvider interface {
	GetCredentials() (*core.Credential, error)
}

// EnvCredentialProvider 环境变量凭证提供者
type EnvCredentialProvider struct{}

// GetCredentials 从环境变量获取凭证
func (e *EnvCredentialProvider) GetCredentials() (*core.Credential, error) {
	accessKeyID := os.Getenv("JDCLOUD_ACCESS_KEY_ID")
	accessKeySecret := os.Getenv("JDCLOUD_ACCESS_KEY_SECRET")
	
	if accessKeyID == "" || accessKeySecret == "" {
		return nil, fmt.Errorf("环境变量JDCLOUD_ACCESS_KEY_ID或JDCLOUD_ACCESS_KEY_SECRET未设置")
	}
	
	return &core.Credential{
		AccessKey: accessKeyID,
		SecretKey: accessKeySecret,
	}, nil
}

// ConfigCredentialProvider 配置文件凭证提供者
type ConfigCredentialProvider struct {
	Profile string
}

// GetCredentials 从配置文件获取凭证
func (c *ConfigCredentialProvider) GetCredentials() (*core.Credential, error) {
	cfg, err := config.LoadConfig(c.Profile)
	if err != nil {
		return nil, fmt.Errorf("加载配置失败: %v", err)
	}
	
	if cfg.AccessKeyID == "" || cfg.AccessKeySecret == "" {
		return nil, fmt.Errorf("配置文件中的Access Key ID或Access Key Secret为空")
	}
	
	return &core.Credential{
		AccessKey: cfg.AccessKeyID,
		SecretKey: cfg.AccessKeySecret,
	}, nil
}

// ChainProvider 凭证链提供者
type ChainProvider struct {
	Providers []CredentialProvider
}

// NewChainProvider 创建新的凭证链提供者
func NewChainProvider(providers ...CredentialProvider) *ChainProvider {
	return &ChainProvider{
		Providers: providers,
	}
}

// GetCredentials 从凭证链中获取凭证
func (c *ChainProvider) GetCredentials() (*core.Credential, error) {
	for _, provider := range c.Providers {
		creds, err := provider.GetCredentials()
		if err == nil {
			return creds, nil
		}
	}
	
	return nil, fmt.Errorf("无法从任何凭证提供者获取有效凭证")
}

// GetDefaultChainProvider 获取默认凭证链提供者
func GetDefaultChainProvider(profile string) *ChainProvider {
	return NewChainProvider(
		&EnvCredentialProvider{},
		&ConfigCredentialProvider{Profile: profile},
	)
}

// GetJDCloudClient 获取京东云客户端
func GetJDCloudClient(regionID string, profile string) (*core.JDCloudClient, error) {
	// 获取凭证
	provider := GetDefaultChainProvider(profile)
	creds, err := provider.GetCredentials()
	if err != nil {
		return nil, fmt.Errorf("获取凭证失败: %v", err)
	}
	
	// 创建客户端
	client := &core.JDCloudClient{
		Credential: *creds,
	}
	return client, nil
}

// IsMockMode 检查是否处于模拟模式
func IsMockMode() bool {
	return os.Getenv("JDCLOUD_MOCK_MODE") == "true"
}