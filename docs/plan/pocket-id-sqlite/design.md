# Pocket ID 多用户认证：终版设计记录

文档类型：参考资料

> 状态：已确认终版（2026-10-30）。长期接口与数据表契约唯一维护于[多用户认证](../../auth/README.md)，本文仅记录已确认的技术取舍、边界与验证映射。

## 1. 已确认决定

| 编号 | 决策项 | 用户确认结论 | 设计落点 |
| --- | --- | --- | --- |
| N1 | 新项目范围与旧后端文件 | 保留现有前端 + 重建 SQLite 认证后端 | `workspace/frontend`、`workspace/backend` |
| N2 | 受控注册与邀请码机制 | 禁止随意注册，必须使用管理员 `chery` 生成的邀请码才能注册；`chery` 登录后顶栏显示管理员专用页面入口 | `db/sqlite.js`（`invite_codes`）、`routes/users.js`（`/api/admin/invite-codes`）、`pages/main/admin/index.vue` |
| N3 | Pocket ID 多用户关联与首次配置 | 同名/同邮箱自动合并到已有本地账号；`chery` 通过 Pocket ID 登录直接免邀请码创建/合并管理员账号；其他陌生 Pocket ID 首次登录需输入邀请码激活；管理员专用页面支持在线配置 Pocket ID 参数并存入 SQLite | `db/authRepo.js`、`utils/oidc.js`、`routes/users.js`（`/api/admin/pocket-id`）、`pages/main/admin/index.vue` |
| N4 | 会话生命周期与自动刷新 | 使用双 Token（`accessToken` + `refreshToken`）自动续期，基于 `chery-fetch` 开发无感刷新中间件 | `utils/token.js`、`src/api/middleware/token.ts` |

## 2. 关键流程与边界处理

1. **解决“先有鸡还是先有蛋”的管理员初始化与 Pocket ID 配置闭环**：
   - 当本地数据库尚不存在 `chery` 账号时：允许在 `/#/login` 直接注册用户名为 `chery` 的本地管理员账号（仅此一次免邀请码），或若环境变量已配置 Pocket ID 则可直接用 Pocket ID 的 `chery` 登录自动创建。
   - `chery` 登录后，顶栏 `Header.vue` 展示“管理后台”入口，点击进入 `/main/admin` 管理员专用页面。
   - 在 `/main/admin` 中，`chery` 可在线填写并保存 Pocket ID 的 `Issuer URL`、`Client ID`、`Client Secret`、`Redirect URI`、`Scopes` 到 SQLite `system_settings` 表，立即动态生效。
   - 后续当 `chery` 使用 Pocket ID 登录时，后端检测到 `preferred_username === 'chery'`（或同名/同邮箱），自动将该 Pocket ID 身份合并绑定到本地 `chery` 管理员账号，两边共享同一个 `user_id`。
2. **陌生用户受控注册（本地密码 & Pocket ID）**：
   - 本地密码注册：除首次初始化 `chery` 外，`POST /api/regist` 强制校验并单次消费 `inviteCode`。
   - 陌生 Pocket ID 首次登录：若既未绑定、本地也无同名账号且非 `chery`，回调生成短期 `oidcPending` 票据并跳回 `/#/login?oidcPending=...`，用户在登录页输入邀请码后调用 `POST /api/auth/pocket-id/complete-registration` 完成建号与绑定。

## 3. 需求与验证映射

| 需求项 | 实现入口 | 验证方法 |
| --- | --- | --- |
| 邀请码生成、校验、单次消费与非管理员拦截 | `workspace/backend/db/authRepo.js`、`workspace/backend/routes/users.js` | `npm run test:backend` |
| Pocket ID 在线配置热更新、同名自动合并与陌生账号邀请码激活 | `workspace/backend/utils/oidc.js`、`workspace/backend/routes/users.js` | `npm run test:backend` |
| `/main/admin` 管理员专用页面与顶栏入口 | `workspace/frontend/src/pages/main/admin/index.vue`、`workspace/frontend/src/components/layer/Header.vue` | `npm run build:frontend` + wan 人工验收 |
