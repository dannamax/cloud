# CMDB Platform 离线部署指南

## 目录

- [概述](#概述)
- [环境要求](#环境要求)
- [方案一：在线构建部署](#方案一在线构建部署)
- [方案二：离线构建部署](#方案二离线构建部署)
- [验证部署](#验证部署)
- [运维管理](#运维管理)
- [数据备份](#数据备份)
- [常见问题](#常见问题)

---

## 概述

本文档提供在 openEuler 操作系统上离线部署 CMDB Platform 的完整指南。

### 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     openEuler Server                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Docker Container (cmdb-platform)        │  │
│  │  ┌─────────────────┐    ┌─────────────────────────┐  │  │
│  │  │      Nginx      │    │     Node.js API         │  │  │
│  │  │    (Port 80)    │───▶│    (Port 3213)          │  │  │
│  │  │   前端静态资源   │    │   Express API           │  │  │
│  │  └─────────────────┘    └─────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   数据卷                              │  │
│  │   /data/cmdb (SQLite 数据库)                        │  │
│  │   /var/log/cmdb (日志文件)                          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境要求

### 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 20 GB | 50 GB |
| 网络 | 内网即可 | 内网即可 |

### 软件要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排工具 |

### 操作系统

- openEuler 20.03 LTS 及以上
- CentOS 7.8 及以上
- RHEL 7.8 及以上
- 其他支持 Docker 的 Linux 发行版

---

## 方案一：在线构建部署

适用于**构建机器有网络连接**的情况。

### 步骤 1: 在构建机器上构建镜像

```bash
# 进入项目目录
cd cmdb-platform

# 构建 Docker 镜像
docker build -t cmdb-platform:latest .

# 导出镜像为 tar 包
docker save cmdb-platform:latest | gzip > cmdb-platform-offline.tar.gz

# 复制到目标机器
scp cmdb-platform-offline.tar.gz user@target-server:/path/
```

### 步骤 2: 在目标机器上部署

```bash
# 创建部署目录
mkdir -p /opt/cmdb && cd /opt/cmdb

# 复制并加载镜像
cp /path/cmdb-platform-offline.tar.gz .
docker load < cmdb-platform-offline.tar.gz

# 启动服务
docker run -d \
  --name cmdb-platform \
  -p 80:80 \
  -v /data/cmdb:/app/data \
  -v /var/log/cmdb:/app/logs \
  --restart unless-stopped \
  cmdb-platform:latest
```

---

## 方案二：离线构建部署（推荐）

适用于**构建机器有网络，目标机器无网络**的情况。

### 在有网络的机器上执行

```bash
# 进入部署脚本目录
cd cmdb-platform/deploy/docker

# 执行构建脚本
chmod +x build-offline.sh
./build-offline.sh
```

构建完成后，将 `deploy/docker/offline-package/` 目录完整复制到目标机器。

### 在目标机器 (openEuler) 上执行

```bash
# 1. 安装 Docker（如果未安装）
# openEuler 22.03+
sudo dnf install -y docker

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 2. 创建数据目录
sudo mkdir -p /data/cmdb
sudo mkdir -p /var/log/cmdb
sudo chmod 777 /data/cmdb
sudo chmod 777 /var/log/cmdb

# 3. 复制离线包并部署
cd /path/to/offline-package/docker
chmod +x deploy-offline.sh
sudo ./deploy-offline.sh
```

---

## 验证部署

### 健康检查

```bash
# 检查容器状态
docker ps | grep cmdb-platform

# 检查健康端点
curl http://localhost/health
# 应返回: OK
```

### 功能验证

| 功能 | 验证方法 | 预期结果 |
|------|----------|----------|
| Web 访问 | 浏览器访问 `http://<IP>` | 显示登录页面 |
| 用户登录 | 使用默认账号登录 | 登录成功 |
| 数据查询 | 进入服务器列表 | 显示服务器数据 |
| API 响应 | `curl http://localhost/api/servers/stats` | 返回 JSON 数据 |

### 查看日志

```bash
# 实时查看日志
docker logs -f cmdb-platform

# 查看最近 100 行日志
docker logs --tail 100 cmdb-platform
```

---

## 运维管理

### 常用命令

```bash
# 启动服务
docker start cmdb-platform

# 停止服务
docker stop cmdb-platform

# 重启服务
docker restart cmdb-platform

# 查看服务状态
docker ps | grep cmdb-platform

# 查看日志
docker logs -f cmdb-platform

# 进入容器（调试用）
docker exec -it cmdb-platform /bin/sh
```

### 升级服务

```bash
# 1. 备份数据
sudo cp -r /data/cmdb /data/cmdb.bak.$(date +%Y%m%d)

# 2. 停止旧容器
docker stop cmdb-platform
docker rm cmdb-platform

# 3. 加载新镜像
docker load < cmdb-platform-new.tar.gz

# 4. 启动新容器
docker run -d \
  --name cmdb-platform \
  -p 80:80 \
  -v /data/cmdb:/app/data \
  -v /var/log/cmdb:/app/logs \
  --restart unless-stopped \
  cmdb-platform:latest
```

### 配置修改

修改 Nginx 配置后需要重启容器：

```bash
# 1. 修改配置
vim /opt/cmdb/nginx.conf

# 2. 重新部署
docker stop cmdb-platform
docker rm cmdb-platform
# 修改 docker-compose.yml 中的配置或重新运行 docker run
```

---

## 数据备份

### 自动备份脚本

```bash
#!/bin/bash
# backup-cmdb.sh - 定时备份脚本

BACKUP_DIR="/backup/cmdb"
DATA_DIR="/data/cmdb"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
cp -r "$DATA_DIR" "$BACKUP_DIR/cmdb-data-$DATE"

# 压缩备份
tar -czf "$BACKUP_DIR/cmdb-backup-$DATE.tar.gz" \
    -C "$DATA_DIR" .

# 删除 7 天前的备份
find "$BACKUP_DIR" -name "cmdb-backup-*.tar.gz" -mtime +7 -delete

echo "[$(date)] 备份完成: $BACKUP_DIR/cmdb-backup-$DATE.tar.gz"
```

### 恢复数据

```bash
# 1. 停止服务
docker stop cmdb-platform

# 2. 恢复数据
rm -rf /data/cmdb
tar -xzf /backup/cmdb/cmdb-backup-20240101_120000.tar.gz -C /data/cmdb

# 3. 启动服务
docker start cmdb-platform
```

---

## 常见问题

### Q1: Docker 服务无法启动

**问题描述**: 执行 `systemctl start docker` 报错

**解决方案**:
```bash
# 检查 Docker 状态
sudo systemctl status docker

# 查看详细错误
sudo journalctl -xe -u docker

# 常见原因：磁盘空间不足
df -h
```

### Q2: 容器启动后立即退出

**问题描述**: `docker ps` 看不到容器

**解决方案**:
```bash
# 查看容器日志
docker logs cmdb-platform

# 常见原因：端口被占用
lsof -i :80
netstat -tlnp | grep 80
```

### Q3: 无法访问 Web 页面

**问题描述**: 浏览器访问无响应

**解决方案**:
```bash
# 1. 检查防火墙
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 或关闭防火墙测试
sudo systemctl stop firewalld
```

### Q4: 镜像加载失败

**问题描述**: `docker load` 报错

**解决方案**:
```bash
# 检查磁盘空间
df -h

# 清理 Docker 资源
docker system prune -a

# 重新加载
docker load < cmdb-platform-offline.tar.gz
```

### Q5: 数据目录权限问题

**问题描述**: 容器内无法写入数据

**解决方案**:
```bash
# 修复权限
sudo chown -R 1001:1001 /data/cmdb
sudo chmod -R 777 /data/cmdb
```

---

## 附录

### 端口说明

| 端口 | 协议 | 说明 |
|------|------|------|
| 80 | HTTP | Web 服务入口 |
| 3213 | HTTP | API 服务（容器内部） |

### 目录结构

```
/data/cmdb/           # 数据库文件目录
  └── cmdb.sqlite     # SQLite 数据库文件

/var/log/cmdb/        # 日志目录
  └── *.log           # 日志文件

/opt/cmdb/            # 部署目录（可选）
```

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

**注意**: 首次登录后请立即修改密码！

---

## 技术支持

如遇到问题，请提供以下信息：

1. Docker 版本: `docker --version`
2. 容器日志: `docker logs cmdb-platform`
3. 系统版本: `cat /etc/os-release`
4. 执行的操作描述
