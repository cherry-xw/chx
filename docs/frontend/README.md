# 页面布局

本领域维护首页与 MQTT 工作台的布局和响应式行为，不定义 MQTT 协议、设备接口或主题偏好。

## 任务定位

| 修改意图 | 代码入口与关键符号 | 验证入口 |
| --- | --- | --- |
| 调整首页空间利用率、分类密度 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`.entrance-overview`、`.category-grid`、`.site-grid` | `npm run build`；宽屏与侧栏切换人工检查 |
| 调整「常用入口」为本地热度驱动 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`computeFeaturedSites`、`recordVisit`；[热度工具](../../workspace/frontend/src/utils/usage-heat.ts)：`readHeat`、`recordHeat` | `npm run test:entrance`；使用一段时间后刷新或切回页签人工检查排序 |
| 调整工作台分栏、报文详情位置 | [工作台样式](../../workspace/frontend/src/pages/main/mqtt/workspace.css)：`.workspace-grid`、`.data-column`、`.monitor-panel.has-selection`；[消息视图](../../workspace/frontend/src/pages/main/mqtt/MessageMonitor.vue) | `npm run build`；连接区、主题列表、消息详情人工检查 |
| 调整应用可用内容区 | [应用容器](../../workspace/frontend/src/components/layer/container.vue)：`.main-column`；[标签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`.fill-content` | 展开/收起侧栏，检查横向溢出与键盘顺序 |

## 布局边界

两页填满应用内容区，只保留有上限的页边距。响应式依据页面内容宽度进行容器查询，不能只依据屏幕宽度推断页面可用空间。

布局顺序为：应用侧栏确定剩余空间 → 页面建立 inline-size 查询容器 → 首页分类网格自动分列、工作台按宽度重排 → 单个卡片约束长文本并允许换行。

首页在宽屏下并排展示主视觉与常用入口；分类与站点网格随空间增加列数。MQTT 在宽屏下展示连接、订阅、消息三栏；超宽屏选中消息后，列表与详情并排。窄屏按 DOM 顺序堆叠，CSS 布局切换不重建连接或丢弃表单状态。

新增面板或断点时在各页现有查询容器内扩展，不重新引入页面级固定最大宽度。`min-width: 0` 和网格最小宽度负责防止长主题、地址或报文撑破布局。

## 验证

自动检查入口遵循 [项目配置](../../AGENTS.md)。页面交互、深浅主题和最终视觉验收边界也由该配置定义。人工检查至少覆盖 390、1440、1920、2560、3440 像素视口及侧栏两种状态，确认：两侧仅有页边距、列数变化合理、筛选后少量卡片不被拉成超宽按钮、详情可滚动、页面无横向溢出。

独立专题：无；首页和工作台的业务说明以 [项目配置](../../AGENTS.md) 的领域路由为准。
