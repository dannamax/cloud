# 京东云CLI认证配置指南

## 概述

京东云CLI支持两种认证方式：
1. **真实API模式**：使用真实的京东云API凭证调用云服务API
2. **模拟模式**：使用预设的模拟数据，无需真实凭证

## 真实API模式配置

### 1. 获取API凭证

要启用真实API模式，您需要先在京东云控制台获取API凭证：

1. 登录京东云控制台：https://console.jdcloud.com
2. 进入"访问控制" -> "访问密钥管理"
3. 创建新的访问密钥（Access Key ID 和 Secret Key）
4. 妥善保存您的密钥信息

### 2. 配置凭证

#### 方法一：使用配置文件
```bash
jdcloud configure
```
按照提示输入：
- Access Key ID：您的京东云访问密钥ID
- Access Key Secret：您的京东云访问密钥
- Default Region ID：默认区域ID（例如：cn-north-1）
- Default Output Format：默认输出格式（json、yaml、table）

配置文件将保存在 `~/.jdcloud/config` 中。

#### 方法二：使用环境变量
```bash
export JDCLOUD_ACCESS_KEY_ID="您的Access Key ID"
export JDCLOUD_ACCESS_KEY_SECRET="您的Secret Key"
export JDCLOUD_REGION_ID="cn-north-1"
```

### 3. 验证配置

配置完成后，可以通过以下命令验证：
```bash
# 查看配置信息
jdcloud configure get

# 测试API调用
jdcloud vm describe-instances
```

## 模拟模式配置

### 启用模拟模式
```bash
export JDCLOUD_MOCK_MODE=true
```

在模拟模式下，CLI将返回预设的模拟数据，无需真实凭证。

### 测试模拟模式
```bash
jdcloud vm describe-instances
jdcloud vpc describe-vpcs
jdcloud oss list-buckets
```

## 常见问题

### 1. 401认证错误

如果您遇到401错误，请检查：

1. **凭证有效性**：确保您的Access Key ID和Secret Key有效且未过期
2. **凭证权限**：确保您的凭证有访问相应服务的权限
3. **区域设置**：确保您使用的区域ID正确
4. **网络连接**：确保您的网络可以访问京东云API

### 2. 403权限错误

如果您遇到403错误，请检查：

1. **IAM权限**：确保您的账户有访问相应资源的权限
2. **资源归属**：确保您访问的资源属于您的账户
3. **服务开通**：确保您已开通相应的服务

### 3. 调试认证问题

使用调试模式查看详细的请求信息：
```bash
jdcloud vm describe-instances --debug
```

这将显示：
- 使用的Access Key ID
- 请求的区域
- 请求的端点
- 生成的认证头部

## 安全建议

1. **保护您的密钥**：不要将API密钥提交到代码仓库或分享给他人
2. **定期轮换**：定期更换API密钥以提高安全性
3. **最小权限**：为API密钥分配最小必要的权限
4. **环境隔离**：为不同环境（开发、测试、生产）使用不同的密钥

## 获取帮助

如果您仍然遇到认证问题，可以：

1. 查看京东云官方文档
2. 联系京东云技术支持
3. 在GitHub上提交Issue

## 相关文档

- [京东云API文档](https://docs.jdcloud.com/)
- [京东云访问控制文档](https://docs.jdcloud.com/cn/iam/)
- [京东云VM服务API](https://docs.jdcloud.com/cn/virtual-machines/api-overview)