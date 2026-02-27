# 快速开始

## 安装京东云CLI

### 通过脚本安装（推荐）

```bash
/bin/bash -c "$(curl -fsSL https://jdcloud-cli.jd.com/install.sh)"
```

### 通过包管理器安装

**macOS (使用Homebrew):**
```bash
brew install jdcloud-cli
```

**Linux (使用包管理器):**
```bash
# Ubuntu/Debian
sudo apt-get install jdcloud-cli

# CentOS/RHEL
sudo yum install jdcloud-cli

# Fedora
sudo dnf install jdcloud-cli
```

### 手动安装

1. 从[发布页面](https://github.com/jdcloud/jdcloud-cli/releases)下载对应平台的二进制文件
2. 解压文件
3. 将`jdcloud`可执行文件移动到PATH路径中

```bash
# 示例：Linux AMD64
curl -O https://jdcloud-cli.jd.com/jdcloud-cli-linux-amd64.tar.gz
tar -xzf jdcloud-cli-linux-amd64.tar.gz
sudo mv jdcloud /usr/local/bin/
```

## 配置凭证

安装完成后，需要配置访问凭证：

```bash
jdcloud configure
```

按照提示输入：
- Access Key ID：您的京东云访问密钥ID
- Access Key Secret：您的京东云访问密钥
- Default Region ID：默认区域ID（例如：cn-north-1）
- Default Output Format：默认输出格式（json、yaml、table）

## 模拟模式

为了在没有真实京东云账户的情况下测试CLI功能，可以启用模拟模式：

```bash
export JDCLOUD_MOCK_MODE=true
```

在模拟模式下，CLI将返回预设的模拟数据，而不是调用真实的京东云API。

## 基本使用

### 查看帮助

```bash
# 查看主帮助
jdcloud help

# 查看特定服务的帮助
jdcloud vm help

# 查看特定命令的帮助
jdcloud vm describe-instances --help
```

### 云服务器管理

```bash
# 列出云服务器实例
jdcloud vm describe-instances

# 创建云服务器
jdcloud vm create-instance --image-id img-xxxxx --instance-type g.n2.medium --instance-name my-server

# 启动云服务器
jdcloud vm start-instance i-xxxxxx

# 停止云服务器
jdcloud vm stop-instance i-xxxxxx

# 重启云服务器
jdcloud vm reboot-instance i-xxxxxx

# 删除云服务器
jdcloud vm delete-instance i-xxxxxx
```

### VPC管理

```bash
# 列出VPC
jdcloud vpc describe-vpcs

# 创建VPC
jdcloud vpc create-vpc --vpc-name my-vpc --cidr-block 10.0.0.0/16

# 列出子网
jdcloud vpc describe-subnets --vpc-id vpc-xxxxx

# 创建子网
jdcloud vpc create-subnet --vpc-id vpc-xxxxx --subnet-name my-subnet --cidr-block 10.0.1.0/24 --az cn-north-1a
```

### 对象存储管理

```bash
# 列出存储桶
jdcloud oss list-buckets

# 创建存储桶
jdcloud oss create-bucket --bucket-name my-bucket

# 列出对象
jdcloud oss list-objects --bucket-name my-bucket

# 上传对象
jdcloud oss upload-object --bucket-name my-bucket --object-key file.txt --file-path /path/to/file.txt

# 下载对象
jdcloud oss download-object --bucket-name my-bucket --object-key file.txt --file-path /path/to/downloaded.txt

# 删除对象
jdcloud oss delete-object --bucket-name my-bucket --object-key file.txt

# 删除存储桶
jdcloud oss delete-bucket my-bucket
```

## 输出格式

京东云CLI支持多种输出格式：

```bash
# JSON格式（默认）
jdcloud vm describe-instances --output json

# YAML格式
jdcloud vm describe-instances --output yaml

# 表格格式
jdcloud vm describe-instances --output table
```

## 区域设置

```bash
# 使用特定区域
jdcloud vm describe-instances --region cn-north-1

# 使用配置文件中的默认区域
jdcloud vm describe-instances
```

## 配置文件

配置文件存储在`~/.jdcloud/config`中，包含以下信息：
- Access Key ID
- Access Key Secret
- 默认区域ID
- 默认输出格式

## 环境变量

京东云CLI支持以下环境变量：
- `JDCLOUD_ACCESS_KEY_ID`：访问密钥ID
- `JDCLOUD_ACCESS_KEY_SECRET`：访问密钥
- `JDCLOUD_REGION_ID`：区域ID
- `JDCLOUD_OUTPUT_FORMAT`：输出格式

## 自动补全

启用命令自动补全：

```bash
# Bash
source <(jdcloud completion bash)

# Zsh
source <(jdcloud completion zsh)

# Fish
jdcloud completion fish | source
```

## 常见问题

### Q: 如何获取Access Key？
A: 登录京东云控制台，进入"访问控制" -> "访问密钥管理"，创建新的访问密钥。

### Q: 如何查看所有可用的区域？
A: 使用 `jdcloud regions` 命令查看所有可用的区域。

### Q: 如何查看帮助文档？
A: 使用 `jdcloud help` 查看主帮助，或使用 `jdcloud <command> --help` 查看特定命令的帮助。

### Q: 如何调试API调用？
A: 使用 `--debug` 标志启用调试模式：
```bash
jdcloud vm describe-instances --debug