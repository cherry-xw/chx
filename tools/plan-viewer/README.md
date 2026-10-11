# Plan Viewer（独立开发工具）

仅开发环境使用的计划追踪页面：读取 `docs/plan/` 下的计划文档，可视化展示各计划的状态、任务台账与完成进度。

> **与主项目零关联**：本目录自带独立 `package.json`，不参与主项目的构建、测试与依赖体系；对 `docs/plan` 只读。

## 环境依赖

| 依赖项 | 要求 | 说明 |
|-------|------|------|
| Node.js | **≥ 20**（唯一依赖） | 仅使用内置模块（http / fs / path / zlib 等），无需任何 npm install |
| 操作系统 | 跨平台 | Windows / Linux / macOS 均可（路径处理统一走 `path` 模块） |
| 网络 | 仅 localhost | 页面与服务都在本机，不访问外网 |
| 磁盘 | 对 `docs/plan` 只读 | 任何文件都不写入数据目录 |

安装 = 拷贝文件 + 有 Node，无其他步骤；重新构建（仅改源码时需要）同样只用 Node 内置模块。

## 启动

```bash
# 仓库根快捷指令（推荐；直接以源码模式启动，不依赖构建产物）
pnpm plan

# 等价的目录内指令
pnpm --dir tools/plan-viewer start

# 自定义端口（默认 4173）
pnpm plan -- --port=5000
# 指定数据目录（拷贝到其他仓库使用时）
node plan-viewer.mjs --plan-dir=/path/to/repo/docs/plan
```

无需安装任何依赖（仅 Node 内置模块，node ≥ 20）。服务只绑定 IPv4 回环地址 `127.0.0.1`；启动后访问 `http://127.0.0.1:4173`，刷新页面即读取最新文档。

## 双形态结构

```
tools/plan-viewer/
├── public/            # Web 源码（index.html / app.js / style.css）
├── server.mjs         # 服务源码：API + 解析器（源码模式直接读 public/）
├── build.mjs          # 构建：public/ 压缩(gzip+base64)注入 → 单文件产物
├── plan-viewer.mjs    # 单文件产物：可直接 node 启动，可拷贝到任意位置独立使用
├── package.json       # start=产物 / dev=源码 / build
└── README.md
```

- **本地运行只走源码**：`pnpm plan` / `pnpm plan:lint` 直接执行 `server.mjs` / `lint-source.mjs`，改 `public/` 后刷新页面即生效，无需构建。
- **改页面**：修改 `public/` 后直接刷新；只有要更新可分发产物时才 `node build.mjs`（`pnpm --dir tools/plan-viewer build`）。
- **分发**：产物 `plan-viewer.mjs` 是唯一需要的文件；`docs/plan` 定位：`--plan-dir` > 环境变量 `PLAN_DIR` > 从脚本位置向上逐级查找。
- **同步可迁移包**：发布新通用包时运行构建，同时生成本目录及 `docs/standards/documentation/tools/` 的查看器和 lint 单文件产物。`lint-source.mjs`、`server.mjs` 和 `public/` 是源码；不要手改生成脚本。构建不更新 ZIP。

## 功能

- **总览**：对总入口与实际目录的并集做状态统计并展示计划卡片（进度条、子任务完成数、范围摘要）；总入口已登记但目录缺失的计划灰显提示。按当前规范批准完成的计划应从总入口和计划目录删除。
- **任务详情**：渲染计划 README（台账表格带状态徽标、checkbox 勾选态），关联文档以左侧目录树列出。
- **子任务文件**：点开左侧目录树或台账/正文中引用的任意 `.md`（含 `verify/` 手册），文档内相对链接可继续跳转。章节定位使用 `#/file/<path>?anchor=<章节>` 或 `#/plan/<dir>?anchor=<章节>`，刷新、前进和后退保留文档与章节；旧请求不得覆盖当前路由。
- **左侧目录树**：只列当前计划目录内的关联文档（排除计划自身 README），每项两行——第一行文件名，第二行取该文档正文首个一级标题（缺标题时退回 README 中的链接文字）。当前打开的文档高亮且不可点；总览视图不显示侧栏。
- 数据每次请求实时读盘，无缓存无构建。

## 静态检查与差异展示

`pnpm plan:lint` 与页面 API 共享 `audit.mjs`。总览显示登记数、实际任务目录数和文档数，任务卡显示入口状态与文档状态；未登记任务仍展示。差异区按阻断错误和待核对筛选，列出位置、两边值及修正方式，支持重新检查。详情显示台账关联文件、实际小任务文件、全部文档和入口可达文档数量。

台账统计优先于手写进度；手写进度与台账不同时报告阻断错误。研究资料、验证手册和远期任务不机械计入同一种文件数。页面不会自动写入状态或删除文件。

```sh
pnpm plan:lint
node tools/plan-viewer/lint-source.mjs --json
node tools/plan-viewer/lint-source.mjs --strict
```

使用场景、检查规则及退出码由[静态检查说明](../../docs/standards/documentation/plan-checks.md)维护。错误阻止静态校验通过，待核对项始终报告；业务完成和用户批准不能由脚本推断。

## 通用 ZIP

运行 `python3 tools/plan-viewer/package-kit.py --output=/tmp/plan-management-kit.zip`。打包器先生成独立工具，再按明确文件清单加入规则、源码、测试和演示计划；不包含本仓库真实任务或运行资料。附带文件 SHA-256 清单及 ZIP 校验文件。部署和解压使用见[通用包说明](../../docs/standards/documentation/tools/README.md)。

## 实现与验证入口

一致性检查由 [audit.mjs](audit.mjs) 唯一维护，CLI、服务及仓库检查均消费其报告。共享 Markdown 解析位于 [public/markdown.js](public/markdown.js)（`findTables`、`extractLinks`、`metadataValue`）；HTTP 入口为 [server.mjs](server.mjs)，lint 源码为 [lint-source.mjs](lint-source.mjs)。路由和请求有效期由 [public/navigation.js](public/navigation.js) 维护，页面渲染从 [public/app.js](public/app.js) 进入。

修改 `public/` 后刷新页面即可在本地看到变化，无需构建。改 `server.mjs` / `lint-source.mjs` 时同步跑一次 `node tools/plan-viewer/build.mjs` 重生成 `plan-viewer.mjs` / `lint.mjs` 与 `docs/standards/documentation/tools/` 下同名产物（发布新通用包前必须做此同步，分发前所有产物应保持一致）。再运行 `node --test tools/plan-viewer/tests/*.test.mjs` 和 `pnpm plan:lint`。独立测试只使用 Node 内置模块、隔离临时数据及 HTTP，不启动浏览器，也不使用 DOM/CSS 检查替代界面验收。真实导航与滚动由用户手动验收。

## 边界

- 页面仅允许读取 `docs/plan/` 内的 `.md` 文件（`/api/file` 检查路径和真实目标）；检查器可核对明确引用的项目内文件及 Markdown 章节，不读取业务源码正文。指向 `docs/plan` 外部的文档链接以虚线样式提示、不可跳转。
- 解析器遇到异构台账仍展示资料；共享检查明确报告非法状态、缺失文件等差异，不静默判为通过。
- 启动报端口占用时：`pnpm kill:ports`，或换端口 `pnpm plan -- --port=5000`。
