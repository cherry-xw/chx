# Pocket ID 多用户认证

**文档创建时间：** 2026-10-30T10:12:22+08:00

状态：待综合验证

计划形式：单页

## 目标、范围与授权

用户已确认全部核心决定并完成第二轮功能调整（受控邀请码注册 + `chery` 管理员专用页面 `/main/admin` + Pocket ID 在线配置与多用户关联）：
- **N1 新建范围**：保留 `workspace/frontend/` 现有页面与视觉体验，在 `workspace/backend/` 重建 SQLite + 认证服务。
- **N2 受控注册与 Pocket ID 多用户关联**：
  - 禁止随意注册，必须使用管理员 `chery` 生成的一次性邀请码才能注册新账号（仅当数据库尚无 `chery` 账号时允许首次免邀请码初始化 `chery` 管理员）。
  - Pocket ID 登录采用“同名/同邮箱自动合并 + `chery` 免邀请码自动创建/合并 + 陌生新用户需输入邀请码激活”。
  - 新增管理员专用页面 `/main/admin`（`chery` 登录后在顶栏显示“管理后台”入口），支持在线配置 Pocket ID 连接参数与生成/管理邀请码。
- **N3 会话与退出**：采用双 Token（`accessToken` + `refreshToken`）自动续期机制，基于 `chery-fetch` 实现无感自动刷新中间件。
- **N4 驱动与配置**：使用 `better-sqlite3` 与环境变量 + SQLite `system_settings` 在线配置。

长期契约与定位入口唯一维护在[多用户认证](../../auth/README.md)，设计背景与决策见[终版设计记录](design.md)。遵循项目服务启动边界：未经用户明确要求不启动开发或预览服务。

## 实施步骤

1. **[1.1—1.5] 后端邀请码受控注册、Pocket ID 在线配置与多用户关联（已完成）**：已完成 `db/sqlite.js`（新增 `invite_codes`、`oidc_pending_registrations`、`system_settings` 表）、`db/authRepo.js`、`utils/oidc.js`（支持动态读取数据库中的 Pocket ID 配置）、`routes/users.js`（受控注册、陌生 OIDC 邀请码激活、`chery` 专属 `/api/admin/*` 接口）及 `tests/auth.test.js`。
2. **[2.1—2.5] 前端邀请码注册、Pocket ID 首次激活与 `/main/admin` 管理员专用页面（已完成）**：已完成 `src/api/auth.ts`、`src/stores/counter.ts`、`src/pages/login/index.vue`（支持邀请码注册与陌生 Pocket ID 邀请码激活）、`src/pages/main/admin/index.vue`、`src/router/main/index.ts`、`src/stores/nav.ts`、`src/components/layer/nav-icons.ts` 与 `src/components/layer/Header.vue`。
3. **[3.1] 综合验证与用户验收（当前步骤）**：自动验证全部通过，等待 wan 人工验收与审批。

## 当前恢复检查点

前后端受控邀请码注册、`/main/admin` 管理员专用页面、Pocket ID 在线配置与多用户同名自动合并/邀请码激活均已完成并通过全部自动验证。下一执行人：wan（执行人工验收并确认是否归档移除本计划）。

## 待处理事项

- 等待 wan 按下方人工验收步骤核对 `chery` 管理员初始化、管理后台配置 Pocket ID 与生成邀请码、普通用户凭邀请码注册及 Pocket ID 登录关联（执行人：wan；触发条件：用户授权启动前后端服务）。

## 验证入口

### 1. 自动验证结果（2026-10-30）

| 编号 | 验证目标 | 命令 | 结论 | 证据（工作区：backend / frontend，产物：无） |
| --- | --- | --- | --- | --- |
| A1 | 后端受控邀请码注册、Pocket ID 在线配置、同名自动合并、陌生 OIDC 邀请码激活与双 Token 轮换 | `npm run test:backend` | 通过 | 退出码 0；4 项综合测试全部通过 |
| A2 | 后端发布包构建 | `npm run build:backend` | 通过 | 退出码 0；`workspace/backend/dist` 生成成功 |
| A3 | 前端类型检查与生产构建 | `npm run build:frontend` | 通过 | 退出码 0；`vue-tsc --build --force` 与 `vite build`（含 `admin` 分包）通过 |
| A4 | 前端首页与主题回归测试 | `npm run test:frontend` | 通过 | 退出码 0；40 项测试全部通过 |
| A5 | 计划文档与链接静态检查 | `npm run plan:lint` | 通过 | 退出码 0；阻断错误 0，待核对 0 |

### 2. 人工验收操作说明（执行人：wan，结论：待执行）

1. **首次初始化 `chery` 管理员**：启动前后端后访问 `/#/login`，点击“有邀请码？凭邀请码注册账号”（当数据库尚无 `chery` 时会自动填入 `chery` 且提示免邀请码），创建 `chery` 管理员并自动登录。
2. **进入管理后台配置 Pocket ID 与生成邀请码**：`chery` 登录后点击顶栏右上角“管理后台”按钮（进入 `/#/main/admin`）：
   - 在“Pocket ID 统一认证配置”卡片填写 `Issuer URL`、`Client ID`、`Client Secret`，复制显示的 `Callback / Redirect URI` 到 Pocket ID 后台，点击“保存 Pocket ID 配置并立即生效”。
   - 在“注册邀请码管理”卡片点击“生成并复制邀请码”，确认新邀请码生成并展示在列表中。
3. **验证 Pocket ID 关联与普通用户受控注册**：
   - 使用 Pocket ID 的 `chery` 账号登录，确认自动合并关联到同一个 `chery` 管理员账号。
   - 使用普通用户凭生成的邀请码注册（或首次通过 Pocket ID 登录并输入邀请码激活），确认无邀请码无法注册、邀请码使用一次后状态变为“已使用”。
