# 页面布局

本领域维护首页、个人服务与 MQTT 工作台的布局和响应式行为，以及应用页签边界、主题外观设置与首屏依赖加载，不定义 MQTT 协议或设备接口。

## 任务定位

| 修改意图 | 代码入口与关键符号 | 验证入口 |
| --- | --- | --- |
| 优化首屏或增加 UI 依赖 | [应用入口](../../workspace/frontend/src/main.ts)；[应用配置](../../workspace/frontend/src/App.vue)：`ElConfigProvider`；[导航图标](../../workspace/frontend/src/components/layer/nav-icons.ts)：`navIcons`；[构建配置](../../workspace/frontend/vite.config.ts)：`resolve.alias` | `npm run build:frontend -- --manifest`；按 manifest 的静态依赖递归统计首页、Header 与入口的 JS/CSS，人工检查中文、深浅主题与页签拖拽 |
| 扩充专题、站点和区块 | [目录数据](../../workspace/frontend/src/data/directory.ts)：`directoryTopics`、`DirectoryCategory.topic`、`directory`；[首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`visibleCategories` | `npm run test:frontend`；专题覆盖、URL 唯一性与搜索人工检查 |
| 调整区块排序与本机恢复 | [布局状态](../../workspace/frontend/src/stores/directory-layout.ts)：`useDirectoryLayoutStore`；[排序工具](../../workspace/frontend/src/utils/directory-order.ts)：`mergeVisibleOrder` | `npm run test:frontend`；拖拽、键盘移动、刷新恢复和新增区块人工检查 |
| 调整首页空间利用率、分类密度 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`.entrance-overview`、`.category-grid`、`.site-grid` | `npm run build:frontend`；宽屏与侧栏切换人工检查 |
| 调整「常用入口」为本地热度驱动 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`computeFeaturedSites`、`recordVisit`；[热度工具](../../workspace/frontend/src/utils/usage-heat.ts)：`readHeat`、`recordHeat` | `npm run test:frontend`；使用一段时间后刷新或切回页签人工检查排序 |
| 调整外部站点与搜索打开方式 | [打开方式状态](../../workspace/frontend/src/stores/link-opening.ts)：`useLinkOpeningStore`；[首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`.opening-mode`；[站点条目](../../workspace/frontend/src/pages/main/entrance/SiteCard.vue)；[顶部搜索](../../workspace/frontend/src/pages/main/entrance/search.vue)：`search` | `npm run test:frontend`；两种打开方式、刷新恢复、跨标签同步与键盘操作人工检查 |
| 调整工作台分栏、报文详情位置 | [工作台样式](../../workspace/frontend/src/pages/main/mqtt/workspace.css)：`.workspace-grid`、`.data-column`、`.monitor-panel.has-selection`；[消息视图](../../workspace/frontend/src/pages/main/mqtt/MessageMonitor.vue) | `npm run build:frontend`；连接区、主题列表、消息详情人工检查 |
| 调整应用可用内容区 | [应用容器](../../workspace/frontend/src/components/layer/container.vue)：`.main-column`；[标签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`.fill-content` | 展开/收起侧栏，检查横向溢出与键盘顺序 |
| 维护首页备案号与版本号 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`.entrance-footer`；[构建配置](../../workspace/frontend/vite.config.ts) | `npm run test:frontend`、`npm run build:frontend`；检查备案号、版本号与页脚提示同行及键盘访问 |
| 调整首页面板与分类聚焦定位 | [首页](../../workspace/frontend/src/pages/main/entrance/index.vue)：`showCategoryDetails`；[条目](../../workspace/frontend/src/pages/main/entrance/SiteCard.vue)：`.site-copy` | `npm run test:frontend`；区块详情打开、关闭与焦点恢复人工检查 |
| 调整固定首页页签 | [标签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`sortableTabs` | `npm run build:frontend`；直接进入其他页面、拖动与关闭页签人工检查 |
| 调整两套主题的层次、文字对比度与交互动效 | [主题令牌](../../workspace/frontend/src/assets/base.css)：`--color-panel-header`、`--color-item-surface`、`--ease-out`；[面板动效](../../workspace/frontend/src/composables/usePanelMotion.ts)：`usePanelMotion`；[条目](../../workspace/frontend/src/pages/main/entrance/SiteCard.vue)；[个人服务页](../../workspace/frontend/src/pages/main/services/index.vue) | `npm run test:frontend`；深浅主题、键盘与减少动态效果人工检查 |
| 调整终端面板、像素颗粒与 CRT 视觉 | [终端遮罩](../../workspace/frontend/src/components/motion/CrtOverlay.vue)：`CrtOverlay`、`crt-tear-filter`；[页签容器](../../workspace/frontend/src/components/layer/TabManage.vue)：`crtPage`；[个人服务页](../../workspace/frontend/src/pages/main/services/index.vue)：`.service-group`、`.group-heading` | `npm run test:frontend`；首页与个人服务页、动效开关、减少动态效果、随机撕裂和深浅主题人工检查 |
| 扩展配色、外观偏好与本机恢复 | [外观状态](../../workspace/frontend/src/stores/counter.ts)：`colorPalettes`、`useModeStore`、`setPalette`；[顶部外观弹层](../../workspace/frontend/src/components/layer/Header.vue)：`appearance-panel`；[首屏恢复](../../workspace/frontend/index.html)；[主题令牌](../../workspace/frontend/src/assets/base.css)：`data-palette` | `npm run test:frontend`；刷新、跨标签同步、六组合与窄屏选择人工检查 |
| 调整服务检索与业务分类筛选 | [个人服务页](../../workspace/frontend/src/pages/main/services/index.vue)：`filteredServices`、`groupedServices`、`categoryFilter`、`masonryColumns`、`serviceIcons` | `npm run build:frontend`；关键词与业务分类组合、空结果、服务图标和原始地址人工检查 |
| 维护内置个人服务及业务分类 | [服务数据](../../workspace/frontend/src/data/personal-services.ts)：`serviceCategories`、`personalServices`、`serviceLinks`；[个人服务页](../../workspace/frontend/src/pages/main/services/index.vue)；[路由](../../workspace/frontend/src/router/main/index.ts)：`services` | `npm run build:frontend`；深浅主题、业务分区与各网络入口人工检查 |
| 调整重点编排、流光与文字反馈 | [重点编排](../../workspace/frontend/src/composables/useAmbientFocus.ts)：`useAmbientFocus`；[边框光效](../../workspace/frontend/src/components/motion/MotionGlow.vue)；[文字反馈](../../workspace/frontend/src/components/motion/MotionText.vue)；[分类图形](../../workspace/frontend/src/components/motion/TopicPulse.vue) | `npm run test:frontend`；静置主次、快速悬浮、长名称与深浅主题人工检查 |
| 调整动效启停与不可见暂停 | [可见性门控](../../workspace/frontend/src/composables/useMotionPresence.ts)：`useMotionPresence`；[动效状态](../../workspace/frontend/src/stores/activity-motion.ts)：`useActivityMotionStore`；[公共页头](../../workspace/frontend/src/components/layer/Header.vue) | `npm run test:frontend`；统一开关、减少动态效果、滚动与页签切换人工检查 |

## 布局边界

各页填满应用内容区，只保留有上限的页边距。响应式依据页面内容宽度进行容器查询，不能只依据屏幕宽度推断页面可用空间。

布局顺序为：应用侧栏确定剩余空间 → 页面建立 inline-size 查询容器 → 首页分类网格与个人服务分类瀑布自动分列、工作台按宽度重排 → 单个卡片约束长文本并允许换行。

首页采用“专题 → 区块 → 站点”三级结构：顶部专题页签组织开发、设计、文档、工具、博客、媒体、ACG 与游戏；每个专题保留多个细分区块；媒体专题包含视频、直播、音乐与新闻阅读，默认将直播紧接视频。全部与专题视图每区块默认最多显示 6 条站点，完整列表由区块“更多”打开详情查看（搜索结果不足 6 条时按实际数量显示）。全部视图采用透明分类外框与有底色站点卡片的紧凑网格；专题视图采用纵向排列的横向分区，标题与贯穿剩余宽度的分割线构成区块边界，区块内站点按从左到右、从上到下自适应多列平铺，并展示完整说明及域名；窄屏降为单列，少量站点保留正常列宽。专题按钮在顶部横向排列，不占用第二条侧栏。个人服务按业务分类分区，分类区块以带外框、内边距与标题栏底色的透明终端容器组成，容器本身不铺底色，服务卡片保留表面底色与边框，按瀑布流多列排布（按 285px 最小列宽与分类数量计算，最多 5 列），每区以分类名称、说明与数量开头，区内采用紧凑面板网格；每个面板集中展示名称、端口、用途与全部访问入口，网络入口仅作为卡片内的访问链接，不再单独组织或筛选。两页使用细边框、低圆角、紧凑行距与有限强调色，以内容密度和清晰分区为首要约束，不使用宣传式大标题、装饰口号或大面积空白。首页与个人服务页的内容视口额外覆盖低透明度像素颗粒、静态扫描线与偶发、随机间隔的水平撕裂带；撕裂带通过 SVG 位移滤镜实际扭曲带内文字和卡片，位置、高度与强度随机，仅在动效开启时短暂出现；关闭动效或减少动态效果时只保留静态纹理。网络入口表示已配置对应地址，不代表服务在线或当前网络可达。MQTT 在宽屏下展示连接、订阅、消息三栏；超宽屏选中消息后，列表与详情并排。窄屏按 DOM 顺序堆叠，CSS 布局切换不重建连接或丢弃表单状态。

AI 专题追加在开发专题之后，包含 AI 服务、AI 测评、AI 对比与 AI 工具四个区块，复用目录的搜索、详情与本机排序能力。服务优先收录国内对话助手及官方模型/API 平台，工具涵盖国内编程代理、工作智能体以及国内外生成式与发现类工具，国内产品优先排列，同时保留常用海外和开源入口；测评收录基准测试与能力榜单，对比收录竞技场及性能、价格对比入口。

新增面板或断点时在各页现有查询容器内扩展，不重新引入页面级固定最大宽度。`min-width: 0` 和网格最小宽度负责防止长主题、地址或报文撑破布局。

专题分区的分割线在鼠标悬停时以 200ms transform/opacity 过渡展开强调色，移出时收回，复用 `--ease-out`；键盘焦点进入区块时即时显示强调线，减少动态效果时仅显示静态强调线。

动效按信息层次分工，而非为每个面板复制同一装饰：常用入口是主要焦点；分类区块使用播放光环、音乐波形、节点、扫描、光标等与内容对应的图形；个人服务使用边框光效与图标反馈。静置时由轻量定时器编排同一页面最多一个可见目标的底光、文字高光和分类图形，不使用常驻 GSAP 时间线；首页以两次常用入口、一次分类区块的节奏轮换，不改变站点热度、排序或服务状态。鼠标进入内容区块或键盘聚焦时停止自动轮换，让主动交互优先。边框流光仅在悬浮当前数据条目时播放，限定到该条目直接拥有的光效层，父区块不联动、不扩散到其他条目；移开即隐藏并暂停，自动轮换不播放边框流光。悬浮文字逐字轻抬、字重叠层及高光只播放一次；静置文字高光仅作用于目标自身的标题或名称。逐字动效在首次拆字时以同一分段布局预留宽高，避免字距与连字差异裁掉末尾字符，不靠字号、布局位移或移除内容突出重点；用途与域名保持静止，正文始终可读。

页头“动效”按钮统一开关本次应用会话的重点编排、持续装饰和文字反馈，不改变原有筛选、主题等交互动效，也不保存到本地。浏览器页面隐藏、应用页签停用或元素离开视口时暂停；首页调整布局、搜索及详情聚焦期间停止自动轮换。系统启用减少动态效果或缺少 IntersectionObserver 时使用静态反馈。所有光效均为装饰，不表示 CPU/内存实测值或服务在线状态。键盘始终保留即时、稳定的焦点轮廓与文字强调，不播放逐字弹跳。

全部站点保留 20px 文字标识及名称、用途同行的紧凑布局，常用入口保留 24px 标识；仅专题与详情条目使用 36px 方形文字标识，配合右侧上下排列的名称与用途，形成两行高度的视觉锚点。专题与详情中的域名占受限列宽，避免挤压标题。标识优先采用可识别的字母或完整常用缩写，三至四字符使用较小字号。鼠标悬停时底色淡入、标识以 160ms transform 过渡放大至 1.06 倍、名称使用强调色；按下时标识复位，移出时平滑恢复。键盘焦点即时显示底色和强调文字，减少动态效果时关闭缩放并保留颜色反馈。

顶部站外搜索使用 Ctrl/⌘ K 聚焦并选中关键词，Enter 提交；首次加载时，桌面端页头搜索自动聚焦关键词输入，触屏设备不主动弹出软键盘。首页站点筛选使用 Ctrl/⌘ Shift K 聚焦并选中关键词，仅在首页激活且未拖拽时生效。Esc 清空当前搜索框内容，详情弹窗中的 Esc 使用原生关闭行为。对应控件直接显示按键提示并声明 `aria-keyshortcuts`，搜索聚焦提示持续可见。快捷键忽略输入法组合输入及其他弹层已处理的事件，原生模态弹窗打开时不把焦点移出弹窗。

“站点导航”顶部的打开方式提供“替换本页 / 新页打开”，默认新页打开。常用入口、全部站点、专题、详情与顶部站外搜索共用 `useLinkOpeningStore`，分别采用 `_self` / `_blank`；搜索替换本页使用当前浏览器标签页导航。选项通过 action 保存到本地键 `chery-link-opening`，同源标签页同步；未知值、清除存储时回退新页打开，存储不可用时本次页面仍可切换。入口、搜索辅助文本与页脚提示同步当前方式。原生链接保留 Ctrl/⌘ 点击、中键及右键菜单的浏览器行为。

## 首屏依赖边界

业务页面保持路由动态导入；首页在空闲或悬停、聚焦个人服务入口时预取该路由分块，不把个人服务加入首屏静态依赖。Element Plus 组件与对应 `element-plus/es/components/<组件>/style/css` 在使用方显式导入，消息和通知服务同样在调用模块导入样式；不在应用入口全量安装组件库或导入完整样式。中文配置由 `App.vue` 的 `ElConfigProvider` 统一提供，基础样式与暗色变量由应用入口加载。

图标由使用方显式导入；导航元数据中的字符串图标通过 `navIcons` 有限映射解析，新增导航图标需同步映射。Slicksort 固定使用 ESM 入口，避免 UMD 的 CommonJS Vue 依赖引入浏览器不需要的模板编译器。首屏体积以入口、Header、首页及其全部静态依赖的去重总量为准，不能只比较入口文件大小。

GSAP 核心通过 [动效加载器](../../workspace/frontend/src/utils/motion-engine.ts) 的 `loadMotionEngine` 动态加载，仅用于文字反馈等交互动效，并在动效允许且有可见目标时请求；静置重点编排使用原生定时器，不启动常驻 GSAP 时间线。不全量引入插件，也不让首页静态依赖携带动画引擎。加载失败保留内容与原生交互。GSAP context 限定组件作用域，卸载时 revert；文字仅在首次鼠标交互时拆字，避免对整个目录预先扩张 DOM。边框与图形优先动画 transform/opacity；文字高光仅对当前重点或悬浮名称执行小范围 background-position 绘制，不对正文或全列表持续重绘。

## 验证

外观有两个独立维度：配色（EL 荧光黄、磷光绿、霓虹紫，默认 EL 荧光黄）与模式（浅色、深色、跟随系统，默认跟随系统）。`useModeStore` 的 actions 修改设置，分别保存到当前站点的 `localStorage` 键 `chery-palette` 与 `chery-theme`；同源标签页通过 `storage` 事件同步。配色通过根元素 `data-palette` 应用，深色通过 `dark` 类应用；`index.html` 在首次绘制前恢复两者。无效或清除后的配色回退 EL 荧光黄，存储不可用时仍可在当前页面切换。新增配色需同时更新状态注册、CSS 深浅令牌、首屏恢复及六组合对比度测试。

首页页签始终打开、固定首位且不可关闭，其他页签在其后排序。首页默认专题及区块按 ACG、游戏、媒体、博客、设计、文档、工具、开发排序，ACG 中动画优先；已有用户排序保留，恢复默认采用此顺序。专题内保留全部匹配区块，各区块统一显示前 6 条，“更多”在原生模态详情中显示该区块全部匹配站点，关闭后焦点返回入口。个人服务由项目内路由渲染，服务按业务分类组织，服务地址独立维护在服务数据中，不依赖原 80 端口导航页或外部导航站；域名、隧道、局域网入口保留各自网络边界，但不再作为页面筛选维度。

区块右上角提供“更多”详情入口，数量展示完整匹配数量。专题内显示区块说明、站点完整用途与域名，全部视图保持紧凑行；长名称通过完整文本提示补充。首页站点目录网格条目默认展示表面底色与细边框，常用入口与详情条目保持无边框、无底色；各站点条目悬停时显现强调色底，键盘焦点保留可见轮廓。两套主题均采用“低饱和底色层次 + 鲜明强调点”的一致设计逻辑：浅色模式使用微染色清透白灰表面与收敛的面板表头/柔和底色，深色模式使用近黑微染色表面与荧光强调色（其中深色 EL 荧光黄使用近黑底与纯黄强调色以提高与磷光绿、霓虹紫的区分度）；`--color-highlight` 用于亮色实心操作，`--color-on-highlight` 为对应可读前景，正文、链接及导航选中态统一使用 `--color-accent` / `--color-accent-soft`。历史持久键 `cobalt`、`terracotta`、`wine` 分别对应 EL 荧光黄、磷光绿、霓虹紫，以兼容已保存偏好；标题、正文、辅助文字和强调色在全部六种深浅组合的实际表面上均需达到 7:1 对比度，实心按钮单独校验前景色。交互动效复用共享 `--ease-out`：鼠标筛选通过 [面板动效](../../workspace/frontend/src/composables/usePanelMotion.ts) 的 `usePanelMotion` 测量前后位置，以 200ms transform/opacity 过渡重排；连续操作从当前可见位置衔接，悬停与按压反馈为 100–160ms；键盘分类操作即时响应，减少动态效果时去掉位移并保留轻量透明度反馈。顶部模式按钮通过 `setTheme` 在支持 View Transition 的浏览器中提供 200ms 透明度过渡；键盘、减少动态效果或不支持该 API 时即时切换。

区块顺序由 `useDirectoryLayoutStore` 的 actions 维护，按稳定区块 ID 存储于 `chery-directory-order`。开启“调整布局”后区块可拖动或使用前移/后移按钮；区块内站点也可拖动或使用前移/后移按钮，且会展开该区块全部匹配站点。站点顺序按区块 ID 独立保存于 `chery-directory-site-order`；搜索时仅替换可见站点位置，隐藏站点相对次序不变。退出调整后每块仅预览前 6 条，完整列表仍可通过“更多”查看。恢复默认同时重置区块和站点顺序。区块和站点排序立即保存，关闭调整模式不撤销。专题与搜索视图排序仅替换当前可见区块在全局顺序中的位置，隐藏区块相对位置保持不变。未知与重复 ID 被忽略，新增加的区块按默认次序追加；无效存储回退默认。存储不可用时继续本页调整并提示不能持久保存，同源标签页同步布局。恢复默认顺序作用于全部区块。拖拽副本保留在目录容器内，只平移、不旋转；禁用原生文字拖动及选择，松手立即结束拖拽。

自动检查入口遵循 [项目配置](../../AGENTS.md)。页面交互、深浅主题和最终视觉验收边界也由该配置定义。人工检查至少覆盖 390、1440、1920、2560、3440 像素视口及侧栏两种状态，确认：两侧仅有页边距、列数变化合理、筛选后少量卡片不被拉成超宽按钮、详情可滚动、页面无横向溢出。

独立专题：无；首页和工作台的业务说明以 [项目配置](../../AGENTS.md) 的领域路由为准。
