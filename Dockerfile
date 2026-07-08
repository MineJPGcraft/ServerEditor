# ============================================================
# 一体化构建模式（默认）：后端同时提供前端静态文件
# ============================================================
# 阶段1：构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install && npm cache clean --force
COPY frontend/ ./
# 构建时可通过 --build-arg VITE_API_BASE_URL 传入后端地址
# 不传则前端使用相对路径 /api（同源一体化部署）
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# 阶段2：最终镜像
FROM node:20-alpine
WORKDIR /app

# 安装后端依赖并清理缓存
COPY package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

# 复制源码和构建产物
COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/dist ./dist

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R node:node /app

# 环境变量
ENV NODE_ENV=production PORT=8080

EXPOSE 8080

# 使用非 root 用户
USER node

CMD ["node", "src/index.js"]
