package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/instances", c.endpoint, c.region)
	
	// 发送请求
	resp, err := c.sendRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// sendRequest 发送API请求
func (c *Client) sendRequest(method, url string, body []byte) (map[string]interface{}, error) {
	// 创建HTTP请求
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}
	
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}
	
	// 添加必要的头部
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "JDCloud-CLI/1.0")
	
	// 使用京东云SDK的签名器
	signer := core.NewSigner(*c.credential, core.NewDummyLogger())
	_, err = signer.Sign(req, nil, "vm", "v1", time.Now())
	if err != nil {
		return nil, fmt.Errorf("签名请求失败: %v", err)
	}
	
	// 发送请求
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(respBody))
	}
	
	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v, 响应内容: %s", err, string(respBody))
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

// DebugMode 启用调试模式
func (c *Client) DebugMode() {
	// 可以在这里添加调试日志
	fmt.Printf("使用凭证: AccessKey=%s\n", c.credential.AccessKey)
	fmt.Printf("请求区域: %s\n", c.region)
	fmt.Printf("请求端点: %s\n", c.endpoint)
}