#!/bin/bash

# 京东云CLI安装脚本

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

# 检查操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "darwin"
    else
        error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检查架构
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "amd64"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            error "不支持的架构: $arch"
            exit 1
            ;;
    esac
}

# 下载并安装
install_jdcloud_cli() {
    local os=$1
    local arch=$2
    local version=${3:-"latest"}
    
    info "检测操作系统: $os"
    info "检测架构: $arch"
    
    # 创建临时目录
    local tmp_dir=$(mktemp -d)
    trap "rm -rf $tmp_dir" EXIT
    
    # 构建路径
    local binary_name="jdcloud"
    if [[ "$os" == "windows" ]]; then
        binary_name="jdcloud.exe"
    fi
    
    # 如果是从源码安装
    if [[ "$version" == "source" ]]; then
        info "从源码构建京东云CLI..."
        
        # 检查Go环境
        if ! command_exists go; then
            error "Go未安装，请先安装Go 1.21或更高版本"
            exit 1
        fi
        
        # 检查Go版本
        local go_version=$(go version | awk '{print $3}' | sed 's/go//')
        if [[ "$(printf '%s\n' "1.21" "$go_version" | sort -V | head -n1)" != "1.21" ]]; then
            warn "Go版本可能过低，建议升级到1.21或更高版本"
        fi
        
        # 构建
        cd "$(dirname "$0")/.."
        make build
        
        # 复制二进制文件
        cp bin/jdcloud "$tmp_dir/"
    else
        info "下载京东云CLI..."
        
        # 这里可以添加从GitHub发布页面下载的逻辑
        # 目前直接从源码构建
        cd "$(dirname "$0")/.."
        make build
        cp bin/jdcloud "$tmp_dir/"
    fi
    
    # 安装二进制文件
    info "安装京东云CLI..."
    
    # 确定安装路径
    local install_path="/usr/local/bin"
    if [[ ! -w "$install_path" ]]; then
        install_path="$HOME/.local/bin"
        mkdir -p "$install_path"
        
        # 添加到PATH
        if [[ ":$PATH:" != *":$install_path:"* ]]; then
            warn "请将 $install_path 添加到PATH环境变量中"
            echo "export PATH=\$PATH:$install_path" >> "$HOME/.bashrc"
            echo "export PATH=\$PATH:$install_path" >> "$HOME/.zshrc"
        fi
    fi
    
    # 复制二进制文件
    cp "$tmp_dir/jdcloud" "$install_path/"
    chmod +x "$install_path/jdcloud"
    
    info "京东云CLI已安装到 $install_path/jdcloud"
    
    # 测试安装
    if command_exists jdcloud; then
        info "京东云CLI安装成功！"
        jdcloud --version
    else
        warn "京东云CLI可能未正确安装，请手动检查"
    fi
}

# 主函数
main() {
    echo "京东云CLI安装脚本"
    echo "=================="
    
    # 检测操作系统和架构
    local os=$(detect_os)
    local arch=$(detect_arch)
    
    # 解析参数
    local version="latest"
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version|-v)
                version="$2"
                shift 2
                ;;
            --source)
                version="source"
                shift
                ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --version, -v VERSION  安装指定版本"
                echo "  --source               从源码构建"
                echo "  --help, -h             显示帮助信息"
                exit 0
                ;;
            *)
                error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    # 安装
    install_jdcloud_cli "$os" "$arch" "$version"
    
    echo ""
    echo "安装完成！"
    echo "您可以使用 'jdcloud --help' 查看帮助信息。"
    echo ""
    echo "首次使用请配置凭证："
    echo "  jdcloud configure"
}

# 执行主函数
main "$@"