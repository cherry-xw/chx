# 多用户认证

本领域维护前后端多用户认证体系：支持本地账号密码登录/注册与 Pocket ID OIDC（Authorization Code + PKCE）登录，后端使用 SQLite（`better-sqlite3`）持久化多用户身份与 Refresh Token 会话，前端基于 `chery-fetch` 洋葱中间件实现双 Token（`accessToken` + `refreshToken`）无感自动刷新。

## 任务定位

| 修改意图 | 代码入口与关键符号 | 验证入口 |
| --- | --- | --- |
| 调整环境变量、端口、SQLite 路径或 Pocket ID OIDC 配置 | [后端配置](../../workspace/backend/config.js)：`loadConfig`；[环境变量模板](../../workspace/backend/.env.example) | `npm run test:backend` |
| 调整 SQLite 建表、多用户存储、OIDC 身份绑定与 Refresh Token 轮换 | [SQLite 数据库层](../../workspace/backend/db/sqlite.js)：`createDatabase`、`initSchema`；[认证仓储](../../workspace/backend/db/authRepo.js)：`createAuthRepository` | `npm run test:backend` |
| 调整双 Token 签发、校验与本地密码/OIDC 路由 | [Token 工具](../../workspace/backend/utils/token.js)：`issueTokenPair`、`verifyAccessToken`、`verifyRefreshToken`；[OIDC 服务](../../workspace/backend/utils/oidc.js)：`createOidcService`；[认证路由](../../workspace/backend/routes/users.js)：`createAuthRouter`；[应用入口](../../workspace/backend/app.js)：`createApp` | `npm run test:backend` |
| 调整前端双 Token 无感刷新中间件与请求封装 | [Token 中间件](../../workspace/frontend/src/api/middleware/token.ts)：`resetToken`、`clearToken`、`tokenRefreshMiddleware`；[API 入口](../../workspace/frontend/src/api/index.ts)：`serve`、`tServe`；[认证 API](../../workspace/frontend/src/api/auth.ts) | `npm run type-check:frontend`、`npm run test:frontend` |
| 调整登录页（本地密码 + Pocket ID）、顶栏用户菜单与用户信息状态 | [登录页](../../workspace/frontend/src/pages/login/index.vue)：`toLogin`、`toPocketIdLogin`；[顶栏](../../workspace/frontend/src/components/layer/Header.vue)：`logout`；[用户状态](../../workspace/frontend/src/stores/counter.ts)：`useUserInfoStore` | `npm run build:frontend`；人工核对本地登录、Pocket ID 登录与退出 |
| 调整后端生产包构建、远程 rsync 推送与 PM2 监听自动重启 | [构建脚本](../../workspace/backend/scripts/build.js)：`build`；[推送脚本](../../workspace/backend/scripts/deploy.js)：`main`；[PM2 配置](../../workspace/backend/ecosystem.config.js)；操作步骤见 [Monorepo 使用指南](../guides/monorepo.md#后端构建推送与服务端自动重启) | `pnpm build:backend`、`npm run test:backend` |

## 核心契约

### 1. 认证接口（统一 `{ data, status, msg }` 响应）

| 接口 | 鉴权 | 说明 |
| --- | --- | --- |
| `GET /api/verifycode` | `serve` | 返回 `{ key, value }` 一次性 AES 传输密钥（短期有效、单次消费） |
| `POST /api/regist` | `serve` | 接收 AES 加密的 `username`、`password` 与 `verifyCodeKey`，创建本地用户并返回 `{ accessToken, refreshToken, user }` |
| `POST /api/login` | `serve` | 接收 AES 加密的 `username`、`password` 与 `verifyCodeKey`，校验密码后签发 `{ accessToken, refreshToken, user }` |
| `GET /api/auth/pocket-id/login` | 浏览器导航 | 生成 `state`、`nonce`、PKCE `code_verifier` 存入 SQLite `oidc_transactions`，302 跳转至 Pocket ID 授权端点 |
| `GET /api/auth/pocket-id/callback` | 浏览器回调 | 校验 `state`、PKCE 与 ID Token，按 `(issuer, subject)` 查找或自动创建本地用户，生成一次性 `oidcCode` 并 302 回 `/#/login?oidcCode=...&from=...` |
| `POST /api/auth/pocket-id/exchange` | `serve` | 消费一次性 `oidcCode`，返回 `{ accessToken, refreshToken, user }`，避免 Token 暴露在 URL 中 |
| `POST /api/refreshToken` | `Authorization: Bearer <refreshToken>` | 校验并轮换 SQLite 中的 Refresh Token，返回新 `{ accessToken, refreshToken }`；失效或已吊销时返回 HTTP 401 |
| `GET /api/userinfo` | `tServe` | 校验 `accessToken`（过期时由 `chery-fetch` 自动触发 `/api/refreshToken` 无感刷新），返回当前登录用户 `user` |
| `POST /api/logout` | `serve` / `tServe` | 吊销当前 Refresh Token（或当前用户关联 Token），前端同步调用 `clearToken()` 与 `userStore.clearUserInfo()` |

### 2. SQLite 数据表

- `users`：`id`（主键）、`username`（唯一，可空用于纯 OIDC 用户）、`name`、`email`、`password_hash`、`auth_provider`、`state`、`created_at`、`updated_at`。
- `oidc_identities`：`id`、`user_id`（外键关联 `users.id`）、`issuer`、`subject`、`email`、`name`、`last_login_at`；唯一约束 `UNIQUE(issuer, subject)`。
- `refresh_tokens`：`jti`（主键）、`user_id`、`expires_at`、`revoked_at`、`replaced_by_jti`、`created_at`。
- `oidc_transactions`：`state`（主键）、`nonce`、`code_verifier`、`return_to`、`expires_at`、`created_at`。
- `oidc_exchange_codes`：`code`（主键）、`user_id`、`return_to`、`expires_at`、`consumed_at`、`created_at`。

### 3. `chery-fetch` 双 Token 自动刷新流程

1. `tServe` 挂载 `tokenRefreshMiddleware` 作为最外层洋葱中间件。
2. 发起请求前读取内存/本机存储中的 `accessToken` 注入 `Authorization` 请求头。
3. 若下游 `core` 返回 HTTP `401` 且当前请求尚未重试，则通过启用了 `useMergeIdenticalRequest: true` 的 `tokenServe` 调用 `POST /api/refreshToken`（携带 `refreshToken`）。
4. 刷新成功后通过 `resetToken` 更新双 Token，并调用 `await next(true)` 重新执行当前洋葱中间件链，无感重放原请求。
5. 若缺失 Token、刷新接口返回失败或重放后仍为 `401`，则调用 `clearToken()` 清空失效凭据并弹出登录提示。
