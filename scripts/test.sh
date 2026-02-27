#!/bin/bash

# 京东云CLI测试脚本

set -e

echo "开始测试京东云CLI..."

# 构建CLI
echo "构建CLI..."
make build

# 测试帮助命令
echo "测试帮助命令..."
./bin/jdcloud --help > /dev/null
echo "✓ 根命令帮助正常"

# 测试VM服务
echo "测试VM服务..."
./bin/jdcloud vm --help > /dev/null
echo "✓ VM命令帮助正常"

./bin/jdcloud vm describe-instances > /dev/null
echo "✓ VM列表实例正常"

./bin/jdcloud vm create-instance --image-id img-test --instance-type g.n2.medium > /dev/null
echo "✓ VM创建实例正常"

./bin/jdcloud vm start-instance i-test123 > /dev/null
echo "✓ VM启动实例正常"

./bin/jdcloud vm stop-instance i-test123 > /dev/null
echo "✓ VM停止实例正常"

./bin/jdcloud vm reboot-instance i-test123 > /dev/null
echo "✓ VM重启实例正常"

./bin/jdcloud vm delete-instance i-test123 > /dev/null
echo "✓ VM删除实例正常"

# 测试VPC服务
echo "测试VPC服务..."
./bin/jdcloud vpc --help > /dev/null
echo "✓ VPC命令帮助正常"

./bin/jdcloud vpc describe-vpcs > /dev/null
echo "✓ VPC列表正常"

./bin/jdcloud vpc create-vpc --vpc-name test-vpc --cidr-block 10.0.0.0/16 > /dev/null
echo "✓ VPC创建正常"

./bin/jdcloud vpc delete-vpc vpc-test123 > /dev/null
echo "✓ VPC删除正常"

./bin/jdcloud vpc describe-subnets > /dev/null
echo "✓ 子网列表正常"

./bin/jdcloud vpc create-subnet --vpc-id vpc-test123 --subnet-name test-subnet --cidr-block 10.0.1.0/24 > /dev/null
echo "✓ 子网创建正常"

# 测试OSS服务
echo "测试OSS服务..."
./bin/jdcloud oss --help > /dev/null
echo "✓ OSS命令帮助正常"

./bin/jdcloud oss list-buckets > /dev/null
echo "✓ OSS存储桶列表正常"

./bin/jdcloud oss create-bucket --bucket-name test-bucket > /dev/null
echo "✓ OSS创建存储桶正常"

./bin/jdcloud oss list-objects --bucket-name test-bucket > /dev/null
echo "✓ OSS对象列表正常"

./bin/jdcloud oss upload-object --bucket-name test-bucket --object-key test.txt --file-path /tmp/test.txt > /dev/null
echo "✓ OSS上传对象正常"

./bin/jdcloud oss download-object --bucket-name test-bucket --object-key test.txt --file-path /tmp/downloaded.txt > /dev/null
echo "✓ OSS下载对象正常"

./bin/jdcloud oss delete-object --bucket-name test-bucket --object-key test.txt > /dev/null
echo "✓ OSS删除对象正常"

./bin/jdcloud oss delete-bucket test-bucket > /dev/null
echo "✓ OSS删除存储桶正常"

# 测试配置命令
echo "测试配置命令..."
./bin/jdcloud configure --help > /dev/null
echo "✓ 配置命令帮助正常"

echo "所有测试通过！"
echo "京东云CLI工具工作正常。"