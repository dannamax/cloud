# 京东云CLI使用示例

## 云服务器管理示例

### 1. 列出所有云服务器实例

```bash
# 以表格格式查看
jdcloud vm describe-instances --output table
```

### 2. 创建云服务器实例

```bash
# 创建一台新的云服务器
jdcloud vm create-instance \
  --image-id img-123456 \
  --instance-type g.n2.medium \
  --instance-name web-server \
  --vpc-id vpc-123456 \
  --subnet-id subnet-123456
```

### 3. 批量操作

```bash
# 启动多个实例
jdcloud vm start-instance i-123456
jdcloud vm start-instance i-789012

# 停止所有运行中的实例（需要先查询）
jdcloud vm describe-instances --output json | jq -r '.[] | select(.Status == "running") | .InstanceId' | xargs -I {} jdcloud vm stop-instance {}
```

## VPC管理示例

### 1. 创建完整的网络环境

```bash
# 创建VPC
VPC_ID=$(jdcloud vpc create-vpc --vpc-name production-vpc --cidr-block 10.0.0.0/16 --output json | jq -r '.VpcId')

# 创建子网
SUBNET_ID=$(jdcloud vpc create-subnet \
  --vpc-id $VPC_ID \
  --subnet-name web-subnet \
  --cidr-block 10.0.1.0/24 \
  --az cn-north-1a \
  --output json | jq -r '.SubnetId')

echo "Created VPC: $VPC_ID"
echo "Created Subnet: $SUBNET_ID"
```

### 2. 查看网络拓扑

```bash
# 查看所有VPC
jdcloud vpc describe-vpcs --output table

# 查看特定VPC的子网
jdcloud vpc describe-subnets --output table
```

## 对象存储管理示例

### 1. 创建存储桶并上传文件

```bash
# 创建存储桶
BUCKET_NAME="my-app-bucket-$(date +%s)"
jdcloud oss create-bucket --bucket-name $BUCKET_NAME

# 上传文件
echo "Hello, JDCloud!" > hello.txt
jdcloud oss upload-object \
  --bucket-name $BUCKET_NAME \
  --object-key hello.txt \
  --file-path hello.txt
```

### 2. 批量上传文件

```bash
# 上传整个目录
find /path/to/local/dir -type f | while read file; do
  object_key="${file#/path/to/local/dir/}"
  jdcloud oss upload-object \
    --bucket-name $BUCKET_NAME \
    --object-key "$object_key" \
    --file-path "$file"
done
```

### 3. 下载和同步

```bash
# 下载单个文件
jdcloud oss download-object \
  --bucket-name $BUCKET_NAME \
  --object-key hello.txt \
  --file-path downloaded_hello.txt

# 列出所有对象
jdcloud oss list-objects --bucket-name $BUCKET_NAME --output table
```

## 自动化脚本示例

### 1. 自动部署Web服务器

```bash
#!/bin/bash
# deploy-web-server.sh

set -e

# 配置变量
IMAGE_ID="img-ubuntu-20.04"
INSTANCE_TYPE="g.n2.small"
VPC_NAME="web-vpc"
SUBNET_NAME="web-subnet"

echo "开始部署Web服务器..."

# 创建VPC
VPC_ID=$(jdcloud vpc create-vpc \
  --vpc-name $VPC_NAME \
  --cidr-block 10.0.0.0/16 \
  --output json | jq -r '.VpcId')

echo "创建VPC: $VPC_ID"

# 创建子网
SUBNET_ID=$(jdcloud vpc create-subnet \
  --vpc-id $VPC_ID \
  --subnet-name $SUBNET_NAME \
  --cidr-block 10.0.1.0/24 \
  --az cn-north-1a \
  --output json | jq -r '.SubnetId')

echo "创建子网: $SUBNET_ID"

# 创建云服务器
INSTANCE_ID=$(jdcloud vm create-instance \
  --image-id $IMAGE_ID \
  --instance-type $INSTANCE_TYPE \
  --instance-name web-server \
  --vpc-id $VPC_ID \
  --subnet-id $SUBNET_ID \
  --output json | jq -r '.InstanceIds[0]')

echo "创建云服务器: $INSTANCE_ID"

# 启动实例
jdcloud vm start-instance $INSTANCE_ID
echo "启动实例完成"

echo "Web服务器部署完成！"
echo "实例ID: $INSTANCE_ID"
```

### 2. 备份脚本

```bash
#!/bin/bash
# backup-to-oss.sh

set -e

# 配置
BACKUP_DIR="/var/www/html"
BUCKET_NAME="website-backups-$(date +%Y%m%d)"
DATE=$(date +%Y%m%d_%H%M%S)

echo "开始备份到对象存储..."

# 创建存储桶
jdcloud oss create-bucket --bucket-name $BUCKET_NAME --storage-class Standard

# 上传备份
tar -czf /tmp/backup_$DATE.tar.gz -C $BACKUP_DIR .
jdcloud oss upload-object \
  --bucket-name $BUCKET_NAME \
  --object-key "backup_$DATE.tar.gz" \
  --file-path /tmp/backup_$DATE.tar.gz

# 清理临时文件
rm /tmp/backup_$DATE.tar.gz

echo "备份完成！存储桶: $BUCKET_NAME"
```

## 输出格式处理示例

### 1. 使用JSON输出进行自动化

```bash
# 获取实例列表并提取特定字段
jdcloud vm describe-instances --output json | jq -r '.[] | "\(.InstanceId) \(.InstanceName) \(.Status)"'

# 过滤特定状态的实例
jdcloud vm describe-instances --output json | jq -r '.[] | select(.Status == "running") | .InstanceId'
```

### 2. 使用YAML输出进行配置管理

```bash
# 导出当前配置为YAML格式
jdcloud vm describe-instances --output yaml > instances.yaml

# 使用YAML作为配置文件
cat > deploy-config.yaml << EOF
instances:
  - name: web-server
    type: g.n2.medium
    image: img-ubuntu-20.04
  - name: db-server
    type: g.n2.large
    image: img-centos-7
EOF
```

### 3. 使用表格输出进行人工查看

```bash
# 以表格格式查看资源
jdcloud vm describe-instances --output table
jdcloud vpc describe-vpcs --output table
jdcloud oss list-buckets --output table
```

## 错误处理和调试

### 1. 启用调试模式

```bash
# 启用调试模式查看HTTP请求
jdcloud vm describe-instances --debug
```

### 2. 错误处理脚本

```bash
#!/bin/bash
# error-handling.sh

# 创建实例并处理可能的错误
result=$(jdcloud vm create-instance \
  --image-id img-invalid \
  --instance-type g.n2.medium \
  --output json 2>&1)

if [[ $? -ne 0 ]]; then
  echo "创建实例失败: $result"
  exit 1
fi

INSTANCE_ID=$(echo $result | jq -r '.InstanceIds[0]')
echo "实例创建成功: $INSTANCE_ID"
```

## 最佳实践

### 1. 使用环境变量

```bash
# 设置环境变量
export JDCLOUD_ACCESS_KEY_ID="your-access-key-id"
export JDCLOUD_ACCESS_KEY_SECRET="your-access-key-secret"
export JDCLOUD_REGION_ID="cn-north-1"

# 使用环境变量运行命令
jdcloud vm describe-instances
```

### 2. 配置文件管理

```bash
# 创建多个配置文件
jdcloud configure --profile production
jdcloud configure --profile development

# 使用特定配置文件
jdcloud vm describe-instances --profile production
```

### 3. 脚本化操作

```bash
# 创建可重用的函数
create_web_server() {
  local name=$1
  local type=$2
  
  jdcloud vm create-instance \
    --image-id img-ubuntu-20.04 \
    --instance-type $type \
    --instance-name $name \
    --output json | jq -r '.InstanceIds[0]'
}

# 使用函数
SERVER_ID=$(create_web_server "web-01" "g.n2.small")
echo "Created server: $SERVER_ID"