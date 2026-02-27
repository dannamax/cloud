#!/bin/bash

# 京东云CLI发布脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 打印警告
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 打印错误
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 获取当前版本
get_version() {
    local version=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
    echo "$version"
}

# 构建所有平台
build_all() {
    local version=$1
    
    info "开始构建所有平台..."
    
    # 创建发布目录
    local release_dir="release"
    mkdir -p "$release_dir"
    
    # 构建各平台
    make build-all
    
    # 打包发布
    make release
    
    info "构建完成！"
    ls -la "$release_dir"
}

# 创建Git标签
create_tag() {
    local version=$1
    
    if [[ "$version" == "dev" ]]; then
        warn "当前为开发版本，跳过创建标签"
        return
    fi
    
    info "创建Git标签: $version"
    git tag -a "$version" -m "Release $version"
    git push origin "$version"
}

# 主函数
main() {
    echo "京东云CLI发布脚本"
    echo "=================="
    
    # 获取版本
    local version=$(get_version)
    info "当前版本: $version"
    
    # 检查Go环境
    if ! command_exists go; then
        error "Go未安装，请先安装Go 1.21或更高版本"
        exit 1
    fi
    
    # 运行测试
    info "运行测试..."
    ./scripts/test.sh
    
    # 构建所有平台
    build_all "$version"
    
    # 创建标签（如果不是开发版本）
    create_tag "$version"
    
    echo ""
    echo "发布完成！"
    echo "发布文件位于 release/ 目录"
    echo "版本: $version"
}

# 执行主函数
main "$@"