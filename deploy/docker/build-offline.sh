#!/bin/bash
#
# CMDB Platform 离线构建脚本
# 在有网络的机器上执行此脚本，生成离线部署包
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${SCRIPT_DIR}/offline-package"
IMAGE_NAME="cmdb-platform"
IMAGE_TAG="latest"
TARBALL_NAME="cmdb-platform-offline.tar.gz"

echo "========================================"
echo "  CMDB Platform 离线构建脚本"
echo "========================================"
echo ""

# 创建构建目录
echo "[1/5] 创建构建目录..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/docker"

# 复制项目文件
echo "[2/5] 复制项目文件..."
cp -r "${PROJECT_ROOT}/." "$BUILD_DIR/"

# 复制 Docker 相关文件
echo "[3/5] 复制 Docker 配置文件..."
cp "${SCRIPT_DIR}/docker-compose.yml" "$BUILD_DIR/docker/"
cp "${SCRIPT_DIR}/nginx.conf" "$BUILD_DIR/docker/"
cp "${SCRIPT_DIR}/.env" "$BUILD_DIR/docker/"
cp "${SCRIPT_DIR}/deploy-offline.sh" "$BUILD_DIR/docker/"
chmod +x "$BUILD_DIR/docker/deploy-offline.sh"

# 构建 Docker 镜像
echo "[4/5] 构建 Docker 镜像 (需要网络)..."
cd "$BUILD_DIR"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

# 导出镜像为 tar 包
echo "[5/5] 导出镜像为离线包..."
docker save "${IMAGE_NAME}:${IMAGE_TAG}" | gzip > "${BUILD_DIR}/${TARBALL_NAME}"

# 生成 MD5 校验文件
md5sum "${BUILD_DIR}/${TARBALL_NAME}" > "${BUILD_DIR}/${TARBALL_NAME}.md5"

# 显示结果
echo ""
echo "========================================"
echo "  构建完成!"
echo "========================================"
echo ""
echo "离线部署包位置: ${BUILD_DIR}/${TARBALL_NAME}"
echo "MD5 校验文件: ${BUILD_DIR}/${TARBALL_NAME}.md5"
echo ""
echo "部署包内容:"
echo "  - ${TARBALL_NAME}     # Docker 镜像包"
echo "  - docker-compose.yml   # 容器编排配置"
echo "  - nginx.conf           # Nginx 配置"
echo "  - deploy-offline.sh     # 部署脚本"
echo ""
echo "部署步骤:"
echo "  1. 将 ${BUILD_DIR} 目录复制到目标机器"
echo "  2. 在目标机器上执行: cd docker && ./deploy-offline.sh"
echo ""
