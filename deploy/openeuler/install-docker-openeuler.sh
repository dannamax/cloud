#!/bin/bash
#
# Docker 和 Docker Compose 安装脚本
# 适用于 openEuler 22.03/20.03 LTS
#

set -e

echo "========================================"
echo "  Docker 安装脚本 (openEuler)"
echo "========================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户执行此脚本"
    echo "或使用: sudo $0"
    exit 1
fi

# 检测 openEuler 版本
if [ -f /etc/openEuler-release ]; then
    OS_VERSION=$(cat /etc/openEuler-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
    echo "检测到 openEuler ${OS_VERSION}"
elif [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_VERSION=$VERSION_ID
    echo "检测到 ${PRETTY_NAME}"
else
    echo "无法检测操作系统版本"
    exit 1
fi

# 步骤 1: 安装依赖
echo ""
echo "[1/5] 安装依赖..."
dnf install -y \
    dnf-plugins-core \
    device-mapper-persistent-data \
    lvm2 \
    curl \
    ca-certificates \
    gnupg \
    jq

# 步骤 2: 添加 Docker 仓库
echo ""
echo "[2/5] 添加 Docker 仓库..."

# 检查是否已安装 Docker
if command -v docker &> /dev/null; then
    echo "Docker 已安装: $(docker --version)"
    read -p "是否重新安装? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过 Docker 安装"
        SKIP_DOCKER=true
    fi
fi

if [ "$SKIP_DOCKER" != "true" ]; then
    # 移除旧版本（如果存在）
    dnf remove -y docker docker-client docker-client-latest docker-common \
        docker-latest docker-logrotate docker-engine 2>/dev/null || true

    # 添加 Docker 官方仓库
    dnf config-manager --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo

    # 安装 Docker
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# 步骤 3: 启动 Docker 服务
echo ""
echo "[3/5] 启动 Docker 服务..."
systemctl start docker
systemctl enable docker

# 步骤 4: 验证安装
echo ""
echo "[4/5] 验证安装..."
echo "Docker 版本: $(docker --version)"
echo "Docker Compose 版本: $(docker compose version)"

# 步骤 5: 配置 Docker 镜像加速（可选）
echo ""
echo "[5/5] 配置 Docker..."

# 配置镜像加速（阿里云镜像加速器）
read -p "是否配置 Docker 镜像加速器? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF
    systemctl daemon-reload
    systemctl restart docker
    echo "镜像加速器配置完成"
fi

# 完成
echo ""
echo "========================================"
echo "  Docker 安装完成!"
echo "========================================"
echo ""
echo "后续步骤:"
echo "  1. 将当前目录设置为非 root 用户可访问"
echo "     sudo chmod -R 755 /path/to/cmdb"
echo ""
echo "  2. 创建数据目录"
echo "     sudo mkdir -p /data/cmdb /var/log/cmdb"
echo "     sudo chmod 777 /data/cmdb /var/log/cmdb"
echo ""
echo "  3. 部署 CMDB Platform"
echo "     cd /path/to/cmdb/deploy/docker"
echo "     chmod +x deploy-offline.sh"
echo "     sudo ./deploy-offline.sh"
echo ""
echo "  4. 验证部署"
echo "     curl http://localhost/health"
echo ""
