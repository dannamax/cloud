# CMDB Platform 离线部署指南

支持操作系统: **CentOS 7** / **EulerOS (华为欧拉)** / **其他 Linux 发行版**

---

## 方案一：导出镜像离线部署（推荐）

### 第一步：在有网络的机器上导出镜像

```bash
# 1. 克隆代码
git clone -b cmdb https://github.com/dannamax/cloud.git
cd cloud

# 2. 构建镜像（如果已构建可跳过）
docker build -t cmdb-platform:latest .

# 3. 导出镜像为 tar 文件
docker save -o cmdb-platform.tar cmdb-platform:latest

# 4. 压缩（减小传输大小）
gzip -9 cmdb-platform.tar
# 生成文件: cmdb-platform.tar.gz (约 500-800MB)
```

### 第二步：准备离线部署包

创建离线部署目录：

```bash
# 创建打包目录
mkdir -p cmdb-offline-package
cd cmdb-offline-package

# 复制必要文件
cp ../cmdb-platform.tar.gz .
cp ../deploy.sh .
cp ../docker-compose.yml .
cp ../DEPLOY_OFFLINE.md .

# 创建数据目录说明
cat > README.txt << 'EOF'
CMDB Platform 离线部署包
=======================

文件列表:
- cmdb-platform.tar.gz  Docker 镜像文件
- deploy.sh             部署脚本
- docker-compose.yml    Docker Compose 配置
- DEPLOY_OFFLINE.md     详细部署文档

部署步骤:
1. 安装 Docker (如果未安装)
2. 加载镜像: docker load -i cmdb-platform.tar.gz
3. 启动服务: ./deploy.sh start
4. 访问: http://服务器IP:3000
5. 默认账号: admin / admin
EOF

# 打包
cd ..
tar czf cmdb-offline-package.tar.gz cmdb-offline-package/
```

### 第三步：传输到目标服务器

```bash
# 使用 scp 传输
scp cmdb-offline-package.tar.gz root@目标服务器IP:/opt/

# 或使用 U 盘拷贝
```

### 第四步：在目标服务器上部署

```bash
# 1. 解压部署包
cd /opt
tar xzf cmdb-offline-package.tar.gz
cd cmdb-offline-package

# 2. 安装 Docker (如果未安装)
if ! command -v docker &> /dev/null; then
    yum install -y yum-utils
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
fi

# 3. 加载镜像
docker load -i cmdb-platform.tar.gz

# 4. 验证镜像
docker images | grep cmdb-platform

# 5. 启动服务
chmod +x deploy.sh
./deploy.sh start

# 6. 验证服务
curl http://localhost:3000/api/health
```

---

## 方案二：使用预构建镜像（需要网络）

### 1. 配置 Docker 镜像加速器

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
