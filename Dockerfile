# CMDB Platform Dockerfile
# 多阶段构建：构建阶段 + 运行阶段

# ===== 构建阶段 =====
# 使用 DaoCloud 镜像源
FROM docker.m.daocloud.io/library/node:20-alpine AS builder

WORKDIR /app

# 切换Alpine镜像源为中科大
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 安装编译依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

# 设置npm镜像（解决依赖下载问题）
RUN npm config set registry https://registry.npmmirror.com

# 复制依赖文件并安装
COPY package*.json ./
RUN npm ci --include=dev || npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# ===== 运行阶段 =====
FROM docker.m.daocloud.io/library/node:20-alpine AS runner

# 切换Alpine镜像源为中科大
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 安装时区数据和 nginx
RUN apk add --no-cache \
    tzdata \
    nginx \
    curl \
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && mkdir -p /var/lib/nginx/tmp/client_body /run/nginx \
    && chown -R nginx:nginx /var/lib/nginx /run/nginx

WORKDIR /app

# 复制构建产物（直接使用 builder 的 node_modules，避免重复编译）
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 创建数据目录
RUN mkdir -p /app/data /app/logs /var/lib/nginx/tmp/client_body /run/nginx

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# 启动 nginx 和后端服务
CMD sh -c "nginx -g 'daemon off;' & \
    sleep 3 && \
    exec node_modules/.bin/tsx server/index.ts"
