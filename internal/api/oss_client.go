package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jdcloud-api/jdcloud-sdk-go/core"
)

// OSSClient OSS API客户端
type OSSClient struct {
	credential *core.Credential
	region     string
	endpoint   string
	httpClient *http.Client
}

// NewOSSClient 创建新的OSS API客户端
func NewOSSClient(credential *core.Credential, region string) *OSSClient {
	return &OSSClient{
		credential: credential,
		region:     region,
		endpoint:   fmt.Sprintf("https://oss.%s.jdcloud-api.com", region),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ListBuckets 获取存储桶列表
func (c *OSSClient) ListBuckets() (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets", c.endpoint, c.region)
	
	// 发送请求
	resp, err := c.sendRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// CreateBucket 创建存储桶
func (c *OSSClient) CreateBucket(bucketName, storageClass string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s", c.endpoint, c.region, bucketName)
	
	// 构建请求体
	requestBody := map[string]interface{}{
		"bucketName":   bucketName,
		"storageClass": storageClass,
	}
	
	// 序列化请求体
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求体失败: %v", err)
	}
	
	// 发送请求
	resp, err := c.sendRequest("PUT", url, jsonData)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// DeleteBucket 删除存储桶
func (c *OSSClient) DeleteBucket(bucketName string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s", c.endpoint, c.region, bucketName)
	
	// 发送请求
	resp, err := c.sendRequest("DELETE", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// ListObjects 获取对象列表
func (c *OSSClient) ListObjects(bucketName string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s/objects", c.endpoint, c.region, bucketName)
	
	// 发送请求
	resp, err := c.sendRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// UploadObject 上传对象
func (c *OSSClient) UploadObject(bucketName, objectKey string, data []byte) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s/objects/%s", c.endpoint, c.region, bucketName, objectKey)
	
	// 发送请求
	resp, err := c.sendRequest("PUT", url, data)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// DownloadObject 下载对象
func (c *OSSClient) DownloadObject(bucketName, objectKey string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s/objects/%s", c.endpoint, c.region, bucketName, objectKey)
	
	// 发送请求
	resp, err := c.sendRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// DeleteObject 删除对象
func (c *OSSClient) DeleteObject(bucketName, objectKey string) (map[string]interface{}, error) {
	// 构建请求URL
	url := fmt.Sprintf("%s/v1/regions/%s/buckets/%s/objects/%s", c.endpoint, c.region, bucketName, objectKey)
	
	// 发送请求
	resp, err := c.sendRequest("DELETE", url, nil)
	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

// sendRequest 发送API请求
func (c *OSSClient) sendRequest(method, url string, body []byte) (map[string]interface{}, error) {
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
	_, err = signer.Sign(req, nil, "oss", "v1", time.Now())
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
	bodyStr := string(respBody)
	
	// 如果响应被转义（被引号包围），需要去除转义
	if len(bodyStr) > 1 && bodyStr[0] == '"' && bodyStr[len(bodyStr)-1] == '"' {
		// 去除外层引号并处理转义字符
		unquoted := bodyStr[1 : len(bodyStr)-1]
		// 处理转义字符
		unescaped := strings.ReplaceAll(unquoted, "\\\"", "\"")
		unescaped = strings.ReplaceAll(unescaped, "\\\\", "\\")
		
		var result map[string]interface{}
		if err := json.Unmarshal([]byte(unescaped), &result); err != nil {
			return nil, fmt.Errorf("解析响应失败: %v, 原始响应: %s", err, unescaped)
		}
		return result, nil
	}
	
	// 正常解析
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v, 响应内容: %s", err, string(respBody))
	}
	
	return result, nil
	
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
func (c *OSSClient) DebugMode() {
	fmt.Printf("使用凭证: AccessKey=%s\n", c.credential.AccessKey)
	fmt.Printf("请求区域: %s\n", c.region)
	fmt.Printf("请求端点: %s\n", c.endpoint)
}