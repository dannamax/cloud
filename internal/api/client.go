package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/jdcloud-api/jdcloud-sdk-go/core"
)

// Client 京东云API客户端
type Client struct {
	credential *core.Credential
	region     string
	endpoint   string
	httpClient *http.Client
}

// NewClient 创建新的API客户端
func NewClient(credential *core.Credential, region string) *Client {
	return &Client{
		credential: credential,
		region:     region,
		endpoint:   fmt.Sprintf("https://vm.%s.jdcloud-api.com", region),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// DescribeInstances 获取实例列表
func (c *Client) DescribeInstances() (map[string]interface{}, error) {
	// 构建请求
	params := map[string]interface{}{
		"regionId": c.region,
	}
	
	// 发送请求
	resp, err := c.sendRequest("DescribeInstances", params)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// sendRequest 发送API请求
func (c *Client) sendRequest(action string, params map[string]interface{}) (map[string]interface{}, error) {
	// 构建请求URL
	u, err := url.Parse(c.endpoint + "/v1/regions/" + c.region + "/instances")
	if err != nil {
		return nil, err
	}
	
	// 添加查询参数
	q := u.Query()
	
	// 添加其他参数
	for k, v := range params {
		q.Set(k, fmt.Sprintf("%v", v))
	}
	
	u.RawQuery = q.Encode()
	
	// 发送请求
	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, err
	}
	
	// 添加必要的头部
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "JDCloud-CLI/1.0")
	
	// 添加认证头部
	authHeader := c.generateAuthHeader()
	req.Header.Set("Authorization", authHeader)
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(body))
	}
	
	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v, 响应内容: %s", err, string(body))
	}
	
	// 检查API错误
	if errorObj, ok := result["error"].(map[string]interface{}); ok {
		code := ""
		message := ""
		if c, ok := errorObj["code"].(string); ok {
			code = c
		}
		if m, ok := errorObj["message"].(string); ok {
			message = m
		}
		return nil, fmt.Errorf("API错误 - 代码: %s, 消息: %s", code, message)
	}
	
	return result, nil
}

// generateAuthHeader 生成认证头部
func (c *Client) generateAuthHeader() string {
	// 生成时间戳
	timestamp := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	
	// 生成随机数
	nonce := fmt.Sprintf("%d", time.Now().UnixNano())
	
	// 构建签名字符串
	stringToSign := fmt.Sprintf("GET\nvm.%s.jdcloud-api.com\n/v1/regions/%s/instances\n%s\n%s", 
		c.region, c.region, timestamp, nonce)
	
	// 计算HMAC-SHA256签名
	mac := hmac.New(sha256.New, []byte(c.credential.SecretKey))
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	
	// 构建认证头部
	authHeader := fmt.Sprintf("JDCLOUD-HMAC-SHA256 Credential=%s, SignedHeaders=host, Signature=%s",
		c.credential.AccessKey, signature)
	
	return authHeader
}

// DebugMode 启用调试模式
func (c *Client) DebugMode() {
	// 可以在这里添加调试日志
	fmt.Printf("使用凭证: AccessKey=%s\n", c.credential.AccessKey)
	fmt.Printf("请求区域: %s\n", c.region)
	fmt.Printf("请求端点: %s\n", c.endpoint)
	authHeader := c.generateAuthHeader()
	fmt.Printf("认证头部: %s\n", authHeader)
}