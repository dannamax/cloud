# CMDB Platform Dockerfile (多阶段构建)
# 减小镜像体积，优化构建速度

#==============================================================================
# 阶段 1: 构建阶段
#==============================================================================
# 使用 Node 18 (兼容 CentOS 7 的 glibc 2.17)
FROM docker.1ms.run/library/node:18-alpine AS builder

# 更换为国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.18/main" >> /etc/apk/repositories && \
    echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.18/community" >> /etc/apk/repositories

# 安装 Python 和编译工具
RUN apk add --no-cache python3 make g++ && ln -sf python3 /usr/bin/python

WORKDIR /app

# 配置 npm 国内镜像源和 node-gyp 环境变量
ENV npm_config_registry=https://registry.npmmirror.com
ENV npm_config_disturl=https://npmmirror.com/mirrors/node
ENV npm_config_node_gyp=https://npmmirror.com/mirrors/node-gyp

# 安装依赖 (利用 Docker 缓存)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# TypeScript 类型检查
RUN npx tsc --noEmit || true

# 构建前端
RUN npm run build

#==============================================================================
# 阶段 2: 生产阶段
#==============================================================================
FROM docker.1ms.run/library/node:18-alpine AS production

# 更换为国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.18/main" >> /etc/apk/repositories && \
    echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.18/community" >> /etc/apk/repositories

# 安装 Python 和编译工具
RUN apk add --no-cache python3 make g++ && ln -sf python3 /usr/bin/python

# 安全: 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# 配置 npm 国内镜像源和 node-gyp 环境变量
ENV npm_config_registry=https://registry.npmmirror.com
ENV npm_config_disturl=https://npmmirror.com/mirrors/node
ENV npm_config_node_gyp=https://npmmirror.com/mirrors/node-gyp

# 只复制生产依赖
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs server ./server

# 创建数据目录
RUN mkdir -p data uploads && chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 端口
EXPOSE 3000

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动命令
CMD npx tsx server/index.ts
