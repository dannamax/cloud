# CMDB Platform Docker 部署指南

支持操作系统: **CentOS 7** / **EulerOS (华为欧拉)**

---

## 目录

- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [生产环境部署](#生产环境部署)
- [常见问题](#常见问题)

---

## 快速部署

```bash
# 1. 下载代码
git clone https://github.com/dannamax/cmdb-platform.git
cd cmdb-platform

# 2. 赋予脚本执行权限
chmod +x deploy.sh

# 3. 启动服务 (自动检测系统并安装 Docker)
./deploy.sh start

# 4. 访问
# http://your-server-ip:3000
```

---

## 详细部署步骤

### 方式一: 使用部署脚本 (推荐)

```bash
# 查看帮助
./deploy.sh help

# 启动服务
./deploy.sh start

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 重启服务
./deploy.sh restart

# 重建服务
./deploy.sh rebuild
```

### 方式二: 手动 Docker 部署

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh

# 2. 启动 Docker
systemctl start docker
systemctl enable docker

# 3. 构建镜像
docker build -t cmdb-platform:latest .

# 4. 运行容器
docker run -d \
  --name cmdb-platform \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  --restart unless-stopped \
  cmdb-platform:latest

# 5. 查看日志
docker logs -f cmdb-platform
```

### 方式三: Docker Compose 部署

```bash
# 1. 创建 docker network
docker network create cmdb-network

# 2. 启动服务
docker-compose up -d

# 3. 查看状态
docker-compose ps
```

---

## 生产环境部署

### 1. 使用 Nginx 反向代理

```bash
# 启动生产环境配置 (包含 Nginx)
docker-compose -f docker-compose.prod.yml up -d
```

### 2. 配置 SSL 证书

```bash
# 安装 Certbot
yum install -y certbot python3-certbot-nginx

# 获取 SSL 证书 (修改为你的域名)
certbot --nginx -d cmdb.example.com

# 自动续期
echo "0 0 * * * certbot renew --quiet" | tee -a /etc/crontab
```

### 3. 修改 Nginx 配置

编辑 `nginx.conf`，修改:
```nginx
server_name cmdb.yourdomain.com;  # 改为你的域名
```

### 4. 数据持久化

数据存储在 Docker volumes 中:
- `cmdb-data` - 数据库文件
- `cmdb-uploads` - 上传文件

备份命令:
```bash
docker run --rm -v cmdb-data:/data -v $(pwd):/backup alpine tar czf /backup/cmdb-data-backup.tar.gz /data
```

---

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it cmdb-backend sh

# 查看容器状态
docker ps

# 查看资源使用
docker stats

# 重启服务
docker-compose restart

# 更新代码后重建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 常见问题

### Q1: 端口被占用
```bash
# 查看端口占用
netstat -tuln | grep 3000

# 停止占用进程
fuser -k 3000/tcp

# 或修改为其他端口
# 编辑 docker-compose.yml 中的 ports: "3001:3000"
```

### Q2: Docker 服务启动失败
```bash
# CentOS 7
systemctl start docker
systemctl status docker

# EulerOS
service docker start
service docker status
```

### Q3: 容器无法访问外网
```bash
# 检查 DNS 配置
docker exec cmdb-backend cat /etc/resolv.conf

# 重启 Docker 网络
systemctl restart docker
docker network rm cmdb-network
docker network create cmdb-network
```

### Q4: 数据迁移
```bash
# 导出数据
docker exec cmdb-backend tar czf /app/data/backup.tar.gz -C /app .

# 导入数据
docker exec -it cmdb-backend tar xzf /app/data/backup.tar.gz -C /app
```

---

## 默认账号

```
用户名: admin
密码: admin
```

> ⚠️ **生产环境请立即修改默认密码!**

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | API 服务 | 后端 API 端口 |
| 80   | Nginx | HTTP (生产环境) |
| 443  | Nginx | HTTPS (生产环境) |

---

## 防火墙配置

```bash
# CentOS 7 / EulerOS
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 或关闭防火墙 (测试环境)
systemctl stop firewalld
systemctl disable firewalld
```

---

## SELinux 配置

如果 SELinux 阻止 Docker 操作:

```bash
# 查看 SELinux 状态
getenforce

# 临时关闭 (测试环境)
setenforce 0

# 永久关闭
sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
```
