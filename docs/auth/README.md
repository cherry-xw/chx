# 多用户认证

本领域维护前后端多用户认证与受控准入体系：支持本地账号密码登录、基于管理员（`chery`）邀请码的受控注册、以及 Pocket ID OIDC（Authorization Code + PKCE）登录与在线配置；后端使用 SQLite（`better-sqlite3`）持久化多用户身份、邀请码、系统认证配置与 Refresh Token 会话，前端基于 `chery-fetch` 洋葱中间件实现双 Token（`accessToken` + `refreshToken`）无感自动刷新，并提供管理员专用页面（`/main/admin`）。

## 任务定位

| 修改意图 | 代码入口与关键符号 | 验证入口 |
| --- | --- | --- |
| 调整环境变量、端口、SQLite 路径或 Pocket ID OIDC 默认配置 | [后端配置](../../workspace/backend/config.js)：`loadConfig`；[环境变量模板](../../workspace/backend/.env.example) | `npm run test:backend` |
| 调整 SQLite 建表、多用户存储、OIDC 同名合并、邀请码与在线配置持久化 | [SQLite 数据库层](../../workspace/backend/db/sqlite.js)：`createDatabase`、`initSchema`；[认证仓储](../../workspace/backend/db/authRepo.js)：`createAuthRepository` | `npm run test:backend` |
| 调整双 Token 签发、本地密码/受控注册、OIDC 路由与 `chery` 管理员接口 | [Token 工具](../../workspace/backend/utils/token.js)：`issueTokenPair`、`verifyAccessToken`、`verifyRefreshToken`；[OIDC 服务](../../workspace/backend/utils/oidc.js)：`createOidcService`；[认证路由](../../workspace/backend/routes/users.js)：`createAuthRouter`；[应用入口](../../workspace/backend/app.js)：`createApp` | `npm run test:backend` |
| 调整前端双 Token 无感刷新中间件与认证/管理 API 封装 | [Token 中间件](../../workspace/frontend/src/api/middleware/token.ts)：`resetToken`、`clearToken`、`tokenRefreshMiddleware`；[API 入口](../../workspace/frontend/src/api/index.ts)：`serve`、`tServe`；[认证 API](../../workspace/frontend/src/api/auth.ts) | `npm run type-check:frontend`、`npm run test:frontend` |
| 调整登录页（邀请码注册 + Pocket ID 激活）、顶栏入口与管理员专用页面 | [登录页](../../workspace/frontend/src/pages/login/index.vue)；[管理后台页](../../workspace/frontend/src/pages/main/admin/index.vue)；[顶栏](../../workspace/frontend/src/components/layer/Header.vue)；[路由配置](../../workspace/frontend/src/router/main/index.ts)；[导航状态](../../workspace/frontend/src/stores/nav.ts)；[用户状态](../../workspace/frontend/src/stores/counter.ts)：`useUserInfoStore` | `npm run build:frontend`；人工核对邀请码注册、管理后台与 Pocket ID 登录 |
| 调整后端生产包构建、远程 rsync 推送与 PM2 监听自动重启 | [构建脚本](../../workspace/backend/scripts/build.js)：`build`；[推送脚本](../../workspace/backend/scripts/deploy.js)：`main`；[PM2 配置](../../workspace/backend/ecosystem.config.js)；操作步骤见 [Monorepo 使用指南](../guides/monorepo.md#后端构建推送与服务端自动重启) | `pnpm build:backend`、`npm run test:backend` |

## 核心契约

### 1. 认证与管理接口（统一 `{ data, status, msg }` 响应）

| 接口 | 鉴权 | 说明 |
| --- | --- | --- |
| `GET /api/verifycode` | `serve` | 返回 `{ key, value }` 一次性 AES 传输密钥（短期有效、单次消费） |
| `POST /api/regist` | `serve` | 接收 AES 加密的 `username`、`password`、`verifyCodeKey` 与 `inviteCode`；除数据库尚无 `chery` 账号时允许首次免邀请码初始化 `chery` 管理员外，其余注册必须提供有效邀请码并单次消费 |
| `POST /api/login` | `serve` | 接收 AES 加密的 `username`、`password` 与 `verifyCodeKey`，校验密码后签发 `{ accessToken, refreshToken, user }` |
| `GET /api/auth/pocket-id/config` | `serve` | 返回 `{ enabled, bootstrapRequired }`（是否已启用 Pocket ID、是否尚未初始化 `chery` 管理员） |
| `GET /api/auth/pocket-id/login` | 浏览器导航 | 生成 `state`、`nonce`、PKCE `code_verifier` 存入 SQLite `oidc_transactions`，302 跳转至 Pocket ID 授权端点 |
| `GET /api/auth/pocket-id/callback` | 浏览器回调 | 校验 `state`、PKCE 与 ID Token：若已绑定或本地存在同名/同邮箱账号（或用户名为 `chery`），自动合并/创建 `chery` 并生成一次性 `oidcCode`；若为陌生新用户，则生成短期 `oidcPending` 票据并 302 回 `/#/login?oidcPending=...` 要求输入邀请码激活 |
| `POST /api/auth/pocket-id/exchange` | `serve` | 消费一次性 `oidcCode`，返回 `{ accessToken, refreshToken, user, returnTo }` |
| `POST /api/auth/pocket-id/complete-registration` | `serve` | 接收 `{ pendingToken, inviteCode }`，校验并单次消费邀请码后完成陌生 Pocket ID 用户的本地账号创建与绑定，返回 `{ accessToken, refreshToken, user, returnTo }` |
| `GET /api/admin/invite-codes` | `tServe`（仅 `chery`） | 返回邀请码列表（含状态、创建/过期/消费时间与使用者） |
| `POST /api/admin/invite-codes` | `tServe`（仅 `chery`） | 生成新的一次性邀请码（支持 `note` 与 `expiresInDays`，默认 7 天有效） |
| `DELETE /api/admin/invite-codes/:code` | `tServe`（仅 `chery`） | 作废/删除未使用的邀请码 |
| `GET /api/admin/pocket-id` | `tServe`（仅 `chery`） | 获取当前 Pocket ID 配置详情（`issuer`、`clientId`、`hasClientSecret`、`redirectUri`、`scopes`、`enabled`） |
| `PUT /api/admin/pocket-id` | `tServe`（仅 `chery`） | 在线保存 Pocket ID 配置到 SQLite `system_settings` 并立即热更新生效 |
| `POST /api/refreshToken` | `Authorization: Bearer <refreshToken>` | 校验并轮换 SQLite 中的 Refresh Token，返回新 `{ accessToken, refreshToken, user }`；失效或已吊销时返回 HTTP 401 |
| `GET /api/userinfo` | `tServe` | 校验 `accessToken`（过期时由 `chery-fetch` 自动触发 `/api/refreshToken` 无感刷新），返回当前登录用户 `user`（含 `isAdmin`） |
| `POST /api/logout` | `serve` / `tServe` | 吊销当前 Refresh Token（或当前用户关联 Token），前端同步调用 `clearToken()` 与 `userStore.clearUserInfo()` |

### 2. Pocket ID 与多用户系统关联规则

1. **已绑定身份直接登录**：`oidc_identities` 中 `(issuer, subject)` 已存在时，直接登录其关联的 `user_id`。
2. **同名/同邮箱账号自动合并**：首次使用某 Pocket ID 登录时，若其 `preferred_username`（或 `name` / `email`）与本地已有账号匹配，自动将该 Pocket ID 身份绑定到已有 `user_id`（例如本地先创建的 `chery` 与 Pocket ID 的 `chery` 自动合并为同一管理员账号）。
3. **管理员 `chery` 免邀请码自动创建**：若 Pocket ID 返回的用户名为 `chery` 且本地尚无 `chery` 账号，直接自动创建本地 `chery` 管理员账号并完成绑定。
4. **陌生新用户强制邀请码激活**：若既未绑定、无同名本地账号且非 `chery`，回调会返回 `oidcPending` 票据至登录页，用户必须输入由 `chery` 生成的有效邀请码方可创建本地账号并完成绑定。

### 3. SQLite 数据表

- `users`：`id`（主键）、`username`（唯一）、`name`、`email`、`password_hash`、`auth_provider`、`state`、`created_at`、`updated_at`。
- `oidc_identities`：`id`、`user_id`（外键关联 `users.id`）、`issuer`、`subject`、`email`、`name`、`last_login_at`；唯一约束 `UNIQUE(issuer, subject)`。
- `invite_codes`：`code`（主键）、`created_by`、`note`、`used_by`、`used_by_username`、`expires_at`、`consumed_at`、`created_at`。
- `oidc_pending_registrations`：`token`（主键）、`issuer`、`subject`、`name`、`preferred_username`、`email`、`return_to`、`expires_at`、`created_at`。
- `system_settings`：`key`（主键）、`value`（JSON 配置，如 `pocket_id_config`）、`updated_at`。
- `refresh_tokens`：`jti`（主键）、`user_id`、`expires_at`、`revoked_at`、`replaced_by_jti`、`created_at`。
- `oidc_transactions`：`state`（主键）、`nonce`、`code_verifier`、`return_to`、`expires_at`、`created_at`。
- `oidc_exchange_codes`：`code`（主键）、`user_id`、`return_to`、`expires_at`、`consumed_at`、`created_at`。
