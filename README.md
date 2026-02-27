# 京东云CLI工具 (JDCloud CLI)

## 项目概述

京东云CLI是一个命令行工具，用于管理和使用京东云资源。本项目旨在对标阿里云CLI，提供类似的功能和用户体验。

## 功能特性

### 核心功能
- ✅ 多认证方式支持（AK、临时凭证、角色扮演等）
- ✅ 多区域支持
- ✅ 多种输出格式（JSON、YAML、表格）
- ✅ 命令自动补全
- ✅ 配置文件管理
- ✅ 轮询等待功能

### 云服务支持
- ✅ 云服务器（VM）
- ✅ 虚拟私有云（VPC）
- ✅ 对象存储（OSS）
- ⏳ 云数据库（RDS）
- ⏳ 负载均衡（SLB）
- ⏳ 弹性伸缩（AS）

### 高级功能
- ✅ 批量操作
- ✅ 模板化部署
- ✅ 脚本化执行
- ✅ 结果过滤和查询

## 安装方式

### 通过脚本安装（推荐）
```bash
/bin/bash -c "$(curl -fsSL https://jdcloud-cli.jd.com/install.sh)"
```

### 手动安装
```bash
# 下载对应平台的二进制文件
curl -O https://jdcloud-cli.jd.com/jdcloud-cli-linux-amd64.tar.gz
tar -xzf jdcloud-cli-linux-amd64.tar.gz
sudo mv jdcloud /usr/local/bin/
```

## 快速开始

### 1. 配置凭证
```bash
jdcloud configure
```

### 2. 查看帮助信息
```bash
jdcloud help
```

### 3. 使用示例
```bash
# 使用模拟模式（默认）
export JDCLOUD_MOCK_MODE=true
jdcloud vm describe-instances

# 查看云服务器列表
jdcloud vm describe-instances

# 创建云服务器
jdcloud vm create-instance --image-id img-xxxxx --instance-type g.n2.medium

# 启动云服务器
jdcloud vm start-instance i-xxxxxxxxx

# 停止云服务器
jdcloud vm stop-instance i-xxxxxxxxx

# 重启云服务器
jdcloud vm reboot-instance i-xxxxxxxxx

# 删除云服务器
jdcloud vm delete-instance i-xxxxxxxxx

# 查看VPC列表
jdcloud vpc describe-vpcs

# 创建VPC
jdcloud vpc create-vpc --vpc-name my-vpc --cidr-block 10.0.0.0/16

# 删除VPC
jdcloud vpc delete-vpc vpc-xxxxxxxxx

# 查看子网列表
jdcloud vpc describe-subnets

# 创建子网
jdcloud vpc create-subnet --vpc-id vpc-xxxxxxxxx --subnet-name my-subnet --cidr-block 10.0.1.0/24

# 查看存储桶列表
jdcloud oss list-buckets

# 创建存储桶
jdcloud oss create-bucket --bucket-name my-bucket

# 查看对象列表
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

### 3. 使用示例
```bash
# 查看云服务器列表
jdcloud vm describe-instances

# 创建云服务器
jdcloud vm create-instance --image-id img-xxxxx --instance-type g.n2.medium

# 启动云服务器
jdcloud vm start-instance i-xxxxxxxxx

# 停止云服务器
jdcloud vm stop-instance i-xxxxxxxxx

# 重启云服务器
jdcloud vm reboot-instance i-xxxxxxxxx

# 删除云服务器
jdcloud vm delete-instance i-xxxxxxxxx

# 查看VPC列表
jdcloud vpc describe-vpcs

# 创建VPC
jdcloud vpc create-vpc --vpc-name my-vpc --cidr-block 10.0.0.0/16

# 删除VPC
jdcloud vpc delete-vpc vpc-xxxxxxxxx

# 查看子网列表
jdcloud vpc describe-subnets

# 创建子网
jdcloud vpc create-subnet --vpc-id vpc-xxxxxxxxx --subnet-name my-subnet --cidr-block 10.0.1.0/24

# 查看存储桶列表
jdcloud oss list-buckets

# 创建存储桶
jdcloud oss create-bucket --bucket-name my-bucket

# 查看对象列表
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

## 命令结构

```
jdcloud <service> <operation> [--parameter1 value1 --parameter2 value2 ...]
```

## 与阿里云CLI对比

| 功能 | 京东云CLI | 阿里云CLI |
|------|-----------|-----------|
| 认证方式 | 多种认证方式 | 多种认证方式 |
| 输出格式 | JSON、YAML、表格 | JSON、表格 |
| 自动补全 | ✅ | ✅ |
| 配置文件 | ✅ | ✅ |
| 轮询等待 | ✅ | ✅ |
| 批量操作 | ✅ | ✅ |
| 模板化部署 | ✅ | ❌ |
| 脚本化执行 | ✅ | ✅ |

## 文档

- [快速开始](docs/quick-start.md) - 快速上手京东云CLI
- [认证配置](docs/authentication.md) - 详细说明如何配置API凭证
- [使用示例](docs/examples.md) - 详细的使用示例和脚本
- [功能对比](docs/comparison.md) - 与阿里云CLI的详细对比

## 开发指南

### 技术栈
- 语言：Go
- 构建工具：Makefile
- 依赖管理：Go Modules
- 测试框架：Go Test

### 项目结构
```
jdcloud-cli/
├── cmd/              # 命令行入口
├── internal/         # 内部实现
│   ├── auth/         # 认证模块
│   ├── command/      # 命令实现
│   ├── config/       # 配置管理
│   ├── output/       # 输出格式化
│   └── utils/        # 工具函数
├── docs/             # 文档
├── scripts/          # 脚本文件
└── bin/              # 编译后的二进制文件
```

### 构建和测试

```bash
# 构建
make build

# 运行测试
make test

# 安装
make install

# 清理
make clean
```

## 贡献指南

欢迎提交Issue和Pull Request来改进京东云CLI。

## 许可证

Apache License 2.0