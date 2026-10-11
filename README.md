# chx

前端 + 后端 Monorepo 仓库。

- **frontend**：Vue 3 + Vite + TS 前端项目（`workspace/frontend`，分支 `frontend`）
- **backend**：Node/Express 后端项目（`workspace/backend`，分支 `backend`）
- 文档、规范、统一脚本在本分支（`monorepo`）管理；子项目代码由各自分支经 git worktree 挂载到 `workspace/` 下共同开发。

## 初始化

```bash
git clone git@github.com:cherry-xw/chx.git
cd chx
pnpm setup
```

`pnpm setup` 会拉取 frontend / backend 分支到 `workspace/`，并统一安装依赖。

## 常用命令

```bash
pnpm dev           # 前端开发（workspace/frontend）
pnpm dev:backend   # 后端启动（workspace/backend）
pnpm build         # 前端构建
pnpm test          # 前端测试
```

## 仓库结构

```
chx/
├── AGENTS.md / docs/               # 规范与文档（monorepo 分支）
├── scripts/setup.mjs               # 一键初始化脚本
├── workspace/                      # git 忽略；子项目 worktree
│   ├── frontend/                   # frontend 分支（前端代码）
│   └── backend/                    # backend 分支（后端代码）
└── pnpm-workspace.yaml             # workspace 声明
```

## 子项目说明

- 前端细节见 `workspace/frontend/README.md`
- 后端细节见 `workspace/backend/README.md`（或该分支文档）
