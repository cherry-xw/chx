# 项目统一入口

## 通用执行基线

- 操作开始前根据下表读取适用规范，并从项目配置的领域路由读取目标模块文档；不得在任务结束后才补读。已读取且未变化的内容无需重复读取。
- 修改代码前判断持久文档影响；契约、边界、稳定入口、关键流程、依赖、扩展方式或验证入口变化时，先更新权威说明。纯局部变化无需制造文档改动。
- 每项事实只有一个权威来源，其他文档链接引用。按任务意图定位到实现路径、关键符号和验证入口。
- 文档、引用和当前恢复信息与实际修改同时更新；不同步不得标记完成。临时文件放系统临时目录或明确的任务验证目录，结束时清理本任务拥有的无用文件。
- README 保持简洁，不复制源码、易变文件树或修复流水账。修改文档时同步索引与引用，检查链接、路径、可达性及计划跟踪状态。
- 小型即时任务无需计划；需要拆分、跨会话恢复或持续跟踪时建立计划。恢复时先读计划总入口，再读总任务 README 和当前小任务文档。

| 触发操作 | 操作前读取 |
| --- | --- |
| 编写持久文档或代码变更影响持久事实 | [内容规范](docs/standards/documentation/content.md) |
| 新增、移动、删除或重新分类文档 | [结构规范](docs/standards/documentation/structure.md) |
| 建立、维护或恢复计划 | [计划规范](docs/standards/documentation/plans.md) |
| 项目尚无文档入口，或现有文档无法可靠定位 | [存量项目梳理指南](docs/standards/documentation/existing-project-guide.md) |

## 项目配置

本区是项目配置的唯一维护位置：通用规则包只定义角色与触发条件，所有项目参数在此填写或由此链接；文档总索引只提供对应导航，不复制本区内容。本区必须包含以下各项，没有对应内容时明确写“无”：

1. **领域路由**：文档总入口为 [docs/README.md](docs/README.md)；首页与 MQTT 的布局、响应式调整直达 [页面布局](docs/frontend/README.md)。其余业务模块从 [开发与提交规范](#7-项目协作规范) 定位，尚未建立独立领域 README；`docs/superpowers/` 为历史资料，不视为现行领域导航。其他缺失路由按存量项目梳理指南渐进补齐。
2. **源码与测试根**：业务代码 `src/`（pages、components、composables、stores、api、utils、data、db、router）；共享代码无独立目录，通用逻辑位于 `src/utils` 与 `src/composables`；生成代码：无；测试根 `tests/`（Node 原生测试，如 `tests/entrance.test.mjs`）。
3. **验证入口**：`npm run test:frontend`（首页与主题回归测试）、`npm run type-check:frontend`（vue-tsc）、`npm run build:frontend`（类型检查+生产构建）、`npm run lint:frontend` / `npm run format:frontend`（ESLint / Prettier）。允许自动化范围：上述命令。
4. **人工验收边界与执行人**：页面交互、深浅主题视觉与对比度（7:1）、多标签页与导航体验、二次确认弹窗等由人工验收；执行人：wan（README 维护者）。
5. **审批人与审批开关**：保留计划规范的用户审批关口；计划进入验收与最终删除前由 wan 审批。
6. **计划台账保留政策**：计划完成并验收后从 `docs/plan/` 与计划总入口移除（按计划规范）；运行产物由 `.gitignore` 忽略（如 `dist/`）；任务临时文件放系统临时目录或明确的任务验证目录，结束时清理本任务拥有的文件。
7. **项目协作规范**：开发规范与 Git 提交规范（读取触发条件：开始修改代码前）：
   - 组件必须使用 `<script setup lang="ts">`，Props/Emits 显式定义类型；组件命名 PascalCase；样式使用 `<style scoped>` 或 Tailwind。
   - TypeScript 禁止 `any`；接口用 `interface`/`type` 显式定义；API 响应类型统一在 `src/api/` 下声明。
   - 路由必须有 `name` 属性（NavStore 映射用）；守卫在 `beforeEach`/`afterEach` 处理进度条与标题；页面组件懒加载。
   - API 统一使用 `serve`（不带 token）或 `tServe`（带 token）创建器，响应格式 `{ data, status, msg }`；错误处理除 token 自动刷新外自行处理。
   - 状态管理使用 Pinia Composition API（`useXxxStore` 命名）；禁止直接修改 state，必须通过 actions。
   - Git 提交规范：`feat` 新功能 / `fix` Bug 修复 / `refactor` 重构 / `style` 样式 / `docs` 文档 / `test` 测试。
8. **文档受管范围**：标准文档根 `docs/`；根入口 `AGENTS.md`；规则包 `docs/standards/documentation/`；工具文档 `docs/standards/documentation/tools/` 与 `tools/plan-viewer/`；归档：暂无；计划目录 `docs/plan/`。
9. **生成文档和外部来源镜像**：无。
10. **计划静态检查入口**：`npm run plan:lint`（`node docs/standards/documentation/tools/lint.mjs --plan-dir=docs/plan`），查看器 `npm run plan:viewer`（`node docs/standards/documentation/tools/plan-viewer.mjs --plan-dir=docs/plan`）。脚本阻断错误（退出码 1），待核对项由人工核对；页面仅展示同一报告，不代替命令行合入限制。
11. **文档元信息**：无。

业务和工具专有规则放在项目配置或模块文档，不能写入通用规则包。生成文档、外部来源镜像和兼容跳转页必须先在项目配置中声明，再接入自动检查。

如果项目路由尚未建立或已经失效，先按存量项目梳理指南进行一次受控探测并建立最小入口；完成后再按正常路由工作。
