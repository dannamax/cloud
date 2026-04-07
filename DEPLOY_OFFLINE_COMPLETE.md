# CMDB Platform 完整离线部署指南

> 本文档提供从零开始的完整离线部署方案，适用于无网络环境的 CentOS 7 / EulerOS 等 Linux 系统。

---

## 📦 第一部分：准备离线部署包

### 1.1 环境要求（有网络的机器）

- Docker 已安装
- Git 已安装
- 至少 2GB 可用磁盘空间

### 1.2 构建并导出镜像

```bash
# 1. 克隆代码
git clone -b cmdb https://github.com/dannamax/cloud.git
cd cloud

# 2. 构建镜像
docker build -t cmdb-platform:latest .

# 3. 验证镜像构建成功
docker images | grep cmdb-platform

# 4. 导出镜像为 tar 文件
docker save -o cmdb-platform.tar cmdb-platform:latest

# 5. 压缩镜像（可选，减小传输大小）
gzip -9 cmdb-platform.tar
# 生成文件: cmdb-platform.tar.gz (约 500-800MB)

# 6. 查看文件大小
ls -lh cmdb-platform.tar.gz
```

### 1.3 创建完整部署包

```bash
# 创建部署包目录
mkdir -p cmdb-offline-package
cd cmdb-offline-package

# 复制必要文件
cp ../cmdb-platform.tar.gz .
cp ../docker-compose.yml .
cp ../DEPLOY_OFFLINE_COMPLETE.md .

# 创建部署脚本
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
IMAGE_NAME="cmdb-platform:latest"
CONTAINER_NAME="cmdb-platform"
PORT=3000

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "安装命令："
        echo "yum install -y yum-utils"
        echo "yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo"
        echo "yum install -y docker-ce docker-ce-cli containerd.io"
        echo "systemctl start docker"
        echo "systemctl enable docker"
        exit 1
    fi
    log_success "Docker 已安装"
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
        exit 1
    fi
    log_success "镜像加载完成"
}

# 启动服务
start() {
    log_info "启动 CMDB 平台..."
    
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
    log_info "默认账号: admin / admin"
}

# 停止服务
stop() {
    log_info "停止 CMDB 平台..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    log_success "CMDB 平台已停止"
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
    docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    if curl -s http://localhost:$PORT/api/health &>/dev/null; then
        echo -e "${GREEN}●${NC} 服务正常"
    else
        echo -e "${RED}○${NC} 服务异常或未启动"
    fi
}

# 主函数
case "${1:-help}" in
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
    *)
        echo "使用方法: $0 {start|stop|restart|logs|status|load}"
        echo ""
        echo "命令说明:"
        echo "  start   - 加载镜像并启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看日志"
        echo "  status  - 查看状态"
        echo "  load    - 仅加载镜像"
        ;;
esac
EOF

chmod +x deploy.sh

# 创建说明文档
cat > README.txt << 'EOF'
================================================================================
                    CMDB Platform 离线部署包
================================================================================

【文件列表】
  - cmdb-platform.tar.gz      Docker 镜像文件 (约 500-800MB)
  - deploy.sh                 部署脚本 (自动加载镜像并启动)
  - docker-compose.yml        Docker Compose 配置文件 (备用)
  - DEPLOY_OFFLINE_COMPLETE.md 本文档

【快速部署】

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
启动:   ./deploy.sh start
停止:   ./deploy.sh stop
重启:   ./deploy.sh restart
日志:   ./deploy.sh logs
状态:   ./deploy.sh status

【防火墙配置】
--------------------------------------------------
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

或临时关闭防火墙（测试环境）：
systemctl stop firewalld

【注意事项】
--------------------------------------------------
1. 生产环境请立即修改默认密码
2. 数据存储在 Docker 卷中，重启不会丢失
3. 镜像文件只需要加载一次，后续启动很快

================================================================================
EOF

cd ..

# 打包
tar czf cmdb-offline-package.tar.gz cmdb-offline-package/

echo ""
echo "✅ 离线部署包创建完成！"
echo "文件: $(pwd)/cmdb-offline-package.tar.gz"
echo "大小: $(du -h cmdb-offline-package.tar.gz | cut -f1)"
```

### 1.4 验证部署包内容

```bash
# 查看打包文件大小
ls -lh cmdb-offline-package.tar.gz

# 查看包内容
tar tzf cmdb-offline-package.tar.gz
```

**输出示例：**
```
cmdb-offline-package/
cmdb-offline-package/cmdb-platform.tar.gz
cmdb-offline-package/deploy.sh
cmdb-offline-package/docker-compose.yml
cmdb-offline-package/README.txt
cmdb-offline-package/DEPLOY_OFFLINE_COMPLETE.md
```

---

## 🚀 第二部分：目标服务器部署步骤

### 2.1 传输部署包到目标服务器

**方式一：使用 scp**

```bash
# 从本地传输到远程服务器
scp cmdb-offline-package.tar.gz root@目标服务器IP:/opt/
```

**方式二：使用 U 盘**

```bash
# 1. 复制文件到 U 盘
cp cmdb-offline-package.tar.gz /media/usb/

# 2. 在目标服务器挂载 U 盘
mount /dev/sdb1 /mnt/usb
cp /mnt/usb/cmdb-offline-package.tar.gz /opt/
umount /mnt/usb
```

### 2.2 安装 Docker（如果未安装）

```bash
# 检查 Docker 是否已安装
docker --version

# 如果未安装，执行以下命令
# CentOS 7 / RHEL / EulerOS
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证 Docker 安装
docker --version
```

### 2.3 部署 CMDB 平台

```bash
# 1. 解压部署包
cd /opt
tar xzf cmdb-offline-package.tar.gz
cd cmdb-offline-package

# 2. 查看文件
ls -lh

# 3. 加载镜像并启动服务
./deploy.sh start

# 4. 等待几秒后验证服务
sleep 5
./deploy.sh status
```

### 2.4 验证部署

```bash
# 检查容器状态
docker ps -a | grep cmdb

# 查看日志
docker logs cmdb-platform

# 测试 API
curl http://localhost:3000/api/health

# 浏览器访问
# http://服务器IP:3000
```

**预期输出：**
```json
{"status":"ok","timestamp":"2026-04-07T09:42:15.123Z"}
```

---

## 🔧 第三部分：高级配置

### 3.1 防火墙配置

```bash
# 开放端口
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 查看已开放端口
firewall-cmd --list-ports

# 或临时关闭防火墙（测试环境）
systemctl stop firewalld
```

### 3.2 修改端口

```bash
# 停止当前容器
./deploy.sh stop

# 使用不同端口启动（例如 8080）
docker run -d \
  --name cmdb-platform \
  --restart unless-stopped \
  -p 8080:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -v cmdb-data:/app/data \
  -v cmdb-uploads:/app/uploads \
  cmdb-platform:latest

# 访问地址变为: http://服务器IP:8080
```

### 3.3 数据持久化

```bash
# 查看数据卷位置
docker volume ls | grep cmdb

# 查看数据卷详情
docker volume inspect cmdb-data
docker volume inspect cmdb-uploads

# 备份数据
docker exec cmdb-platform tar czf /tmp/backup.tar.gz -C /app data uploads
docker cp cmdb-platform:/tmp/backup.tar.gz ./cmdb-backup-$(date +%Y%m%d).tar.gz

# 恢复数据
docker cp backup.tar.gz cmdb-platform:/tmp/backup.tar.gz
docker exec cmdb-platform tar xzf /tmp/backup.tar.gz -C /app
docker restart cmdb-platform
```

### 3.4 系统服务自启动

```bash
# 容器已配置 --restart unless-stopped，会自动重启
# 验证重启策略
docker inspect cmdb-platform | grep -A 2 "RestartPolicy"

# 手动设置（如果需要）
docker update --restart unless-stopped cmdb-platform
```

---

## 📋 第四部分：故障排查

### 4.1 容器无法启动

```bash
# 查看详细日志
docker logs cmdb-platform

# 查看容器退出原因
docker inspect cmdb-platform | grep -A 10 "State"

# 常见问题：
# 1. 端口被占用
netstat -tuln | grep 3000
# 杀掉占用进程
fuser -k 3000/tcp

# 2. 镜像未加载
docker images | grep cmdb-platform
# 重新加载
docker load -i cmdb-platform.tar.gz

# 3. Docker 服务未启动
systemctl status docker
systemctl start docker
```

### 4.2 无法访问服务

```bash
# 1. 检查容器是否运行
docker ps | grep cmdb-platform

# 2. 检查端口是否监听
netstat -tuln | grep 3000

# 3. 检查防火墙
firewall-cmd --list-all

# 4. 测试本地访问
curl http://localhost:3000/api/health

# 5. 测试外部访问
curl http://服务器IP:3000/api/health

# 6. 查看 Docker 网络
docker network ls
docker network inspect bridge
```

### 4.3 性能问题

```bash
# 查看容器资源使用
docker stats cmdb-platform

# 限制资源使用
docker update --memory="1g" --cpus="1.0" cmdb-platform

# 或在启动时指定
docker run -d \
  --name cmdb-platform \
  --memory="1g" \
  --cpus="1.0" \
  -p 3000:3000 \
  cmdb-platform:latest
```

---

## 🔄 第五部分：升级与回滚

### 5.1 升级流程

```bash
# 1. 备份数据
./deploy.sh stop
docker exec cmdb-platform tar czf /tmp/backup.tar.gz -C /app data uploads 2>/dev/null || true
docker cp cmdb-platform:/tmp/backup.tar.gz ./backup-before-upgrade.tar.gz

# 2. 加载新镜像
docker load -i cmdb-platform-new.tar.gz

# 3. 删除旧容器
docker rm -f cmdb-platform

# 4. 启动新容器
docker run -d \
  --name cmdb-platform \
  --restart unless-stopped \
  -p 3000:3000 \
  -v cmdb-data:/app/data \
  -v cmdb-uploads:/app/uploads \
  cmdb-platform:new-version

# 5. 验证服务
./deploy.sh status
```

### 5.2 回滚流程

```bash
# 1. 停止并删除容器
docker stop cmdb-platform
docker rm cmdb-platform

# 2. 使用旧镜像启动
docker run -d \
  --name cmdb-platform \
  --restart unless-stopped \
  -p 3000:3000 \
  -v cmdb-data:/app/data \
  -v cmdb-uploads:/app/uploads \
  cmdb-platform:old-version

# 3. 恢复数据（如果需要）
docker cp backup-before-upgrade.tar.gz cmdb-platform:/tmp/
docker exec cmdb-platform tar xzf /tmp/backup-before-upgrade.tar.gz -C /app
docker restart cmdb-platform
```

---

## 📊 第六部分：监控与日志

### 6.1 查看日志

```bash
# 实时查看日志
docker logs -f cmdb-platform

# 查看最近 100 行日志
docker logs --tail=100 cmdb-platform

# 查看指定时间范围的日志
docker logs --since=2026-04-07T10:00:00 cmdb-platform
docker logs --until=2026-04-07T12:00:00 cmdb-platform

# 导出日志
docker logs cmdb-platform > cmdb-logs.txt
```

### 6.2 健康检查

```bash
# 使用内置健康检查
curl http://localhost:3000/api/health

# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' cmdb-platform

# 自动健康检查脚本
cat > health-check.sh << 'EOF'
#!/bin/bash
while true; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "$(date) - Service is healthy"
    else
        echo "$(date) - Service is unhealthy"
        docker restart cmdb-platform
    fi
    sleep 60
done
EOF

chmod +x health-check.sh
# 后台运行: nohup ./health-check.sh &
```

---

## 🔐 第七部分：安全加固

### 7.1 修改默认密码

```bash
# 登录后立即修改
# 访问: http://服务器IP:3000
# 用户管理 -> 修改密码
```

### 7.2 配置 HTTPS

```bash
# 需要准备 SSL 证书
# 1. 准备证书文件
mkdir -p /opt/ssl
cp your-cert.pem /opt/ssl/
cp your-key.pem /opt/ssl/

# 2. 使用 nginx 反向代理
docker run -d \
  --name nginx-proxy \
  -p 80:80 \
  -p 443:443 \
  -v /opt/ssl:/etc/nginx/ssl:ro \
  -v /opt/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine

# nginx.conf 示例:
# upstream cmdb {
#     server cmdb-platform:3000;
# }
# server {
#     listen 443 ssl;
#     ssl_certificate /etc/nginx/ssl/cert.pem;
#     ssl_certificate_key /etc/nginx/ssl/key.pem;
#     location / {
#         proxy_pass http://cmdb;
#     }
# }
```

### 7.3 访问控制

```bash
# 使用 iptables 限制访问 IP
iptables -A INPUT -p tcp --dport 3000 -s 允许的IP -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP

# 保存规则
service iptables save
```

---

## ✅ 部署检查清单

- [ ] Docker 已安装并运行
- [ ] 镜像已成功加载
- [ ] 容器正常运行
- [ ] 端口 3000 可访问
- [ ] API 健康检查返回正常
- [ ] 前端页面可访问
- [ ] 数据库正常工作
- [ ] 防火墙已配置
- [ ] 已修改默认密码

---

## 📞 常见问题

**Q: 镜像加载失败怎么办？**
A: 检查磁盘空间，确保有足够空间（至少 2GB）

**Q: 容器启动后立即退出？**
A: 查看 `docker logs cmdb-platform` 了解错误原因

**Q: 数据会丢失吗？**
A: 数据存储在 Docker 卷中，重启不会丢失，除非删除卷

**Q: 如何查看数据库内容？**
A: 进入容器: `docker exec -it cmdb-platform sh`，数据库位于 `/app/data/cmdb.db`

**Q: 如何备份数据？**
A: 见"数据持久化"章节

---

## 📝 附录

### A. Docker 常用命令速查

```bash
# 容器管理
docker ps                    # 查看运行中的容器
docker ps -a                 # 查看所有容器
docker start cmdb-platform   # 启动容器
docker stop cmdb-platform    # 停止容器
docker restart cmdb-platform # 重启容器
docker rm cmdb-platform      # 删除容器
docker logs cmdb-platform    # 查看日志
docker exec -it cmdb-platform sh  # 进入容器

# 镜像管理
docker images                # 查看镜像列表
docker load -i xxx.tar.gz    # 加载镜像
docker rmi cmdb-platform:latest  # 删除镜像

# 数据卷管理
docker volume ls             # 查看数据卷
docker volume inspect cmdb-data  # 查看数据卷详情
docker volume rm cmdb-data   # 删除数据卷

# 网络管理
docker network ls            # 查看网络
docker network inspect bridge  # 查看网络详情
```

### B. 系统要求

- **操作系统**: CentOS 7+ / RHEL 7+ / EulerOS / Ubuntu 18.04+
- **Docker**: 19.03+
- **内存**: 至少 512MB（推荐 1GB+）
- **磁盘**: 至少 2GB（镜像 + 数据）
- **端口**: 3000（可自定义）

### C. 性能参考

- **镜像大小**: 约 500-800MB
- **容器内存占用**: 约 100-200MB
- **启动时间**: 3-5 秒
- **并发支持**: 约 100-500 并发（取决于硬件）

---

**最后更新**: 2026-04-07  
**版本**: v1.0  
**维护**: CMDB Platform Team