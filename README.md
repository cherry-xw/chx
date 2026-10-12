# chery-web

首页导航 Demo：启动 `npm run dev` 后打开 `/#/main/entrance`。

- 60 个站点分为 ACG 社区、动漫番剧、视频平台、综合搜索、番剧资讯、漫画阅读、插画与创作、音乐与电台、游戏与同人、导航与发现，支持分类筛选。分类栏随页面滚动吸顶，小屏可横向滚动分类按钮。
- 站点标题 15px、说明 13px，深浅两套主题的正文与辅助文字在首页主要背景上的对比度至少为 7:1。
- 定期更新的动漫背景暂未接入；后续需先确定图片来源、更新方式与必要的后端缓存。当前名单未做在线可达性核验。
- 搜索位于标题栏，可切换引擎；按 `Ctrl+K`（macOS 为 `⌘K`）聚焦，回车或点击按钮搜索。
- 标题栏的太阳、月亮、显示器按钮分别选择浅色、深色、跟随系统，选择保存在本地。
- 站点配置位于 `src/data/directory.ts`，搜索引擎配置位于 `src/data/search-engines.ts`。
- `npm run test:entrance` 运行首页与主题回归测试（Node.js 24）；`npm run build` 执行类型检查与生产构建。

## 部署

`npm run deploy` 一键部署到服务器：本地构建（`npm run build`）后通过 rsync 将 `dist/` 同步到服务器（`--delete` 全量镜像）。

- 服务器连接信息在 `.env` 中配置（模板 `.env.example`，已 git 忽略不提交）：`DEPLOY_HOST / DEPLOY_USER / DEPLOY_PORT / DEPLOY_PASSWORD / DEPLOY_REMOTE_DIR`。
- 认证：`.env` 不填 `DEPLOY_PASSWORD` 时使用 SSH 密钥 / ssh-agent（推荐，需先配置免密登录）；填写密码则走 `sshpass`，本机需安装 sshpass。
- 首次连接会自动接受服务器指纹；如服务器为固定 IP 建议改用 `ssh-keyscan` 预置 known_hosts。
- ⚠️ 部署目标必须是公网服务器（本项目部署到 www.xcherry.top）。脚本内置安全校验，会拦截本机/局域网地址（127.x / 10.x / 172.16-31.x / 192.168.x / 169.254.x）——本地 10.2.3.6:80 是独立项目的专门页面，与本项目互不相关，且 `--delete` 会清空目标目录，切勿指向。

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
