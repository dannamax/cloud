#!/bin/bash
#==============================================================================
# CMDB Platform 离线部署包导出脚本
# 
# 使用方法:
#   chmod +x export-offline-package.sh
#   ./export-offline-package.sh
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
TAR_GZ_FILE="cmdb-platform.tar.gz"

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

# 检查镜像是否存在
check_image() {
    if ! docker images | grep -q "cmdb-platform"; then
        log_error "镜像 cmdb-platform:latest 不存在"
        log_info "请先运行: ./deploy.sh build"
        exit 1
    fi
    log_success "镜像检查通过"
}

# 导出镜像
export_image() {
    log_info "导出 Docker 镜像..."
    
    # 导出为 tar
    docker save -o $TAR_FILE $IMAGE_NAME
    
    # 压缩
    log_info "压缩镜像文件..."
    gzip -9 -f $TAR_FILE
    
    # 显示文件大小
    SIZE=$(du -h $TAR_GZ_FILE | cut -f1)
    log_success "镜像导出完成: $TAR_GZ_FILE ($SIZE)"
}

# 创建部署包
create_package() {
    log_info "创建离线部署包..."
    
    # 创建目录
    mkdir -p $PACKAGE_NAME
    
    # 复制文件
    cp $TAR_GZ_FILE $PACKAGE_NAME/
    cp deploy.sh $PACKAGE_NAME/
    cp docker-compose.yml $PACKAGE_NAME/
    cp DEPLOY_OFFLINE.md $PACKAGE_NAME/
    
    # 创建 README
    cat > $PACKAGE_NAME/README.txt << 'EOF'
================================================================================
                    CMDB Platform 离线部署包
================================================================================

【文件列表】
  - cmdb-platform.tar.gz    Docker 镜像文件 (约 500-800MB)
  - deploy.sh               部署脚本
  - docker-compose.yml      Docker Compose 配置文件
  - DEPLOY_OFFLINE.md       详细部署文档

【部署步骤】

第一步：安装 Docker（如果未安装）
--------------------------------------------------
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker

第二步：加载镜像
--------------------------------------------------
docker load -i cmdb-platform.tar.gz

第三步：验证镜像
--------------------------------------------------
docker images | grep cmdb-platform

第四步：启动服务
--------------------------------------------------
chmod +x deploy.sh
./deploy.sh start

第五步：访问系统
--------------------------------------------------
地址: http://服务器IP:3000
账号: admin
密码: admin

【常用命令】
--------------------------------------------------
启动:   ./deploy.sh start
停止:   ./deploy.sh stop
重启:   ./deploy.sh restart
日志:   ./deploy.sh logs
状态:   ./deploy.sh status

【注意事项】
--------------------------------------------------
1. 确保服务器防火墙开放 3000 端口
   firewall-cmd --permanent --add-port=3000/tcp
   firewall-cmd --reload

2. 生产环境请立即修改默认密码

3. 数据存储在 Docker 卷中，重启不会丢失

================================================================================
EOF
    
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
    rm -f $TAR_FILE
    log_success "清理完成"
}

# 显示结果
show_result() {
    echo ""
    echo "========================================"
    echo "        离线部署包创建成功！"
    echo "========================================"
    echo ""
    echo "部署包位置: $(pwd)/${PACKAGE_NAME}.tar.gz"
    echo "文件大小:   $(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)"
    echo ""
    echo "包含文件:"
    echo "  - cmdb-platform.tar.gz  (Docker 镜像)"
    echo "  - deploy.sh              (部署脚本)"
    echo "  - docker-compose.yml     (配置文件)"
    echo "  - DEPLOY_OFFLINE.md      (部署文档)"
    echo "  - README.txt             (说明文件)"
    echo ""
    echo "传输到目标服务器:"
    echo "  scp ${PACKAGE_NAME}.tar.gz root@目标服务器IP:/opt/"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "   CMDB Platform 离线部署包导出工具"
    echo "========================================"
    echo ""
    
    check_image
    export_image
    create_package
    pack_package
    cleanup
    show_result
}

main