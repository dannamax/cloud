# CMDB 平台

研发环境服务器管理系统 - 一款面向研发团队的 CMDB (Configuration Management Database) 平台。

## 功能特性

- **服务器管理** - 服务器资产全生命周期管理，支持批量导入导出
- **机柜配置** - 可视化机柜 U 位管理
- **环境规划** - 环境配置与自定义字段管理
- **成本管理** - 采购价格记录、4年线性折旧计算
- **标签管理** - 灵活的标签分类体系
- **变更记录** - 完整的服务器状态变更历史
- **操作审计** - 全面的操作日志审计功能
- **版本快照** - 数据快照与版本回退
- **用户权限** - 角色权限管理 (管理员/运维/研发)
- **角色类型** - 服务器角色分类（基础服务、中间件、存储等）
- **智能日期** - 支持直接输入的智能日期组件

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 状态管理 | Zustand |
| 后端 | Express 4 + TypeScript + better-sqlite3 |
| 表格 | TanStack Table |
| 图表 | Recharts |
| 构建 | tsx |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 前后端同时启动（推荐）
npm run dev:all

# 或分别启动
npm run dev      # 前端 http://localhost:5173
npm run server   # 后端 http://localhost:3213
```

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 构建与部署

### 方案一：前后端分离部署

#### 前端部署

```bash
# 1. 构建前端
npm run build

# 2. 将 dist 目录部署到 Nginx/Apache 等静态服务器
scp -r dist/* user@server:/var/www/cmdb/
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name cmdb.example.com;
    root /var/www/cmdb;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3213;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 后端部署

```bash
# 1. 构建后端（使用 tsx 直接运行或编译）
npm run server

# 2. 使用 PM2 管理进程
npm install -g pm2
pm2 start server/index.ts --name cmdb-api --interpreter tsx

# 3. 配置开机自启
pm2 save
pm2 startup
```

#### 环境变量配置

后端支持以下环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3213 | 后端服务端口 |
| `DB_PATH` | ./data/cmdb.db | 数据库文件路径 |
| `FRONTEND_URL` | http://localhost:5173 | 前端地址（用于 CORS） |

### 方案二：Docker 部署

#### 方式 A：使用已有 Dockerfile

```bash
# 构建镜像
docker build -t cmdb-platform .

# 运行容器
docker run -d \
  --name cmdb \
  -p 5173:80 \
  -p 3213:3213 \
  -v $(pwd)/data:/app/data \
  cmdb-platform
```

#### 方式 B：Docker Compose 部署（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "5173:80"
    depends_on:
      - backend
    networks:
      - cmdb-net

  backend:
    image: node:18-alpine
    working_dir: /app
    command: sh -c "npm install && npm run server"
    ports:
      - "3213:3213"
    volumes:
      - .:/app
      - ./data:/app/data
    networks:
      - cmdb-net

networks:
  cmdb-net:
    driver: bridge
```

启动：

```bash
docker-compose up -d
```

### 方案三：腾讯云轻量应用服务器部署

使用腾讯云 Lighthouse 部署：

```bash
# 1. 构建项目
npm install
npm run build

# 2. 上传 dist 目录到服务器
scp -r dist/* user@your-server:/var/www/cmdb/

# 3. 服务器安装 Nginx 并配置反向代理
```

### 部署检查清单

- [ ] 数据库目录 `data/` 已创建并有写入权限
- [ ] 后端端口 3213 已开放
- [ ] 前端静态资源可访问
- [ ] 跨域配置正确（CORS）
- [ ] 数据备份策略已配置

## 默认账号

```
用户名: admin
密码: admin
```

> ⚠️ 首次部署后请立即修改默认密码！

## API 接口

后端 API 基础路径：`http://localhost:3213/api`

| 模块 | 路径 | 说明 |
|------|------|------|
| 服务器 | `/api/servers` | 服务器 CRUD |
| 机柜 | `/api/cabinets` | 机柜管理 |
| 环境 | `/api/environments` | 环境配置 |
| 成本 | `/api/cost` | 成本统计 |
| 审计 | `/api/audit-logs` | 操作日志 |
| 用户 | `/api/users` | 用户管理 |

## 项目结构

```
cmdb-platform/
├── src/                    # 前端源代码
│   ├── pages/              # 页面组件
│   ├── components/         # 公共组件
│   ├── services/           # API 服务
│   ├── stores/             # 状态管理
│   └── types/              # 类型定义
├── server/                 # 后端源代码
│   ├── routes/             # API 路由
│   ├── middleware/         # 中间件
│   ├── database.ts         # 数据库连接
│   └── index.ts            # 服务入口
├── data/                   # 数据目录（SQLite 数据库）
├── dist/                   # 构建产物
├── Dockerfile              # Docker 配置
└── package.json
```

## 许可证

MIT
