#!/bin/bash
#==============================================================================
# CMDB Platform 镜像构建与推送脚本
#
# 使用方法:
#   1. 在有网络的机器上执行此脚本
#   2. 推送镜像到镜像仓库
#   3. 在目标服务器上执行 deploy_simple.sh
#==============================================================================

set -e

IMAGE_NAME="cmdb-platform"
IMAGE_TAG="latest"

# 镜像仓库配置
REGISTRY_ALIYUN="registry.cn-shanghai.aliyuncs.com/dannamax/cmdb-platform:latest"

echo "========================================"
echo "  CMDB Platform 镜像构建与推送"
echo "========================================"
echo ""

# 构建镜像
echo "[1/3] 构建 Docker 镜像..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# 标记镜像
echo ""
echo "[2/3] 标记镜像..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_ALIYUN}

# 推送到阿里云
echo ""
echo "[3/3] 推送镜像到阿里云..."
echo "请确保已登录阿里云容器镜像服务"
echo "执行: docker login --username=你的阿里云账号 registry.cn-shanghai.aliyuncs.com"
echo ""
read -p "是否推送? (y/n): " confirm

if [ "$confirm" = "y" ]; then
    docker push ${REGISTRY_ALIYUN}
    echo ""
    echo "镜像推送成功!"
    echo "镜像地址: ${REGISTRY_ALIYUN}"
    echo ""
    echo "在目标服务器上执行:"
    echo "  mkdir -p /opt/cmdb && cd /opt/cmdb"
    echo "  curl -O https://raw.githubusercontent.com/dannamax/cloud/cmdb/deploy_simple.sh"
    echo "  chmod +x deploy_simple.sh"
    echo "  ./deploy_simple.sh pull"
else
    echo ""
    echo "已取消推送"
    echo ""
    echo "本地镜像信息:"
    docker images | grep ${IMAGE_NAME}
    echo ""
    echo "导出镜像为 tar 文件:"
    echo "  docker save -o cmdb-platform.tar ${IMAGE_NAME}:${IMAGE_TAG}"
fi
