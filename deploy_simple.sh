#!/bin/bash
#==============================================================================
# CMDB Platform 一键部署脚本
# 支持: CentOS 7 / Euler OS (Huawei EulerOS)
#
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh [start|pull|status|logs|restart|stop]
#==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
APP_NAME="cmdb-platform"
CONTAINER_NAME="cmdb-platform"
PORT=3000

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检测操作系统
detect_os() {
    if [ -f /etc/euleros-release ]; then
        echo "EulerOS"
    elif [ -f /etc/centos-release ]; then
        echo "CentOS"
    elif [ -f /etc/redhat-release ]; then
        echo "RedHat"
    else
        echo "Linux"
    fi
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，正在安装..."
        install_docker
    fi
    
    # 启动 Docker
    if command -v systemctl &> /dev/null; then
        systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    fi
    
    log_success "Docker 环境检查完成"
}

# 安装 Docker
install_docker() {
    local os_type=$(detect_os)
    log_info "检测到操作系统: $os_type"
    
    # 配置镜像加速
    log_info "配置 Docker 镜像加速器..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io"
  ]
}
EOF
    
    case "$os_type" in
        "CentOS"|"RedHat")
            log_info "安装 Docker (CentOS/RHEL)..."
            yum install -y yum-utils
            yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        "EulerOS")
            log_info "安装 Docker (EulerOS)..."
            cat > /etc/yum.repos.d/docker-ce.repo << 'EOF'
[docker-ce-stable]
name=Docker CE Stable
baseurl=https://mirrors.huaweicloud.com/docker-ce/linux/centos/7/x86_64/stable
enabled=1
gpgcheck=0
EOF
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        *)
            log_error "不支持的操作系统: $os_type"
            exit 1
            ;;
    esac
    
    systemctl daemon-reload
    systemctl enable docker
    systemctl restart docker
    log_success "Docker 安装完成"
}

# 拉取镜像并启动
pull_start() {
    log_info "拉取 CMDB Platform 镜像..."
    
    # 配置阿里云镜像加速（如果需要）
    if ! grep -q "aliyun" /etc/docker/daemon.json 2>/dev/null; then
        mkdir -p /etc/docker
        cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io",
    "https://registry.cn-shanghai.aliyuncs.com"
  ]
}
EOF
        systemctl daemon-reload
        systemctl restart docker
    fi
    
    # 拉取镜像
    docker pull registry.cn-shanghai.aliyuncs.com/dannamax/cmdb-platform:latest || {
        log_warn "阿里云镜像拉取失败，尝试其他镜像源..."
        docker build -t cmdb-platform:latest . || {
            log_error "镜像构建失败"
            exit 1
        }
    }
    
    # 停止旧容器
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # 创建数据目录
    mkdir -p data uploads
    
    # 启动容器
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        -v $(pwd)/data:/app/data \
        -v $(pwd)/uploads:/app/uploads \
        --restart unless-stopped \
        registry.cn-shanghai.aliyuncs.com/dannamax/cmdb-platform:latest || \
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        -v $(pwd)/data:/app/data \
        -v $(pwd)/uploads:/app/uploads \
        --restart unless-stopped \
        cmdb-platform:latest
    
    log_success "CMDB Platform 已启动!"
    log_info "访问地址: http://localhost:$PORT"
    log_info "API 地址: http://localhost:$PORT/api"
}

# 直接启动（使用本地镜像）
start() {
    check_docker
    
    if docker images | grep -q "cmdb-platform"; then
        log_info "使用本地镜像启动..."
    else
        log_info "本地镜像不存在，正在拉取..."
        pull_start
        return
    fi
    
    # 停止旧容器
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # 创建数据目录
    mkdir -p data uploads
    
    # 启动容器
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        -v $(pwd)/data:/app/data \
        -v $(pwd)/uploads:/app/uploads \
        --restart unless-stopped \
        cmdb-platform:latest
    
    log_success "CMDB Platform 已启动!"
    log_info "访问地址: http://localhost:$PORT"
}

# 停止
stop() {
    log_info "停止 CMDB Platform..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    log_success "CMDB Platform 已停止"
}

# 重启
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker logs -f $CONTAINER_NAME
}

# 查看状态
status() {
    echo "========================================"
    echo "        CMDB Platform 状态"
    echo "========================================"
    echo ""
    
    # 容器状态
    echo -e "${BLUE}容器状态:${NC}"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "容器未运行"
    echo ""
    
    # 端口检查
    echo -e "${BLUE}端口检查 (${PORT}):${NC}"
    if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo -e "${GREEN}●${NC} 端口 $PORT 正在监听"
    else
        echo -e "${RED}○${NC} 端口 $PORT 未监听"
    fi
    echo ""
    
    # 健康检查
    echo -e "${BLUE}健康检查:${NC}"
    if curl -s http://localhost:$PORT/api/health &>/dev/null; then
        echo -e "${GREEN}●${NC} 服务正常"
        curl -s http://localhost:$PORT/api/health
    else
        echo -e "${RED}○${NC} 服务异常或未启动"
    fi
    echo ""
}

# 帮助
help() {
    echo "========================================"
    echo "     CMDB Platform 一键部署脚本"
    echo "========================================"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  pull   - 拉取镜像并启动 (推荐，首次部署)"
    echo "  start  - 启动服务"
    echo "  stop   - 停止服务"
    echo "  restart- 重启服务"
    echo "  logs   - 查看日志"
    echo "  status - 查看状态"
    echo "  help   - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 pull    # 首次部署"
    echo "  $0 start   # 启动服务"
    echo "  $0 logs    # 查看日志"
    echo ""
}

# 主函数
main() {
    local cmd=${1:-help}
    
    log_info "CMDB Platform 部署工具"
    log_info "操作系统: $(detect_os)"
    echo ""
    
    case "$cmd" in
        pull)
            check_docker
            pull_start
            ;;
        start)
            check_docker
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        help|--help|-h)
            help
            ;;
        *)
            log_error "未知命令: $cmd"
            help
            exit 1
            ;;
    esac
}

main "$@"
