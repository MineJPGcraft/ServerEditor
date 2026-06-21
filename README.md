# 服务器列表管理系统

## 项目概述

这是一个基于 Vue 3 和 Express.js 的服务器列表管理系统，支持服务器的增删改查、OIDC 单点登录、用户权限管理、服务器所有权机制与审核工作流。

## 技术栈

### 后端
- Express.js 5.2.1
- Node.js (ES Modules)
- PostgreSQL（数据库）
- Redis

### 前端
- Vue 3 + TypeScript + Vite 5
- Tailwind CSS 3 + Radix Vue + Lucide Icons

## 项目结构

```
server-list/
├── src/
│   ├── index.js          # 入口，路由挂载、公开 API、Redis 缓存
│   ├── admin.js          # 服务器 CRUD（无需审核）、所有权转移、用户管理、申请审核
│   ├── auth.js           # 认证接口（Token / OIDC 回调）
│   ├── db.js             # 数据库初始化与平滑迁移
│   ├── oidc-config.js    # OIDC 配置接口
│   ├── request.js        # 用户申请 CRUD 接口
│   ├── setup.js          # 首次设置向导
│   └── validate.js       # 输入校验工具（权限范围、请求类型白名单、URL 协议）
├── frontend/
│   ├── src/
│   │   ├── api/index.ts      # Axios 封装，所有 API 类型定义
│   │   ├── router/index.ts   # 路由 + 权限守卫
│   │   ├── composables/      # useAuth, useServers, useTheme
│   │   ├── views/            # 页面组件
│   │   ├── components/       # 共享组件
│   │   └── utils/validate.ts # 前端输入校验工具（与后端规则一致）
└── package.json
```

## 认证与权限

系统支持两种登录方式，会话权限取两者最大值。

### 权限等级

| 权限等级 | 角色 | 可访问功能 |
|----------|------|-----------|
| 0 | 封禁用户 | 可登录但无任何操作权限 |
| 1 | 普通用户 | 浏览所有服务器、提交服务器操作申请（需管理员审核） |
| 2 | 管理员 | 直接增删改**所有**服务器（无需审核）、审核用户申请、管理 Tag |
| 3 | 超级管理员 | perm=2 全部功能 + 转移所有权、用户管理（封禁/删除）、OIDC 配置 |

> **所有权机制**：每个服务器记录其创建者（`userid` 字段），用于展示和追溯。perm=1 只能通过审核流程操作服务器；perm≥2 可直接操作任意服务器，无需审核。
>
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
- 显示所有服务器的图标、名称、描述、类型、版本
- 支持按名称搜索、按类型/版本筛选
- 每张卡片底部显示**所有者**信息
- **普通用户**：卡片显示"申请修改/申请删除"按钮（走审核流程）
- **管理员**：卡片显示"直接编辑/直接删除"按钮（无需审核，即时生效）

### 服务器图片（picture）
- 每个服务器可关联一组**图片链接**（`picture` 字段，jsonb 数组，可选）
- 管理端表单（ServerManage）和用户申请表（RequestForm）均提供图片编辑器：
  - 输入链接后回车或点击"添加"按钮加入列表
  - 点击图片项右侧的 × 可删除
  - **管理端表单支持拖拽排序**（参考 TagManage 的 Pointer Events 实现，鼠标/触摸通用，6px 阈值防误触）
- 服务器管理页卡片底部展示前 4 张缩略图（超出显示 +N）
- 审核详情弹窗以缩略图网格形式展示申请中的图片
- 图片字段为可选，不填写不影响服务器创建/编辑

### 服务器管理（perm ≥ 2）
- 管理页面显示**全部**服务器，支持直接增删改
- 点击"新建服务器"直接创建（自动归属当前用户）
- 修改两种 tag：类型 (type)、版本 (version)，服务器和申请的相关字段可以**不在**管理员设置的列表内

### 服务器所有权转移（perm ≥ 3）
- 超管在管理页每张卡片的底部可见 **"转移"** 按钮
- 点击后弹出对话框，从用户列表中选择新所有者
- 转移后所有权立即生效

### 申请审核工作流

**普通用户（perm=1）：**
1. 在服务器列表页点击服务器卡片上的"申请修改"或"申请删除"
2. 或通过导航栏进入申请页新建创建申请
3. 填写信息后保存草稿或直接提交审核
4. 在"我的申请"页查看申请状态，可撤回/修改/删除草稿；被驳回的申请会显示驳回原因
5. 待审核申请上限由 `MAX_PENDING_PER_USER` 环境变量控制（默认 3）
6. 申请通过后，创建的服务器自动归属申请人

**管理员（perm≥2）审核：**
1. 进入"申请管理"页查看所有待审核申请
2. 可通过、拒绝（填写理由）或编辑申请内容
3. 审核编辑类申请时若目标服务器已删除，可选择转为新建工单
4. 管理员自身可直接操作服务器，无需提交申请

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
| GET | `/api/getjson` | 获取服务器列表（含所有者名称、picture 图片数组） |
| GET | `/api/getjson-fork` | 获取服务器列表（副本） |
| GET | `/api/oidcConfig/list` | 获取 OIDC 提供商列表（仅公开字段） |
| GET | `/api/auth/check` | 检查登录状态，返回 `{ perm, userId }` |
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
| GET | `/api/admin/server/list` | 获取管理用服务器列表（全部服务器，含所有者名称） |
| POST | `/api/admin/create` | 新增服务器（自动设置当前用户为所有者，支持 `picture` 数组） |
| POST | `/api/admin/edit` | 直接修改任意服务器（无需审核，支持 `picture` 数组） |
| POST | `/api/admin/delete` | 直接删除任意服务器（无需审核） |
| GET | `/api/admin/request/list` | 获取所有待审核申请（含 `username`、`target_name`） |
| POST | `/api/admin/request/edit` | 编辑申请数据 |
| POST | `/api/admin/request/approve` | 审核通过（创建类自动设申请者为所有者；可选 `force_create` 强制新建；同步写入 `picture`） |
| POST | `/api/admin/request/reject` | 拒绝申请（可附理由，用户在申请列表可见） |
| POST | `/api/admin/request/submit` | 将草稿提交为待审核（绕过用户数量限制） |
| POST | `/api/admin/tag/{tag类型}/edit` | 修改某个 tag |

### 超级管理员接口（perm ≥ 3）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/transfer` | 转移服务器所有权 `{ uuid, userid }` |
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
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接地址 |

## 安全防护

### SQL 注入防护

所有数据库查询均使用 `pg` 参数化查询（`$1, $2, ...`），无字符串拼接，天然防止 SQL 注入。

### 输入校验

系统采用前后端双重校验，防止注入和非法数据：

**后端**（`src/validate.js`）— 所有写入数据库的入口均校验：

| 校验项 | 规则 | 说明 |
|--------|------|------|
| 权限值 (`perm`) | 整数 0-3 | 防止越权设置 |
| 请求类型 (`req_type`) | `create`/`edit`/`delete` 白名单 | 防止类型注入 |
| 标签名 (`tag`) | `types`/`versions` 白名单 | 防止操作非预期数据行 |
| 服务器链接 (`link`) | 仅 `http:`/`https:` 协议 | 防止 `javascript:` 等存储型 XSS |
| 服务器图标 (`icon`) | `http:`/`https:` 或 `data:image/`（排除 svg） | 兼容 base64 图标，阻断脚本注入 |
| 图片数组 (`picture`) | 字符串数组，每个元素为 http/https URL | 防止非法结构 + XSS |

**前端**（`frontend/src/utils/validate.ts`）— 与后端规则一致的 TypeScript 实现，在提交前提供即时 toast 反馈：

| 校验位置 | 校验内容 |
|---------|---------|
| ServerManage / ServerList | 添加图片时校验 URL 协议；保存服务器时校验 link/icon/picture |
| RequestForm | 添加图片时校验 URL 协议；保存草稿/提交审核时校验 link/icon/picture（delete 类型跳过） |
| OidcForm | 提交时校验 perm 为 0-3 + auth_url/apipoint/redirect_uri/frontend URL 协议 |

校验覆盖所有写入服务器的入口：管理员直接 CRUD、用户申请创建/编辑、管理员审核通过。

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
  ghcr.io/minejpgcraft/servereditor:latest
```

## 交互式用户配置

在无任何超管用户的情况下，并且 token 未配置，则 `/setup` 路径开放，可进行交互配置（仅支持登录后提升**当前用户**自己为超管）。请注意，使用 token 登录一次后会留下名为 `token` 的超管用户。
