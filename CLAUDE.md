# CLAUDE.md

这是一份给 Claude Code (或其他 AI 编程助手) 的代码库指南。

## 项目概述

MCJPG 服务器列表平台 — 一个支持多用户、OIDC 单点登录、审核工作流、服务器所有权机制的 Minecraft 服务器目录管理系统。

**作者:** zzfx1166 &emsp; **许可证:** MIT

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Node.js + Express 5.2.1 (ES Modules, `"type": "module"`) |
| **数据库** | PostgreSQL (pg Pool, `max: 20`) |
| **缓存/会话** | Redis (node-redis v6) |
| **认证** | Token 登录 + OIDC/OAuth 2.0 SSO (jsonwebtoken 解码 id_token) |
| **前端** | Vue 3 + TypeScript + Vite 5 |
| **样式** | Tailwind CSS 3 + Radix Vue + Lucide Icons |
| **表单** | vee-validate + zod |
| **部署** | Docker 多阶段构建 (Node 20 Alpine) |

## 项目结构

```
ServerEditor/
├── src/                      # 后端源码
│   ├── index.js              # 入口：Express app、路由挂载、静态文件、Redis 缓存逻辑
│   ├── db.js                 # PostgreSQL 连接池、Redis 客户端、数据库初始化 (CREATE TABLE IF NOT EXISTS + ALTER 平滑迁移)
│   ├── auth.js               # 认证：Token 登录、OIDC 回调、登出、checkSession 中间件
│   ├── admin.js              # 管理员路由：服务器 CRUD（无需审核）、server/list、transfer、用户管理、请求审核 (approve/reject)、Tag 编辑
│   ├── request.js            # 用户申请路由：创建/编辑/提交/撤回/删除申请
│   ├── oidc-config.js        # OIDC 提供商配置 CRUD
│   ├── setup.js              # 首次设置向导 (无超管时开放 /setup)
│   ├── validate.js           # 输入校验工具 (权限范围、请求类型白名单、URL 协议、图片数组)
│   ├── notify.js             # 邮件通知 (Webhook 推送，审核通过/驳回时触发)
├── frontend/                 # Vue 3 前端
│   ├── src/
│   │   ├── main.ts           # Vue 应用入口、路由创建、主题初始化
│   │   ├── App.vue           # 根组件 (SidebarLayout + Toaster)
│   │   ├── api/index.ts      # Axios 封装、所有 API 接口 TypeScript 定义
│   │   ├── router/index.ts   # 路由定义 + 权限守卫 (meta.minPerm)
│   │   ├── composables/      # Vue composables
│   │   │   ├── useAuth.ts     # 认证状态 (perm, userId, login/logout/checkAuth)
│   │   │   ├── useServers.ts  # 服务器列表 + 标签数据获取
│   │   │   └── useTheme.ts    # 暗色/亮色主题切换
│   │   ├── layouts/SidebarLayout.vue  # 侧边栏布局 (导航/用户信息/折叠)
│   │   ├── views/            # 页面组件
│   │   │   ├── ServerList.vue     # 服务器列表 (搜索/筛选/右键菜单；perm≥2 可直接编辑)
│   │   │   ├── ServerManage.vue   # 服务器管理 (CRUD 表单 + 所有者展示 + 转移 UI)
│   │   │   ├── RequestList.vue    # 我的申请列表
│   │   │   ├── RequestForm.vue    # 申请表单 (新建/编辑)
│   │   │   ├── RequestAdmin.vue   # 审核管理
│   │   │   ├── UserAdmin.vue      # 用户管理
│   │   │   ├── TagManage.vue      # Tag 管理 (类型/版本)
│   │   │   ├── OidcAdmin.vue      # OIDC 配置管理
│   │   │   ├── Login.vue          # 登录页
│   │   │   └── Setup.vue          # 首次安装向导
│   │   └── components/      # 共享组件 (Combobox, ServerCard, ReqTypeBadge 等)
│   ├── utils/validate.ts      # 前端输入校验工具 (与后端 validate.js 规则一致)
│   ├── vite.config.ts        # Vite 配置 (端口 5173, /api 代理到 :8080)
│   └── tailwind.config.ts    # Tailwind 配置
├── Dockerfile                # 多阶段 Docker 构建
└── package.json              # 根项目 (仅后端脚本)
```

## 数据库表

| 表名 | 关键字段 | 说明 |
|------|---------|------|
| `server` | `uuid` (PK, UUID), `name`, `type`, `version`, `icon`, `description`, `link`, `IP` (nullable), **`userid`** (nullable text), **`picture`** (jsonb, default `[]`) | 服务器列表，`userid` 标识所有者，`picture` 存储图片链接数组 |
| `oidc` | `id` (PK, text), `name`, `secret`, `perm`, `frontend`, `redirect_uri`, `apipoint`, `auth_url` | OIDC 提供商配置 |
| `users` | `id` (PK, text), `name`, `perm` (default 1), **`email`** (nullable text) | 用户权限与邮箱 |
| `server_requests` | `id` (PK, UUID), `userid`, `req_type` (create/edit/delete), `target_uuid`, `data` (jsonb), `status` (draft/pending/approved/rejected), `reject_reason` | 审核工作流 |
| `tags` | `name` (PK, text), `tag` (JSON text array) | 预定义标签 (types, versions) |

> **平滑迁移**：`db.js` 使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` 为已有表添加列，不会影响现有数据：
> - `server.userid text` — 服务器所有者
> - `server.picture jsonb DEFAULT '[]'::jsonb` — 图片链接数组
> - `users.email text` — 用户邮箱（OIDC 登录时同步）

## 权限体系 (4 级)

| 等级 | 角色 | 能力 |
|------|------|------|
| 0 | 封禁用户 | 可登录，无任何操作权限 |
| 1 | 普通用户 | 浏览服务器、提交编辑/创建/删除申请（需审核） |
| 2 | 管理员 | 直接增删改**所有**服务器（无需审核）、审核申请、管理 Tag |
| 3 | 超级管理员 | 管理员全部功能 + 转移所有权、用户管理 (封禁/删除)、OIDC 配置管理 |

- Token 登录始终获得 `perm=3` (用户 ID: `"token"`)
- OIDC 登录权限: `max(oidc_provider.perm, user.perm)` 默认为 1
- 权限检查通过 `checkSession(level)` 中间件，检查 `req.sessionPerm >= level`

## 服务器列表 API

### `GET /api/getjson` 和 `GET /api/getjson-fork`

两个端点逻辑相同，均返回统一的 `ServerListData` 结构：

```json
{
  "types":    ["Vanilla", "Fabric", "Forge", "…"],
  "versions": ["1.21.5", "1.21.4", "…"],
  "servers":  [
    {
      "uuid": "…",
      "name": "…",
      "type": "…",
      "version": "…",
      "icon": "…",
      "description": "…",
      "link": "…",
      "IP": "…",
      "userid": "…",
      "owner_name": "…",
      "picture": ["https://…/img1.png", "https://…/img2.png"]
    }
  ]
}
```

- **缓存优先**：先查 Redis key `server`（TTL 1800s），命中直接返回
- **DB 回退**：缓存未命中时，`getjson()` 从 PostgreSQL 查询 `server LEFT JOIN users` + 两条 `tags` 查询，组装结果后写入 Redis 再返回
- 缓存失效：任何服务器 CRUD / Tag 编辑 / 所有权转移操作后调用 `rd.del("server")`

## 服务器所有权机制

### 核心原则

- 每个 `server` 记录的 `userid` 字段标识其所有者（用于展示和追溯）
- **perm=1**：只能通过审核工作流操作服务器
- **perm≥2**：可直接增删改**任意**服务器，无需审核，无所有权限制
- **perm≥3**：额外拥有转移所有权 (`POST /api/admin/transfer`) 能力

### 所有权设置时机

| 场景 | 所有者 |
|------|--------|
| 管理员直接创建 (`POST /api/admin/create`) | `req.sessionUserId` |
| 审核通过创建申请 (`POST /api/admin/request/approve`) | 申请人的 `userid` |
| 已有服务器（迁移前） | `NULL`（超管可转移） |

### 关键 API

| 接口 | 权限 | 说明 |
|------|------|------|
| `POST /api/admin/create` | perm≥2 | 自动设置 `userid=当前用户` |
| `POST /api/admin/edit` | perm≥2 | 直接修改任意服务器，无需审核 |
| `POST /api/admin/delete` | perm≥2 | 直接删除任意服务器，无需审核 |
| `GET /api/admin/server/list` | perm≥2 | 返回全部服务器（含 `owner_name`） |
| `POST /api/admin/transfer` | perm≥3 | 转移所有权 `{ uuid, userid }` |

### 前端展示

- **ServerManage.vue** — 管理页卡片底部显示所有者名称 + 超管可见"转移"按钮
- **ServerCard.vue** — 公开列表卡片底部显示所有者名称（来自 `owner_name` JOIN）
- 服务器列表 API (`/api/getjson`) 使用 LEFT JOIN 获取 `owner_name`

## Redis 数据模型

| Key | 类型 | 内容 | TTL |
|-----|------|------|-----|
| `server` | string | JSON `{types, versions, servers}` | 1800s |
| `session:{uuid}` | hash | `{userid, perm}` | 86400s (24h) |
| `user:{userid}` | set | `session:{uuid}` 集合 | 864000s (10d) |

- 修改服务器 / Tag / 转移所有权后调用 `rd.del("server")` 使缓存失效
- 用户权限变更 / 删除时 `rd.del(rd.sMembers(...))` 清除其所有会话

## 审核工作流

```
普通用户 (perm=1):
  POST /api/request/create  → draft
  POST /api/request/edit    → 修改 draft 或 rejected
  POST /api/request/submit  → pending (每个用户最多 MAX_PENDING_PER_USER 个
                               默认 3，使用 FOR UPDATE 防并发)
  POST /api/request/cancel   → 退回 draft
  POST /api/request/delete   → 删除 draft

管理员 (perm≥2):
  GET  /api/admin/request/list       → 查看所有 pending
  POST /api/admin/request/edit       → 编辑申请内容
  POST /api/admin/request/approve    → 审核通过 (edit 类目标不存在时
                                        可 force_create 转为新建；
                                        create 类自动设 userid=申请者)
  POST /api/admin/request/reject     → 拒绝 (附 reject_reason)
  POST /api/admin/request/submit     → 绕过数量限制直接提交
```

> **注意**：perm≥2 管理员可直接操作任意服务器（`/api/admin/edit`、`/api/admin/delete`），无需走审核流程。

### 审核邮件通知

审核通过或驳回时，系统自动向申请人发送邮件通知（通过 Webhook 推送）。

| 触发接口 | 通知函数 | 邮件内容 |
|---------|---------|---------|
| `POST /api/admin/request/approve` | `notifyApproved()` | 申请类型、服务器名称、申请编号 |
| `POST /api/admin/request/reject` | `notifyRejected()` | 申请类型、服务器名称、申请编号、驳回理由 |

- 通知模块：`src/notify.js`，通过 `MAIL_WEBHOOK_URL` + `MAIL_WEBHOOK_TOKEN` 环境变量配置
- Webhook 接口规范：`POST <url>`，Header `Authorization: Bearer <token>`，Body `{ channel, recipient, subject, body }`
- 申请人邮箱从 `users.email` 查询，无邮箱的用户静默跳过
- 通知为异步触发（不 await），发送失败仅打印日志，不影响审核操作本身
- Webhook 未配置时 `sendMail()` 直接返回，不执行任何网络请求

## 会话认证全流程

### checkSession 中间件

1. 从 `req.cookies.session_id` 获取会话 ID
2. 从 Redis 读取 `session:{id}` hash
3. 设置 `req.sessionPerm` 和 `req.sessionUserId`
4. 检查 `perm >= level` (不传 level 时仅验证登录状态)

挂载方式: `app.use('/api/admin', checkSession(2))` — 所有 `/api/admin/*` 路由都需 perm≥2。

### OIDC 回调流程

1. 用户访问 `/api/auth/callback?code=...&state=provider_id`
2. 通过 state (provider ID) 查 `oidc` 表获取提供商配置
3. 用 axios POST 向 `apipoint` 发送 `authorization_code` 换取 token
4. `jwt.decode(id_token)` 获取 `sub`、`name`、`email`
5. 新用户插入 `users` 表 (初始 perm 为提供商配置值或 1，email 来自 id_token)
6. 已有用户登录时同步 `name` 和 `email`（仅当 OIDC 返回值与数据库不同时更新）
7. 创建 Redis session，设置 cookie
8. 重定向到 `frontend` URL 或 `/`

## 输入校验与安全防护

所有用户输入在写入数据库前均经过校验，前后端双重防护。

### 后端校验 (`src/validate.js`)

| 校验项 | 函数 | 规则 | 应用位置 |
|--------|------|------|---------|
| 权限值 | `isValidPerm` | 必须为整数 0-3 | `/admin/user/edit`、`/oidcConfig/admin/*`、`/setup/oidc` |
| 请求类型 | `isValidReqType` | 必须为 `create`/`edit`/`delete` | `/request/create`、`/request/edit`、`/admin/request/edit` |
| 标签名 | `isValidTagName` | 必须为 `types`/`versions` | `/admin/tag/:tag/edit` |
| 服务器 URL | `validateServerUrls` | `link` 仅 http/https；`icon` 允许 http/https 和 `data:image/`（排除 svg）；`picture` 必须为 http/https URL 字符串数组 | 所有写入服务器的入口（admin CRUD、request create/edit、approve） |

### 前端校验 (`frontend/src/utils/validate.ts`)

与后端规则一致的 TypeScript 实现，在提交前提供即时反馈（toast 提示），避免无效请求发到后端：

| 校验位置 | 校验内容 |
|---------|---------|
| `ServerManage.vue` `addPicture()` / `saveForm()` | 图片 URL 协议 + 服务器 link/icon/picture |
| `ServerList.vue` `addPicture()` / `saveEdit()` | 图片 URL 协议 + 服务器 link/icon/picture |
| `RequestForm.vue` `addPicture()` / `saveDraft()` / `submitRequest()` | 图片 URL 协议 + 服务器 link/icon/picture（delete 类型跳过） |
| `OidcForm.vue` `handleSubmit()` | perm 为 0-3 + auth_url/apipoint/redirect_uri/frontend URL 协议 |

### 防护范围

- **权限越权** — `perm` 限制为 0-3，防止传入 999 等越权值
- **类型注入** — `req_type`、`tag` 名称使用白名单校验
- **存储型 XSS** — URL 字段仅允许 `http:`/`https:` 协议，`icon` 额外允许 `data:image/`（排除 svg），阻断 `javascript:`、`data:text/html` 等危险协议
- **结构校验** — `picture` 必须为字符串数组，`tag` 必须为数组

> **注意**：SQL 注入通过 `pg` 参数化查询（`$1, $2, ...`）防护，所有数据库查询均使用参数化，无字符串拼接。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 后端端口 |
| `TOKEN` | — | Token 登录令牌 (不设则禁用) |
| `MAX_PENDING_PER_USER` | `3` | 每用户最大待审核数 |
| `DB_USER` | `postgres` | 数据库用户 |
| `DB_PASSWORD` | `password` | 数据库密码 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `serverlist` | 数据库名 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 地址 |
| `MAIL_WEBHOOK_URL` | — | 邮件通知 Webhook 地址 (不设则禁用邮件通知) |
| `MAIL_WEBHOOK_TOKEN` | — | 邮件通知 Webhook Bearer Token |

## 开发命令

```bash
# 后端 (根目录)
npm run backend          # node src/index.js

# 前端 (frontend/)
npm run frontend         # cd frontend && npm run dev  → Vite :5173
```
