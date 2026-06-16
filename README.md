# 服务器列表管理系统

## 项目概述

这是一个基于 Vue 3 和 Express.js 的服务器列表管理系统，支持服务器的增删改查、OIDC 单点登录、用户权限管理与审核工作流。

## 技术栈

### 后端
- Express.js 5.2.1
- Node.js (ES Modules)
- PostgreSQL（数据库）
- Redis

### 前端
???

## 项目结构

```
server-list/
├── src/
│   ├── index.js          # 入口，路由挂载
│   ├── admin.js          # 服务器、用户、申请管理接口
│   ├── auth.js           # 认证接口（Token / OIDC 回调）
│   ├── db.js             # 数据库初始化
│   ├── oidc-config.js    # OIDC 配置接口
│   └── request.js        # 用户申请 CRUD 接口
├── frontend/
└── package.json
```

## 认证与权限

系统支持两种登录方式，会话权限取两者最大值。

### 权限等级

| 权限等级 | 角色 | 可访问功能 |
|----------|------|-----------|
| 0 | 封禁用户 | 可登录但无任何操作权限 |
| 1 | 普通用户 | 提交服务器操作申请（需管理员审核） |
| 2 | 管理员 | 直接增删改服务器、审核用户申请 |
| 3 | 超级管理员 | perm=2 全部功能 + 用户管理（封禁/删除用户）、OIDC 配置 |

> Token 登录默认授予 perm=3。OIDC 提供商可设置权限覆写，实际权限取配置值与用户数据库权限的最大值。

### Token 登录

点击页面右上角 **"登录"** 按钮，输入后端 `TOKEN` 环境变量对应的令牌。

- Token 未配置时提示"Token 登录未启用"
- Token 错误时提示"Token 无效"

### OIDC 登录

在 OIDC 配置管理页（需 perm=3）添加提供商后，登录对话框会显示对应的 OIDC 登录按钮。

**以 Casdoor 为例：**

| 字段 | 值 |
|------|----|
| `auth_url` | `http://<casdoor_host>/login/oauth/authorize` |
| `apipoint` | `http://<casdoor_host>/api/login/oauth/access_token` |
| `redirect_uri` | `http://<your_host>/api/auth/callback` |

## 功能说明

### 服务器列表
- 显示所有服务器的图标、名称、简介
- 支持按名称搜索、分页
- 右键服务器卡片可删除（perm≥2）或申请编辑（perm=1）
- 单击卡片进入编辑页

### 服务器管理（perm ≥ 2）
- 点击"添加服务器"新增（UUID 自动生成）
- 编辑页可修改除 UUID 外的所有字段
- IP 字段为可选项
- 编辑页可一键"创建草稿"将当前数据保存为编辑申请
- 修改两种tag:类型(type),版本(version)，服务器和申请的相关字段可以**不在**管理员设置的列表内

### 申请审核工作流

**普通用户（perm=1）：**
1. 点击"添加服务器"跳转至申请表单，或右键服务器选择"申请编辑"
2. 填写信息后保存草稿或直接提交审核
3. 在"我的申请"页查看申请状态，可撤回/修改/删除草稿；被驳回的申请会显示驳回原因
4. 待审核申请上限由 `MAX_PENDING_PER_USER` 环境变量控制（默认 3）

**管理员（perm≥2）审核：**
1. 进入"申请管理"页查看所有待审核申请
2. 可通过、拒绝（填写理由）或编辑申请内容
3. 审核编辑类申请时若目标服务器已删除，可选择转为新建工单

### 用户管理（perm ≥ 3）
- 查看所有已登录过的用户
- 修改用户的权限等级（0/1/2/3，0 表示封禁）
- 删除用户（删除后立即使其所有会话失效）

> 封禁 = 将用户权限设为 0（仍可登录但无任何操作权限）。

### OIDC 配置管理（perm ≥ 3）
- 增删改 OIDC 提供商配置
- 配置项包括：Client ID、Secret、授权端点、令牌端点、回调地址、权限覆写等

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/getjson` | 获取服务器列表 |
| GET | `/api/getjson-fork` | 获取服务器列表 |
| GET | `/api/oidcConfig/list` | 获取 OIDC 提供商列表（仅公开字段） |
| GET | `/api/auth/check` | 检查登录状态，返回 `{ perm }` |
| POST | `/api/auth/token` | Token 登录 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/callback` | OIDC 回调 |

### 用户接口（perm ≥ 1）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/request/list` | 获取当前用户所有申请（含 `target_name`） |
| POST | `/api/request/create` | 创建草稿 |
| POST | `/api/request/edit` | 修改草稿（或将已拒绝申请重置为草稿） |
| POST | `/api/request/submit` | 提交草稿为待审核 |
| POST | `/api/request/cancel` | 撤回待审核申请为草稿 |
| POST | `/api/request/delete` | 删除草稿 |

### 管理接口（perm ≥ 2）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/create` | 新增服务器 |
| POST | `/api/admin/edit` | 修改服务器 |
| POST | `/api/admin/delete` | 删除服务器 |
| GET | `/api/admin/request/list` | 获取所有待审核申请（含 `username`、`target_name`） |
| POST | `/api/admin/request/edit` | 编辑申请数据 |
| POST | `/api/admin/request/approve` | 审核通过（可选 `force_create` 强制新建） |
| POST | `/api/admin/request/reject` | 拒绝申请（可附理由，用户在申请列表可见） |
| POST | `/api/admin/request/submit` | 将草稿提交为待审核（绕过用户数量限制） |
| POST | `/api/admin/tag/{tag类型}/edit` | 修改某个tag |

### 超级管理员接口（perm ≥ 3）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/user/list` | 获取用户列表 |
| POST | `/api/admin/user/edit` | 修改用户权限（0=封禁） |
| POST | `/api/admin/user/delete` | 删除用户（删除时删除其所有会话） |
| GET | `/api/oidcConfig/admin/list` | 获取 OIDC 完整配置列表（secret 脱敏返回） |
| POST | `/api/oidcConfig/admin/create` | 新增 OIDC 提供商 |
| POST | `/api/oidcConfig/admin/edit` | 修改 OIDC 提供商（含 secret） |
| POST | `/api/oidcConfig/admin/edit-nosecert` | 修改 OIDC 提供商，但**不覆盖** secret |
| POST | `/api/oidcConfig/admin/delete` | 删除 OIDC 提供商 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 后端监听端口 |
| `TOKEN` | 无 | 管理令牌，不设置则禁用 Token 登录（登录后获得 perm=3） |
| `MAX_PENDING_PER_USER` | `3` | 每用户最大待审核申请数 |
| `DB_USER` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `password` | 数据库密码 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `serverlist` | 数据库名称 |
| `REDIS_URL` | `redis://localhost:6379` | Redis连接地址 | 

## Docker 部署

### 手动 Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e TOKEN=your_admin_token \
  -e DB_HOST=postgres-db \
  -e DB_PASSWORD=password \
  -e DB_NAME=serverlist \
  --link postgres-db:postgres-db \
  ghcr.io/minejpgcraft/server-list:latest
```

## 交互式用户配置

在无任何超管用户的情况下，并且 token 未配置，则 `/setup` 路径开放，可进行交互配置（仅支持登录后提升**当前用户**自己为超管）。请注意，使用 token 登录一次后会留下名为 `token` 的超管用户。
