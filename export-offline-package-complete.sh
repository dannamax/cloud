#!/bin/bash
#==============================================================================
# CMDB Platform 离线部署包一键生成脚本
#
# 使用方法:
#   chmod +x export-offline-package-complete.sh
#   ./export-offline-package-complete.sh
#
# 输出:
#   cmdb-offline-package.tar.gz - 完整的离线部署包
#==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
IMAGE_NAME="cmdb-platform:latest"
PACKAGE_NAME="cmdb-offline-package"
TAR_FILE="cmdb-platform.tar"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 显示横幅
show_banner() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  CMDB Platform 离线部署包生成工具${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    log_success "Docker 已安装: $(docker --version)"
}

# 检查镜像
check_image() {
    if ! docker images | grep -q "cmdb-platform"; then
        log_warn "镜像不存在，开始构建..."
        docker build -t $IMAGE_NAME .
        
        if ! docker images | grep -q "cmdb-platform"; then
            log_error "镜像构建失败"
            exit 1
        fi
    fi
    log_success "镜像检查通过"
}

# 导出镜像
export_image() {
    log_info "导出 Docker 镜像..."
    
    # 导出为 tar
    docker save -o $TAR_FILE $IMAGE_NAME
    
    # 显示大小
    SIZE=$(du -h $TAR_FILE | cut -f1)
    log_success "镜像导出完成: $TAR_FILE ($SIZE)"
    
    # 压缩
    log_info "压缩镜像文件（可能需要几分钟）..."
    gzip -9 -f $TAR_FILE
    
    SIZE=$(du -h ${TAR_FILE}.gz | cut -f1)
    log_success "压缩完成: ${TAR_FILE}.gz ($SIZE)"
}

# 创建部署脚本
create_deploy_script() {
    log_info "创建部署脚本..."
    
    # 使用 deploy-offline.sh 作为模板
    if [ -f "deploy-offline.sh" ]; then
        cp deploy-offline.sh deploy.sh
    else
        # 如果没有 deploy-offline.sh，使用内嵌的脚本
        cat > deploy.sh << 'DEPLOY_EOF'
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
        log_error "找不到镜像文件"
        exit 1
    fi
    log_success "镜像加载完成"
}

start() {
    log_info "启动 CMDB 平台..."
    
    if ! docker images | grep -q "cmdb-platform"; then
        log_error "镜像不存在，请先运行: ./deploy.sh load"
        exit 1
    fi
    
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p $PORT:3000 \
        -e NODE_ENV=production \
        -v cmdb-data:/app/data \
        -v cmdb-uploads:/app/uploads \
        $IMAGE_NAME
    
    log_success "CMDB 平台已启动!"
    log_info "访问地址: http://localhost:$PORT"
    log_info "默认账号: admin / admin"
}

stop() {
    log_info "停止 CMDB 平台..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    log_success "已停止"
}

logs() {
    docker logs -f --tail=100 $CONTAINER_NAME
}

status() {
    docker ps -a --filter "name=$CONTAINER_NAME"
    curl -s http://localhost:$PORT/api/health && echo "" || echo "服务未启动"
}

case "${1:-help}" in
    start) check_docker; load_image; start ;;
    stop) stop ;;
    restart) stop; start ;;
    logs) logs ;;
    status) status ;;
    load) check_docker; load_image ;;
    *) echo "使用: $0 {start|stop|restart|logs|status|load}" ;;
esac
DEPLOY_EOF
    fi
    
    chmod +x deploy.sh
    log_success "部署脚本创建完成"
}

# 创建说明文档
create_readme() {
    log_info "创建说明文档..."
    
    cat > README.txt << 'EOF'
================================================================================
                    CMDB Platform 离线部署包
================================================================================

【快速部署步骤】

第一步：安装 Docker（如果未安装）
--------------------------------------------------
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker

第二步：启动服务
--------------------------------------------------
./deploy.sh start

第三步：访问系统
--------------------------------------------------
地址: http://服务器IP:3000
账号: admin
密码: admin

【常用命令】
--------------------------------------------------
启动: ./deploy.sh start
停止: ./deploy.sh stop
日志: ./deploy.sh logs
状态: ./deploy.sh status

【防火墙配置】
--------------------------------------------------
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

【数据备份】
--------------------------------------------------
docker exec cmdb-platform tar czf /tmp/backup.tar.gz -C /app data uploads
docker cp cmdb-platform:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

================================================================================
EOF
    
    log_success "说明文档创建完成"
}

# 创建部署包
create_package() {
    log_info "创建离线部署包目录..."
    
    rm -rf $PACKAGE_NAME 2>/dev/null || true
    mkdir -p $PACKAGE_NAME
    
    # 复制文件
    cp ${TAR_FILE}.gz $PACKAGE_NAME/
    cp deploy.sh $PACKAGE_NAME/
    cp README.txt $PACKAGE_NAME/
    
    # 复制详细文档（如果存在）
    if [ -f "DEPLOY_OFFLINE_COMPLETE.md" ]; then
        cp DEPLOY_OFFLINE_COMPLETE.md $PACKAGE_NAME/
    fi
    
    log_success "部署包目录创建完成"
}

# 打包
pack_package() {
    log_info "打包离线部署包..."
    
    tar czf ${PACKAGE_NAME}.tar.gz $PACKAGE_NAME
    
    SIZE=$(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)
    log_success "离线部署包创建完成: ${PACKAGE_NAME}.tar.gz ($SIZE)"
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    rm -f ${TAR_FILE} ${TAR_FILE}.gz deploy.sh README.txt
    log_success "清理完成"
}

# 显示结果
show_result() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    离线部署包创建成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "📦 部署包位置: ${YELLOW}$(pwd)/${PACKAGE_NAME}.tar.gz${NC}"
    echo -e "📊 文件大小:   ${YELLOW}$(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)${NC}"
    echo ""
    echo "包含文件:"
    echo "  ├─ cmdb-platform.tar.gz       (Docker 镜像)"
    echo "  ├─ deploy.sh                  (部署脚本)"
    echo "  ├─ README.txt                 (快速说明)"
    echo "  └─ DEPLOY_OFFLINE_COMPLETE.md (详细文档)"
    echo ""
    echo -e "${BLUE}传输到目标服务器:${NC}"
    echo "  scp ${PACKAGE_NAME}.tar.gz root@目标服务器IP:/opt/"
    echo ""
    echo -e "${BLUE}在目标服务器上:${NC}"
    echo "  cd /opt"
    echo "  tar xzf ${PACKAGE_NAME}.tar.gz"
    echo "  cd ${PACKAGE_NAME}"
    echo "  ./deploy.sh start"
    echo ""
}

# 主函数
main() {
    show_banner
    check_docker
    check_image
    export_image
    create_deploy_script
    create_readme
    create_package
    pack_package
    cleanup
    show_result
}

main