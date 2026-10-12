# Monorepo 使用指南

> 角色：指南。面向任务的日常操作方法；项目配置与验证边界以 [AGENTS.md](../../AGENTS.md) 为准。

本仓库是 monorepo：一个仓库（`chx`）下通过 git worktree 挂载前端、后端两个子项目，共同开发、共同管理。

## 1. 仓库结构

```
chx/
├── AGENTS.md / docs/               # 规范与文档（monorepo 分支维护）
├── scripts/setup.mjs               # 一键初始化脚本
├── pnpm-workspace.yaml             # pnpm workspace 声明
├── workspace/                      # git 忽略；由 worktree 挂载，不直接入库
│   ├── frontend/                   # frontend 分支（Vue3 前端）
│   └── backend/                    # backend 分支（Node/Express 后端）
```

| 分支 | 内容 | 维护位置 |
| --- | --- | --- |
| `monorepo` | 规范文档、workspace 配置、统一脚本 | 仓库根（clone 默认分支） |
| `frontend` | 前端代码 | `workspace/frontend/` |
| `backend` | 后端代码 | `workspace/backend/` |

`workspace/` 已被 `.gitignore` 忽略，子项目代码由各自分支管理，通过 `git worktree` 挂载到工作区，因此三个分支的代码可以在同一个文件夹下同时编辑。

## 2. 拉取项目

```bash
# 拉取仓库（默认检出 monorepo 分支）
git clone git@github.com:cherry-xw/chx.git
cd chx
```

## 3. 初始化项目（一键）

```bash
pnpm setup
```

该命令会：
1. 用 `git worktree` 把 `frontend`、`backend` 分支挂载到 `workspace/` 下（已挂载则跳过）
2. 统一安装全部依赖（pnpm workspace）

> 需要 pnpm 9+：`npm i -g pnpm@9`。脚本幂等，重复执行安全。

## 4. 日常开发命令（仓库根执行）

命令统一为 `动作:目标` 命名：`dev`/`build`/`test`/`lint`/`format` 等动作 + `frontend`/`backend` 目标，全部在仓库根执行。

| 命令 | 作用 | 实际执行位置 |
| --- | --- | --- |
| `pnpm dev:frontend` | 启动前端开发服务器 | `workspace/frontend` |
| `pnpm dev:backend` | 启动后端服务（nodemon） | `workspace/backend` |
| `pnpm build:frontend` | 前端类型检查 + 生产构建 | `workspace/frontend` |
| `pnpm type-check:frontend` | 前端类型检查（vue-tsc） | `workspace/frontend` |
| `pnpm test:frontend` | 前端回归测试 | `workspace/frontend`（`test:entrance`） |
| `pnpm lint:frontend` / `pnpm format:frontend` | ESLint / Prettier | `workspace/frontend` |
| `pnpm preview:frontend` | 预览生产构建 | `workspace/frontend` |
| `pnpm deploy:frontend` / `pnpm deploy:backend` | 前端 rsync 部署 / 后端 pm2 部署 | `workspace/frontend` / `workspace/backend` |

### 子项目内单独操作

前端 / 后端也可以直接进入子目录操作：

```bash
cd workspace/frontend
npm run dev        # 前端开发
npm run build      # 前端构建
npm run test:entrance  # 前端测试
npm run lint       # ESLint
npm run format     # Prettier

cd workspace/backend
npm run serve      # 启动后端（nodemon ./bin/www）
npm run dispose    # pm2 部署
```

## 5. 各分支开发流程

三个分支代码在同一个文件夹下,但 git 操作要在**对应分支的工作区**内进行:

```bash
# 前端改动（在 workspace/frontend 内操作，分支是 frontend）
cd workspace/frontend
git add -A && git commit -m "feat: ..."
git push

# 后端改动（在 workspace/backend 内操作，分支是 backend）
cd workspace/backend
git add -A && git commit -m "feat: ..."
git push

# 规范/文档/配置改动（在仓库根操作，分支是 monorepo）
cd ../..
git add -A && git commit -m "docs: ..."
git push
```

> 不要跨目录提交:每个 worktree 只认自己分支的文件,在根目录提交 `workspace/` 里的改动不会生效(已被忽略)。

## 6. 更新其他分支

前端/后端分支的代码由各自的 worktree 检出,更新时:

```bash
# 在对应子项目目录内拉取该分支的最新代码
cd workspace/frontend
git pull

cd workspace/backend
git pull
```

## 7. 常见问题

### 重新初始化/挂载失败的 worktree

```bash
# 查看当前 worktree 列表
git worktree list

# 移除某个子项目 worktree（不影响代码，分支仍存在）
git worktree remove workspace/frontend

# 删除分支（如需）
git branch -D frontend
```

### 修改 monorepo 配置（如新增子项目）

1. 编辑 `pnpm-workspace.yaml`,添加新目录
2. 编辑 `scripts/setup.mjs` 的 `SUB_PROJECTS`,配置分支与目录
3. 在仓库根提交并推送 monorepo 分支
