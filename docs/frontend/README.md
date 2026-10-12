# 页面布局

本领域维护首页、个人服务与 MQTT 工作台的布局和响应式行为，以及应用页签边界、主题外观设置与首屏依赖加载，不定义 MQTT 协议或设备接口。

## 任务定位

| 修改意图 | 代码入口与关键符号 | 验证入口 |
| --- | --- | --- |
| 优化首屏或增加 UI 依赖 | [应用入口](../../workspace/frontend/src/main.ts)；[应用配置](../../workspace/frontend/src/App.vue)：`ElConfigProvider`；[导航图标](../../workspace/frontend/src/components/layer/nav-icons.ts)：`navIcons`；[构建配置](../../workspace/frontend/vite.config.ts)：`resolve.alias` | `npm run build:frontend -- --manifest`；按 manifest 的静态依赖递归统计首页、Header 与入口的 JS/CSS，人工检查中文、深浅主题与页签拖拽 |
| 调整首页空间利用率、分类密度 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`.entrance-overview`、`.category-grid`、`.site-grid` | `npm run build:frontend`；宽屏与侧栏切换人工检查 |
| 调整「常用入口」为本地热度驱动 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`computeFeaturedSites`、`recordVisit`；[热度工具](../../workspace/frontend/src/utils/usage-heat.ts)：`readHeat`、`recordHeat` | `npm run test:frontend`；使用一段时间后刷新或切回页签人工检查排序 |
| 调整工作台分栏、报文详情位置 | [工作台样式](../../workspace/frontend/src/pages/main/mqtt/workspace.css)：`.workspace-grid`、`.data-column`、`.monitor-panel.has-selection`；[消息视图](../../workspace/frontend/src/pages/main/mqtt/MessageMonitor.vue) | `npm run build:frontend`；连接区、主题列表、消息详情人工检查 |
| 调整应用可用内容区 | [应用容器](../../workspace/frontend/src/components/layer/container.vue)：`.main-column`；[标签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`.fill-content` | 展开/收起侧栏，检查横向溢出与键盘顺序 |
| 调整固定首页页签 | [标签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`sortableTabs` | `npm run build:frontend`；直接进入其他页面、拖动与关闭页签人工检查 |
| 扩展配色、外观偏好与本机恢复 | [外观状态](../../workspace/frontend/src/stores/counter.ts)：`colorPalettes`、`useModeStore`、`setPalette`；[顶部外观弹层](../../workspace/frontend/src/components/layer/Header.vue)：`appearance-panel`；[首屏恢复](../../workspace/frontend/index.html)；[主题令牌](../../workspace/frontend/src/assets/base.css)：`data-palette` | `npm run test:frontend`；刷新、跨标签同步、六组合与窄屏选择人工检查 |
| 调整服务检索与访问方式筛选 | [个人服务页](../../workspace/frontend/src/pages/main/services/index.vue)：`filteredServices`、`accessFilter`、`serviceIcons` | `npm run build:frontend`；关键词与访问方式组合、空结果、服务图标和原始地址人工检查 |
| 维护内置个人服务及访问方式 | [服务数据](../../workspace/frontend/src/data/personal-services.ts)：`personalServices`、`serviceLinks`；[个人服务页](../../workspace/frontend/src/pages/main/services/index.vue)；[路由](../../workspace/frontend/src/router/main/index.ts)：`services` | `npm run build:frontend`；深浅主题、各网络入口人工检查 |

## 布局边界

各页填满应用内容区，只保留有上限的页边距。响应式依据页面内容宽度进行容器查询，不能只依据屏幕宽度推断页面可用空间。

布局顺序为：应用侧栏确定剩余空间 → 页面建立 inline-size 查询容器 → 首页分类网格自动分列、工作台按宽度重排 → 单个卡片约束长文本并允许换行。

首页在宽屏下并排展示主视觉与常用入口；分类与站点网格随空间增加列数。个人服务采用紧凑面板网格，每个面板集中展示名称、端口、用途与全部访问入口；网络信息收拢为底部横向面板。两页使用细边框、低圆角、紧凑行距与有限强调色，以内容密度和清晰分区为首要约束，不使用宣传式大标题、装饰口号或大面积空白。筛选表示配置了相应入口，不代表服务在线或当前网络可达。MQTT 在宽屏下展示连接、订阅、消息三栏；超宽屏选中消息后，列表与详情并排。窄屏按 DOM 顺序堆叠，CSS 布局切换不重建连接或丢弃表单状态。

新增面板或断点时在各页现有查询容器内扩展，不重新引入页面级固定最大宽度。`min-width: 0` 和网格最小宽度负责防止长主题、地址或报文撑破布局。

## 首屏依赖边界

业务页面保持路由动态导入。Element Plus 组件与对应 `element-plus/es/components/<组件>/style/css` 在使用方显式导入，消息和通知服务同样在调用模块导入样式；不在应用入口全量安装组件库或导入完整样式。中文配置由 `App.vue` 的 `ElConfigProvider` 统一提供，基础样式与暗色变量由应用入口加载。

图标由使用方显式导入；导航元数据中的字符串图标通过 `navIcons` 有限映射解析，新增导航图标需同步映射。Slicksort 固定使用 ESM 入口，避免 UMD 的 CommonJS Vue 依赖引入浏览器不需要的模板编译器。首屏体积以入口、Header、首页及其全部静态依赖的去重总量为准，不能只比较入口文件大小。

## 验证

外观有两个独立维度：配色（EL 荧光黄、青柠绿、霓虹紫，默认 EL 荧光黄）与模式（浅色、深色、跟随系统，默认跟随系统）。`useModeStore` 的 actions 修改设置，分别保存到当前站点的 `localStorage` 键 `chery-palette` 与 `chery-theme`；同源标签页通过 `storage` 事件同步。配色通过根元素 `data-palette` 应用，深色通过 `dark` 类应用；`index.html` 在首次绘制前恢复两者。无效或清除后的配色回退 EL 荧光黄，存储不可用时仍可在当前页面切换。新增配色需同时更新状态注册、CSS 深浅令牌、首屏恢复及六组合对比度测试。

首页页签始终打开、固定首位且不可关闭，其他页签在其后排序。个人服务由项目内路由渲染，服务地址独立维护在服务数据中，不依赖原 80 端口导航页或外部导航站；域名、隧道、局域网入口保留各自网络边界。

配色使用清透高明度表面与鲜明强调色；`--color-highlight` 用于亮色实心操作和面板标识，`--color-on-highlight` 为对应可读前景，正文与链接使用深色（深色模式使用亮色）令牌。历史持久键 `cobalt`、`terracotta`、`wine` 分别对应 EL 荧光黄、青柠绿、霓虹紫，以兼容已保存偏好；标题、正文、辅助文字和强调色在全部六种深浅组合的实际表面上均需达到 7:1 对比度，实心按钮单独校验前景色。

自动检查入口遵循 [项目配置](../../AGENTS.md)。页面交互、深浅主题和最终视觉验收边界也由该配置定义。人工检查至少覆盖 390、1440、1920、2560、3440 像素视口及侧栏两种状态，确认：两侧仅有页边距、列数变化合理、筛选后少量卡片不被拉成超宽按钮、详情可滚动、页面无横向溢出。

独立专题：无；首页和工作台的业务说明以 [项目配置](../../AGENTS.md) 的领域路由为准。
