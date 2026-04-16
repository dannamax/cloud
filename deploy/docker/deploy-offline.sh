#!/bin/bash
#
# CMDB Platform 离线部署脚本
# 在目标机器（openEuler）上执行此脚本
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_TAR="cmdb-platform-offline.tar.gz"
IMAGE_NAME="cmdb-platform"
IMAGE_TAG="latest"
DATA_DIR="/data/cmdb"
LOG_DIR="/var/log/cmdb"

echo "========================================"
echo "  CMDB Platform 离线部署脚本"
echo "========================================"
echo ""

# 检查 Docker 是否安装
echo "[1/6] 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装!"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查 Docker 服务是否运行
if ! docker info &> /dev/null; then
    echo "错误: Docker 服务未运行!"
    echo "请执行: systemctl start docker"
    exit 1
fi

echo "Docker 版本: $(docker --version)"
echo ""

# 创建数据目录
echo "[2/6] 创建数据目录..."
sudo mkdir -p "$DATA_DIR"
sudo mkdir -p "$LOG_DIR"
sudo chmod 777 "$DATA_DIR"
sudo chmod 777 "$LOG_DIR"
echo "数据目录: $DATA_DIR"
echo "日志目录: $LOG_DIR"
echo ""

# 加载 Docker 镜像
echo "[3/6] 加载 Docker 镜像..."
if [ -f "${SCRIPT_DIR}/${IMAGE_TAR}" ]; then
    # 验证 MD5
    if [ -f "${SCRIPT_DIR}/${IMAGE_TAR}.md5" ]; then
        echo "验证镜像完整性..."
        cd "$SCRIPT_DIR"
        if ! md5sum -c "${IMAGE_TAR}.md5" &> /dev/null; then
            echo "警告: MD5 校验失败，镜像可能已损坏!"
            read -p "是否继续? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    echo "正在加载镜像 (可能需要几分钟)..."
    docker load < "${SCRIPT_DIR}/${IMAGE_TAR}"
    echo "镜像加载完成"
else
    echo "错误: 找不到镜像文件 ${SCRIPT_DIR}/${IMAGE_TAR}"
    echo "请确保镜像文件存在于当前目录"
    exit 1
fi
echo ""

# 停止并删除旧容器（如存在）
echo "[4/6] 清理旧容器..."
docker stop cmdb-platform &> /dev/null || true
docker rm cmdb-platform &> /dev/null || true
echo "旧容器已清理"
echo ""

# 启动容器
echo "[5/6] 启动容器..."
cd "$SCRIPT_DIR"
docker-compose up -d

# 等待容器启动
echo "等待服务启动..."
sleep 5

# 检查容器状态
echo ""
echo "[6/6] 检查服务状态..."
if docker ps | grep -q cmdb-platform; then
    echo "容器状态: 运行中"
    
    # 健康检查
    echo "执行健康检查..."
    for i in {1..5}; do
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            echo "健康检查: 通过"
            break
        fi
        if [ $i -eq 5 ]; then
            echo "警告: 健康检查未通过，请检查容器日志"
        fi
        sleep 2
    done
else
    echo "错误: 容器启动失败!"
    echo "请检查日志: docker logs cmdb-platform"
    exit 1
fi
echo ""

# 显示部署信息
echo "========================================"
echo "  部署完成!"
echo "========================================"
echo ""
echo "访问地址: http://<服务器IP>"
echo ""
echo "常用命令:"
echo "  查看日志: docker logs -f cmdb-platform"
echo "  重启服务: docker restart cmdb-platform"
echo "  停止服务: docker stop cmdb-platform"
echo "  启动服务: docker start cmdb-platform"
echo ""
echo "数据持久化:"
echo "  数据库: $DATA_DIR"
echo "  日志文件: $LOG_DIR"
echo ""
