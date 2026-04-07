#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
IMAGE_NAME="cmdb-platform:latest"
CONTAINER_NAME="cmdb-platform"
PORT=3000

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        log_info "安装命令："
        echo "yum install -y yum-utils"
        echo "yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo"
        echo "yum install -y docker-ce docker-ce-cli containerd.io"
        echo "systemctl start docker && systemctl enable docker"
        exit 1
    fi
    log_success "Docker 环境检查完成"
}

# 加载镜像
load_image() {
    if docker images | grep -q "cmdb-platform"; then
        log_info "镜像已存在，跳过加载"
        return
    fi
    
    log_info "加载 Docker 镜像..."
    if [ -f "cmdb-platform.tar.gz" ]; then
        docker load -i cmdb-platform.tar.gz
    elif [ -f "cmdb-platform.tar" ]; then
        docker load -i cmdb-platform.tar
    else
        log_error "找不到镜像文件: cmdb-platform.tar.gz 或 cmdb-platform.tar"
        log_error "请确保镜像文件在当前目录"
        exit 1
    fi
    log_success "镜像加载完成"
}

# 启动服务
start() {
    log_info "启动 CMDB 平台..."
    
    # 检查镜像是否存在
    if ! docker images | grep -q "cmdb-platform"; then
        log_error "镜像不存在，请先运行: ./deploy.sh load"
        exit 1
    fi
    
    # 停止旧容器
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # 启动新容器
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p $PORT:3000 \
        -e NODE_ENV=production \
        -e PORT=3000 \
        -v cmdb-data:/app/data \
        -v cmdb-uploads:/app/uploads \
        $IMAGE_NAME
    
    log_success "CMDB 平台已启动!"
    log_info "访问地址: http://localhost:$PORT"
    log_info "API 地址: http://localhost:$PORT/api"
    log_info "默认账号: admin / admin"
}

# 停止服务
stop() {
    log_info "停止 CMDB 平台..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    log_success "CMDB 平台已停止"
}

# 重启服务
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker logs -f --tail=100 $CONTAINER_NAME
}

# 查看状态
status() {
    echo "========================================"
    echo "        CMDB Platform 状态"
    echo "========================================"
    echo ""
    
    # 容器状态
    echo -e "${BLUE}容器状态:${NC}"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
        echo "未找到容器: $CONTAINER_NAME"
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

# 查看帮助
help() {
    echo "========================================"
    echo "     CMDB Platform 离线部署脚本"
    echo "========================================"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start    - 加载镜像并启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  logs     - 查看日志 (Ctrl+C 退出)"
    echo "  status   - 查看服务状态"
    echo "  load     - 仅加载镜像"
    echo "  help     - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start    # 加载镜像并启动"
    echo "  $0 logs     # 查看实时日志"
    echo "  $0 status   # 查看运行状态"
    echo ""
}

# 主函数
main() {
    local cmd=${1:-help}
    
    log_info "CMDB Platform 离线部署工具"
    log_info "操作系统: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 || echo 'Linux')"
    echo ""
    
    case "$cmd" in
        start)
            check_docker
            load_image
            start
            ;;
        stop)
            stop
            ;;
        restart)
            stop
            start
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        load)
            check_docker
            load_image
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