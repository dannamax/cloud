#!/bin/bash
#==============================================================================
# CMDB Platform 部署脚本
# 支持: CentOS 7 / Euler OS (Huawei EulerOS)
# 
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh [start|stop|restart|logs|status|rebuild]
#==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_NAME="cmdb-platform"
CONTAINER_NAME="cmdb-platform"
PORT=3000
IMAGE_NAME="cmdb-platform:latest"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [ -f /etc/euleros-release ]; then
        echo "EulerOS"
    elif [ -f /etc/centos-release ]; then
        echo "CentOS"
    elif [ -f /etc/redhat-release ]; then
        echo "RedHat"
    elif [ -f /etc/os-release ]; then
        grep -q "Euler" /etc/os-release && echo "EulerOS" || echo "Linux"
    else
        echo "Unknown"
    fi
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，正在安装..."
        install_docker
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，正在安装..."
        install_docker_compose
    fi
    
    # 启动 Docker 服务
    if command -v systemctl &> /dev/null; then
        systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    fi
    
    log_success "Docker 环境检查完成"
}

# 安装 Docker (CentOS 7 / Euler)
install_docker() {
    local os_type=$(detect_os)
    log_info "检测到操作系统: $os_type"
    
    case "$os_type" in
        "CentOS"|"RedHat")
            log_info "安装 Docker (CentOS/RHEL)..."
            yum install -y yum-utils device-mapper-persistent-data lvm2
            yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        "EulerOS")
            log_info "安装 Docker (EulerOS)..."
            # EulerOS 使用华为镜像源
            cat > /etc/yum.repos.d/docker-ce.repo << 'EOF'
[docker-ce-stable]
name=Docker CE Stable - $basearch
baseurl=https://mirrors.huaweicloud.com/docker-ce/linux/centos/7/$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://mirrors.huaweicloud.com/docker-ce/linux/centos/gpg
EOF
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        *)
            log_error "不支持的操作系统: $os_type"
            exit 1
            ;;
    esac
    
    # 配置国内镜像加速 (多源配置)
    log_info "配置 Docker 镜像加速器..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io",
    "https://dockerpull.cn",
    "https://pull.unitech.tech"
  ]
}
EOF
    
    # 启动 Docker
    systemctl enable docker
    systemctl daemon-reload
    systemctl restart docker
    
    # 等待 Docker 启动
    sleep 3
    
    # 添加当前用户到 docker 组
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
    elif [ -n "$USER" ]; then
        usermod -aG docker $USER
    fi
    
    log_success "Docker 安装完成 (已配置镜像加速)"
}

# 安装 Docker Compose
install_docker_compose() {
    local os_type=$(detect_os)
    
    log_info "安装 Docker Compose..."
    
    # 下载 Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
}

# 构建镜像
build() {
    log_info "构建 Docker 镜像..."
    docker build -t $IMAGE_NAME .
    log_success "镜像构建完成: $IMAGE_NAME"
}

# 启动服务
start() {
    log_info "启动 CMDB 平台..."
    
    # 检查端口是否被占用
    if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        log_warn "端口 $PORT 已被占用"
        read -p "是否停止占用端口的进程并继续? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            fuser -k $PORT/tcp 2>/dev/null || true
            sleep 2
        else
            exit 1
        fi
    fi
    
    docker-compose up -d
    log_success "CMDB 平台已启动!"
    log_info "访问地址: http://localhost:$PORT"
    log_info "API 地址: http://localhost:$PORT/api"
}

# 停止服务
stop() {
    log_info "停止 CMDB 平台..."
    docker-compose down
    log_success "CMDB 平台已停止"
}

# 重启服务
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker-compose logs -f --tail=100
}

# 查看状态
status() {
    echo "========================================"
    echo "        CMDB Platform 状态"
    echo "========================================"
    echo ""
    
    # 容器状态
    echo -e "${BLUE}容器状态:${NC}"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
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
        curl -s http://localhost:$PORT/api/health | head -1
    else
        echo -e "${RED}○${NC} 服务异常或未启动"
    fi
    echo ""
}

# 重建服务
rebuild() {
    log_info "重建 CMDB 平台..."
    docker-compose down
    docker rmi $IMAGE_NAME 2>/dev/null || true
    build
    docker-compose up -d
    log_success "CMDB 平台重建完成!"
}

# 查看帮助
help() {
    echo "========================================"
    echo "     CMDB Platform 部署脚本"
    echo "========================================"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  logs     - 查看日志 (Ctrl+C 退出)"
    echo "  status   - 查看服务状态"
    echo "  rebuild  - 重建镜像并启动"
    echo "  build    - 仅构建镜像"
    echo "  help     - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动服务"
    echo "  $0 logs     # 查看日志"
    echo ""
}

# 主函数
main() {
    local cmd=${1:-help}
    
    log_info "CMDB Platform 部署工具"
    log_info "操作系统: $(detect_os)"
    echo ""
    
    case "$cmd" in
        start)
            check_docker
            build
            start
            ;;
        stop)
            stop
            ;;
        restart)
            check_docker
            restart
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        rebuild)
            check_docker
            rebuild
            ;;
        build)
            check_docker
            build
            ;;
        help|--help|-h)
            help
            ;;
        *)
            log_error "未知命令: $cmd"
            echo ""
            help
            exit 1
            ;;
    esac
}

main "$@"
