# CMDB Platform 离线部署指南

支持操作系统: **CentOS 7** / **EulerOS (华为欧拉)**

---

## 方案一：使用预构建镜像（推荐，无需构建）

### 1. 拉取镜像

由于服务器可能无法直接访问 Docker Hub，我们使用镜像加速器：

```bash
# 配置镜像加速器
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

# 重启 Docker
systemctl daemon-reload
systemctl restart docker

# 拉取预构建镜像
docker pull docker.1ms.run/library/node:20-alpine
```

### 2. 部署

```bash
# 创建目录
mkdir -p /opt/cmdb && cd /opt/cmdb

# 下载部署文件
curl -O https://raw.githubusercontent.com/dannamax/cloud/cmdb/docker-compose.yml
curl -O https://raw.githubusercontent.com/dannamax/cloud/cmdb/deploy.sh
chmod +x deploy.sh

# 启动服务
./deploy.sh start
```

---

## 方案二：离线部署（完全离线环境）

### 在有网络的机器上构建镜像

**1. 克隆代码并构建镜像**

```bash
# 在有网络的机器上执行
git clone -b cmdb https://github.com/dannamax/cloud.git
cd cloud

# 构建镜像
docker build -t cmdb-platform:latest .

# 保存镜像为 tar 文件
docker save -o cmdb-platform.tar cmdb-platform:latest

# 压缩（可选，减小文件大小）
gzip cmdb-platform.tar
```

**2. 将 `cmdb-platform.tar.gz` 拷贝到目标服务器**

**3. 在目标服务器上加载镜像**

```bash
# 加载镜像
docker load -i cmdb-platform.tar.gz

# 验证镜像
docker images | grep cmdb-platform

# 创建并启动容器
docker run -d \
  --name cmdb-platform \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  --restart unless-stopped \
  cmdb-platform:latest
```

---

## 快速部署脚本（下载即用）

```bash
# 一键部署（需要网络）
curl -fsSL https://raw.githubusercontent.com/dannamax/cloud/cmdb/deploy.sh | bash -s start
```

---

## 部署后验证

```bash
# 检查容器状态
docker ps -a | grep cmdb

# 查看日志
docker logs -f cmdb-platform

# 健康检查
curl http://localhost:3000/api/health

# 访问
# http://your-server-ip:3000
```

---

## 默认账号

```
用户名: admin
密码: admin
```

> ⚠️ **生产环境请立即修改默认密码！**

---

## 常用命令

```bash
# 启动
docker start cmdb-platform

# 停止
docker stop cmdb-platform

# 重启
docker restart cmdb-platform

# 查看日志
docker logs -f cmdb-platform

# 进入容器
docker exec -it cmdb-platform sh
```

---

## 防火墙配置

```bash
# CentOS 7 / EulerOS
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 或关闭防火墙（测试环境）
systemctl stop firewalld
systemctl disable firewalld
```

---

## 数据备份与恢复

```bash
# 备份
docker exec cmdb-platform tar czf /tmp/backup.tar.gz -C /app data uploads
docker cp cmdb-platform:/tmp/backup.tar.gz ./cmdb-backup-$(date +%Y%m%d).tar.gz

# 恢复
docker cp backup.tar.gz cmdb-platform:/tmp/backup.tar.gz
docker exec cmdb-platform tar xzf /tmp/backup.tar.gz -C /app
```
