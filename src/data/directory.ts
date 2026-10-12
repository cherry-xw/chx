export interface DirectorySite {
  name: string
  description: string
  url: string
  mark: string
  color: string
}

export type DirectoryIcon =
  | 'community'
  | 'anime'
  | 'video'
  | 'search'
  | 'news'
  | 'manga'
  | 'art'
  | 'music'
  | 'game'
  | 'directory'

export const directoryTopics = [
  { id: 'acg', name: 'ACG', caption: '动画、漫画与同好社区', icon: 'anime' },
  { id: 'games', name: '游戏', caption: '游戏平台、资讯与创作', icon: 'game' },
  { id: 'media', name: '媒体', caption: '视频、音乐与新闻阅读', icon: 'video' },
  { id: 'blogs', name: '博客', caption: '技术写作、独立观点与社区', icon: 'community' },
  { id: 'design', name: '设计', caption: '界面灵感、素材与创作', icon: 'art' },
  { id: 'documentation', name: '文档', caption: '语言、框架与工程手册', icon: 'manga' },
  { id: 'tools', name: '工具', caption: '检索、转换与日常效率', icon: 'search' },
  { id: 'development', name: '开发', caption: '代码托管、调试与交付', icon: 'directory' }
] as const satisfies ReadonlyArray<{
  id: string
  name: string
  caption: string
  icon: DirectoryIcon
}>

export type DirectoryTopicId = (typeof directoryTopics)[number]['id']

export interface DirectoryCategory {
  id: string
  topic: DirectoryTopicId
  name: string
  caption: string
  icon: DirectoryIcon
  sites: DirectorySite[]
}

const directoryEntries: DirectoryCategory[] = [
  {
    id: 'code-hosting',
    topic: 'development',
    name: '代码与协作',
    caption: '仓库、包管理与开发者问答',
    icon: 'directory',
    sites: [
      {
        name: 'GitHub',
        description: '代码托管、议题与开源项目协作',
        url: 'https://github.com/',
        mark: 'GH',
        color: '#ffe600'
      },
      {
        name: 'GitLab',
        description: '代码仓库与持续集成平台',
        url: 'https://gitlab.com/',
        mark: 'GL',
        color: '#44d9ff'
      },
      {
        name: 'Gitee',
        description: '中文代码托管与开源项目社区',
        url: 'https://gitee.com/',
        mark: 'Gi',
        color: '#b3ff3b'
      },
      {
        name: 'Codeberg',
        description: '基于 Forgejo 的代码托管社区',
        url: 'https://codeberg.org/',
        mark: 'CB',
        color: '#ff83cf'
      },
      {
        name: 'npm',
        description: 'JavaScript 软件包检索与发布',
        url: 'https://www.npmjs.com/',
        mark: 'npm',
        color: '#bc9aff'
      },
      {
        name: 'npmx',
        description: '快速浏览与搜索 npm 软件包',
        url: 'https://npmx.dev/',
        mark: 'nx',
        color: '#ffe600'
      },
      {
        name: 'PyPI',
        description: 'Python 软件包索引与分发',
        url: 'https://pypi.org/',
        mark: 'Py',
        color: '#ffb747'
      },
      {
        name: 'crates.io',
        description: 'Rust 社区软件包仓库',
        url: 'https://crates.io/',
        mark: 'Cr',
        color: '#5effc1'
      },
      {
        name: 'Stack Overflow',
        description: '编程问题、解答与经验检索',
        url: 'https://stackoverflow.com/',
        mark: 'SO',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'browser-playgrounds',
    topic: 'development',
    name: '在线开发',
    caption: '快速试验、复现问题与分享代码',
    icon: 'directory',
    sites: [
      {
        name: 'CodePen',
        description: 'HTML、CSS 与 JavaScript 在线演示',
        url: 'https://codepen.io/',
        mark: 'CP',
        color: '#ffe600'
      },
      {
        name: 'StackBlitz',
        description: '在浏览器中运行前端项目',
        url: 'https://stackblitz.com/',
        mark: 'SB',
        color: '#44d9ff'
      },
      {
        name: 'CodeSandbox',
        description: '云端开发环境与项目预览',
        url: 'https://codesandbox.io/',
        mark: 'CS',
        color: '#b3ff3b'
      },
      {
        name: 'JSFiddle',
        description: '网页代码片段的编辑与运行',
        url: 'https://jsfiddle.net/',
        mark: 'JS',
        color: '#ff83cf'
      },
      {
        name: 'Replit',
        description: '云端编程环境与应用构建',
        url: 'https://replit.com/',
        mark: 'Re',
        color: '#bc9aff'
      },
      {
        name: 'Gitpod',
        description: '云端开发环境与工作区',
        url: 'https://www.gitpod.io/',
        mark: 'GP',
        color: '#ffb747'
      },
      {
        name: 'TypeScript Playground',
        description: '在线试验类型、编译输出与语言选项',
        url: 'https://www.typescriptlang.org/play/',
        mark: 'TS',
        color: '#5effc1'
      },
      {
        name: 'Observable',
        description: '交互式数据分析与可视化笔记',
        url: 'https://observablehq.com/',
        mark: 'Ob',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'delivery-platforms',
    topic: 'development',
    name: '部署与后端',
    caption: '托管、数据库与应用交付',
    icon: 'directory',
    sites: [
      {
        name: 'Vercel',
        description: '前端应用部署与预览环境',
        url: 'https://vercel.com/',
        mark: 'Ve',
        color: '#ffe600'
      },
      {
        name: 'Netlify',
        description: 'Web 应用托管与自动部署',
        url: 'https://www.netlify.com/',
        mark: 'Ne',
        color: '#44d9ff'
      },
      {
        name: 'Cloudflare',
        description: '网络服务、Workers 与网站托管',
        url: 'https://www.cloudflare.com/',
        mark: 'CF',
        color: '#b3ff3b'
      },
      {
        name: 'Supabase',
        description: 'Postgres 数据库、认证与存储',
        url: 'https://supabase.com/',
        mark: 'Su',
        color: '#ff83cf'
      },
      {
        name: 'Firebase',
        description: '应用后端、托管与开发工具',
        url: 'https://firebase.google.com/',
        mark: 'Fi',
        color: '#bc9aff'
      },
      {
        name: 'Railway',
        description: '应用服务与数据库部署',
        url: 'https://railway.com/',
        mark: 'Ra',
        color: '#ffb747'
      },
      {
        name: 'Render',
        description: 'Web 服务、任务与数据库托管',
        url: 'https://render.com/',
        mark: 'Rn',
        color: '#5effc1'
      },
      {
        name: 'Docker Hub',
        description: '容器镜像检索与分发',
        url: 'https://hub.docker.com/',
        mark: 'DH',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'debugging-tools',
    topic: 'development',
    name: '调试与代码检查',
    caption: '接口、正则、兼容性与性能',
    icon: 'search',
    sites: [
      {
        name: 'Postman',
        description: 'API 请求调试与团队接口协作',
        url: 'https://www.postman.com/',
        mark: 'Po',
        color: '#ffe600'
      },
      {
        name: 'Hoppscotch',
        description: '在浏览器中构建与调试 API 请求',
        url: 'https://hoppscotch.io/',
        mark: 'Ho',
        color: '#44d9ff'
      },
      {
        name: 'ReqBin',
        description: '在线发送 HTTP 请求与检查响应',
        url: 'https://reqbin.com/',
        mark: 'RB',
        color: '#b3ff3b'
      },
      {
        name: 'regex101',
        description: '正则表达式调试、解释与示例',
        url: 'https://regex101.com/',
        mark: 'Rx',
        color: '#ff83cf'
      },
      {
        name: 'RegExr',
        description: '正则表达式交互测试与参考',
        url: 'https://regexr.com/',
        mark: 'Rr',
        color: '#bc9aff'
      },
      {
        name: 'Can I use',
        description: '查询浏览器对 Web 特性的支持',
        url: 'https://caniuse.com/',
        mark: 'Ci',
        color: '#ffb747'
      },
      {
        name: 'PageSpeed Insights',
        description: '分析网页加载性能与体验指标',
        url: 'https://pagespeed.web.dev/',
        mark: 'PS',
        color: '#5effc1'
      },
      {
        name: 'Bundlephobia',
        description: '查看 npm 包体积与依赖信息',
        url: 'https://bundlephobia.com/',
        mark: 'Bp',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'interface-inspiration',
    topic: 'design',
    name: '界面与灵感',
    caption: '产品界面、作品集与设计案例',
    icon: 'art',
    sites: [
      {
        name: 'Figma',
        description: '协作式界面设计与交互原型',
        url: 'https://www.figma.com/',
        mark: 'Fi',
        color: '#ffe600'
      },
      {
        name: 'Penpot',
        description: '开源界面设计与原型协作',
        url: 'https://penpot.app/',
        mark: 'Pe',
        color: '#44d9ff'
      },
      {
        name: 'Dribbble',
        description: '设计师作品、界面与视觉灵感',
        url: 'https://dribbble.com/',
        mark: 'Dr',
        color: '#b3ff3b'
      },
      {
        name: 'Behance',
        description: '创意作品集与设计项目展示',
        url: 'https://www.behance.net/',
        mark: 'Be',
        color: '#ff83cf'
      },
      {
        name: 'Awwwards',
        description: '网站设计案例与行业评选',
        url: 'https://www.awwwards.com/',
        mark: 'Aw',
        color: '#bc9aff'
      },
      {
        name: 'Mobbin',
        description: '移动与网页产品的界面参考',
        url: 'https://mobbin.com/',
        mark: 'Mo',
        color: '#ffb747'
      },
      {
        name: 'SiteInspire',
        description: '精选网站设计与分类浏览',
        url: 'https://www.siteinspire.com/',
        mark: 'Si',
        color: '#5effc1'
      },
      {
        name: 'Godly',
        description: '网页设计案例与交互灵感',
        url: 'https://godly.website/',
        mark: 'Go',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'design-assets',
    topic: 'design',
    name: '素材与色彩',
    caption: '摄影、图标、字体与配色资源',
    icon: 'art',
    sites: [
      {
        name: 'Unsplash',
        description: '摄影作品检索与图片素材',
        url: 'https://unsplash.com/',
        mark: 'Un',
        color: '#ffe600'
      },
      {
        name: 'Pexels',
        description: '摄影图片与视频素材检索',
        url: 'https://www.pexels.com/',
        mark: 'Px',
        color: '#44d9ff'
      },
      {
        name: 'Google Fonts',
        description: '网页字体浏览、预览与嵌入',
        url: 'https://fonts.google.com/',
        mark: 'GF',
        color: '#b3ff3b'
      },
      {
        name: 'Fontshare',
        description: '字体系列预览与下载',
        url: 'https://www.fontshare.com/',
        mark: 'Fs',
        color: '#ff83cf'
      },
      {
        name: 'Lucide',
        description: '开源 SVG 图标与框架组件',
        url: 'https://lucide.dev/',
        mark: 'Lu',
        color: '#bc9aff'
      },
      {
        name: 'Iconify',
        description: '跨图标集检索与图标组件',
        url: 'https://iconify.design/',
        mark: 'Ic',
        color: '#ffb747'
      },
      {
        name: 'Coolors',
        description: '生成、浏览与调整配色方案',
        url: 'https://coolors.co/',
        mark: 'Co',
        color: '#5effc1'
      },
      {
        name: 'Adobe Color',
        description: '色轮、配色主题与对比度工具',
        url: 'https://color.adobe.com/',
        mark: 'AC',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'web-documentation',
    topic: 'documentation',
    name: 'Web 标准与基础',
    caption: '浏览器、语言与无障碍规范',
    icon: 'manga',
    sites: [
      {
        name: 'MDN Web Docs',
        description: 'HTML、CSS 与 JavaScript 参考文档',
        url: 'https://developer.mozilla.org/',
        mark: 'MD',
        color: '#ffe600'
      },
      {
        name: 'web.dev',
        description: 'Web 性能、无障碍与开发实践',
        url: 'https://web.dev/',
        mark: 'wd',
        color: '#44d9ff'
      },
      {
        name: 'JavaScript.info',
        description: '现代 JavaScript 教程与示例',
        url: 'https://javascript.info/',
        mark: 'JS',
        color: '#b3ff3b'
      },
      {
        name: 'TypeScript 文档',
        description: '类型系统、配置与语言手册',
        url: 'https://www.typescriptlang.org/docs/',
        mark: 'TS',
        color: '#ff83cf'
      },
      {
        name: 'WHATWG',
        description: 'HTML 等 Web 平台标准',
        url: 'https://whatwg.org/',
        mark: 'WH',
        color: '#bc9aff'
      },
      {
        name: 'W3C WAI',
        description: 'Web 无障碍规范、教程与指南',
        url: 'https://www.w3.org/WAI/',
        mark: 'WA',
        color: '#ffb747'
      },
      {
        name: 'CSS-Tricks',
        description: 'CSS 技巧、布局指南与文章',
        url: 'https://css-tricks.com/',
        mark: 'CSS',
        color: '#5effc1'
      },
      {
        name: 'ECMAScript 规范',
        description: 'JavaScript 语言的标准规范',
        url: 'https://tc39.es/ecma262/',
        mark: 'EC',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'frontend-documentation',
    topic: 'documentation',
    name: '前端框架',
    caption: '框架、构建与样式系统手册',
    icon: 'manga',
    sites: [
      {
        name: 'Vue 文档',
        description: '渐进式 JavaScript 框架指南',
        url: 'https://vuejs.org/',
        mark: 'Vu',
        color: '#ffe600'
      },
      {
        name: 'React 文档',
        description: '组件、Hooks 与 React 开发教程',
        url: 'https://react.dev/',
        mark: 'Re',
        color: '#44d9ff'
      },
      {
        name: 'Svelte 文档',
        description: '编译式 UI 框架与交互教程',
        url: 'https://svelte.dev/docs',
        mark: 'Sv',
        color: '#b3ff3b'
      },
      {
        name: 'Angular 文档',
        description: '组件、路由与依赖注入指南',
        url: 'https://angular.dev/',
        mark: 'An',
        color: '#ff83cf'
      },
      {
        name: 'Next.js 文档',
        description: 'React 应用路由、渲染与部署',
        url: 'https://nextjs.org/docs',
        mark: 'Nx',
        color: '#bc9aff'
      },
      {
        name: 'Nuxt 文档',
        description: 'Vue 全栈框架与应用约定',
        url: 'https://nuxt.com/docs',
        mark: 'Nu',
        color: '#ffb747'
      },
      {
        name: 'Vite 文档',
        description: '前端开发服务器与构建配置',
        url: 'https://vite.dev/guide/',
        mark: 'Vi',
        color: '#5effc1'
      },
      {
        name: 'Tailwind CSS 文档',
        description: '实用类样式系统与主题配置',
        url: 'https://tailwindcss.com/docs',
        mark: 'Tw',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'language-documentation',
    topic: 'documentation',
    name: '语言与运行时',
    caption: '常用语言、运行时与标准库',
    icon: 'manga',
    sites: [
      {
        name: 'Python 文档',
        description: 'Python 语言教程与标准库参考',
        url: 'https://docs.python.org/3/',
        mark: 'Py',
        color: '#ffe600'
      },
      {
        name: 'Go 文档',
        description: 'Go 入门、语言规范与开发指南',
        url: 'https://go.dev/doc/',
        mark: 'Go',
        color: '#44d9ff'
      },
      {
        name: 'Rust 文档',
        description: 'Rust 语言、工具链与学习资料',
        url: 'https://www.rust-lang.org/learn',
        mark: 'Rs',
        color: '#b3ff3b'
      },
      {
        name: 'Node.js 文档',
        description: 'Node.js API 与运行时参考',
        url: 'https://nodejs.org/docs/latest/api/',
        mark: 'No',
        color: '#ff83cf'
      },
      {
        name: 'Deno 文档',
        description: 'Deno 运行时、标准库与部署指南',
        url: 'https://docs.deno.com/',
        mark: 'De',
        color: '#bc9aff'
      },
      {
        name: 'Java 文档',
        description: 'Java 平台、JDK 与 API 参考',
        url: 'https://docs.oracle.com/en/java/',
        mark: 'Ja',
        color: '#ffb747'
      },
      {
        name: 'PHP 手册',
        description: 'PHP 语言语法与函数参考',
        url: 'https://www.php.net/manual/zh/',
        mark: 'PH',
        color: '#5effc1'
      },
      {
        name: 'Kotlin 文档',
        description: 'Kotlin 语法、协程与平台指南',
        url: 'https://kotlinlang.org/docs/home.html',
        mark: 'Kt',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'infrastructure-documentation',
    topic: 'documentation',
    name: '数据与工程',
    caption: '数据库、容器与工程基础手册',
    icon: 'manga',
    sites: [
      {
        name: 'PostgreSQL 文档',
        description: '关系数据库使用、SQL 与运维',
        url: 'https://www.postgresql.org/docs/',
        mark: 'PG',
        color: '#ffe600'
      },
      {
        name: 'MySQL 文档',
        description: 'MySQL 数据库参考与管理手册',
        url: 'https://dev.mysql.com/doc/',
        mark: 'My',
        color: '#44d9ff'
      },
      {
        name: 'Redis 文档',
        description: '数据结构、命令与部署指南',
        url: 'https://redis.io/docs/latest/',
        mark: 'Rd',
        color: '#b3ff3b'
      },
      {
        name: 'SQLite 文档',
        description: '嵌入式数据库与 SQL 参考',
        url: 'https://www.sqlite.org/docs.html',
        mark: 'Sq',
        color: '#ff83cf'
      },
      {
        name: 'Docker 文档',
        description: '容器、镜像与 Compose 指南',
        url: 'https://docs.docker.com/',
        mark: 'Do',
        color: '#bc9aff'
      },
      {
        name: 'Kubernetes 文档',
        description: '容器编排、集群与工作负载',
        url: 'https://kubernetes.io/docs/',
        mark: 'K8',
        color: '#ffb747'
      },
      {
        name: 'Git 文档',
        description: '版本控制命令与 Pro Git 手册',
        url: 'https://git-scm.com/doc',
        mark: 'Gt',
        color: '#5effc1'
      },
      {
        name: 'NGINX 文档',
        description: 'Web 服务与反向代理配置',
        url: 'https://nginx.org/en/docs/',
        mark: 'Ng',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'image-document-tools',
    topic: 'tools',
    name: '图片与文档处理',
    caption: '编辑、压缩与格式转换',
    icon: 'search',
    sites: [
      {
        name: 'Photopea',
        description: '浏览器图片编辑与 PSD 文件处理',
        url: 'https://www.photopea.com/',
        mark: 'Ph',
        color: '#ffe600'
      },
      {
        name: 'Squoosh',
        description: '图片压缩与编码格式对比',
        url: 'https://squoosh.app/',
        mark: 'Sq',
        color: '#44d9ff'
      },
      {
        name: 'TinyPNG',
        description: 'PNG、JPEG 与 WebP 图片压缩',
        url: 'https://tinypng.com/',
        mark: 'TP',
        color: '#b3ff3b'
      },
      {
        name: 'SVGOMG',
        description: 'SVG 文件优化与体积预览',
        url: 'https://jakearchibald.github.io/svgomg/',
        mark: 'SV',
        color: '#ff83cf'
      },
      {
        name: 'Excalidraw',
        description: '手绘风格流程图与协作白板',
        url: 'https://excalidraw.com/',
        mark: 'Ex',
        color: '#bc9aff'
      },
      {
        name: 'diagrams.net',
        description: '流程图、架构图与图表绘制',
        url: 'https://app.diagrams.net/',
        mark: 'Di',
        color: '#ffb747'
      },
      {
        name: 'iLovePDF',
        description: 'PDF 合并、拆分与格式转换',
        url: 'https://www.ilovepdf.com/',
        mark: 'PDF',
        color: '#5effc1'
      },
      {
        name: 'CloudConvert',
        description: '文件格式转换与处理',
        url: 'https://cloudconvert.com/',
        mark: 'CC',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'text-data-tools',
    topic: 'tools',
    name: '文本与数据处理',
    caption: '编码、差异比较与结构化数据',
    icon: 'search',
    sites: [
      {
        name: 'CyberChef',
        description: '编码、解码与数据处理流程',
        url: 'https://gchq.github.io/CyberChef/',
        mark: 'Cy',
        color: '#ffe600'
      },
      {
        name: 'IT-Tools',
        description: '开发常用转换与格式化工具集',
        url: 'https://it-tools.tech/',
        mark: 'IT',
        color: '#44d9ff'
      },
      {
        name: 'Diffchecker',
        description: '文本、文件与内容差异比较',
        url: 'https://www.diffchecker.com/',
        mark: 'Df',
        color: '#b3ff3b'
      },
      {
        name: 'JSON Editor Online',
        description: 'JSON 编辑、格式化与树形查看',
        url: 'https://jsoneditoronline.org/',
        mark: 'JO',
        color: '#ff83cf'
      },
      {
        name: 'JWT.io',
        description: 'JWT 结构查看与令牌调试',
        url: 'https://jwt.io/',
        mark: 'JW',
        color: '#bc9aff'
      },
      {
        name: 'Epoch Converter',
        description: 'Unix 时间戳与日期转换',
        url: 'https://www.epochconverter.com/',
        mark: 'Ep',
        color: '#ffb747'
      },
      {
        name: 'Mermaid Live',
        description: '以文本编写并预览流程图',
        url: 'https://mermaid.live/',
        mark: 'Me',
        color: '#5effc1'
      },
      {
        name: 'Transform Tools',
        description: '数据、代码与配置格式转换',
        url: 'https://transform.tools/',
        mark: 'Tr',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'productivity-tools',
    topic: 'tools',
    name: '协作与效率',
    caption: '笔记、日程、传输与协作',
    icon: 'directory',
    sites: [
      {
        name: 'Notion',
        description: '笔记、数据库与团队知识库',
        url: 'https://www.notion.so/',
        mark: 'No',
        color: '#ffe600'
      },
      {
        name: 'Obsidian',
        description: '基于 Markdown 的本地知识管理',
        url: 'https://obsidian.md/',
        mark: 'Ob',
        color: '#44d9ff'
      },
      {
        name: 'Todoist',
        description: '任务清单、项目与日程管理',
        url: 'https://www.todoist.com/',
        mark: 'To',
        color: '#b3ff3b'
      },
      {
        name: 'Trello',
        description: '看板式任务与团队协作',
        url: 'https://trello.com/',
        mark: 'Tr',
        color: '#ff83cf'
      },
      {
        name: 'DeepL',
        description: '文本与文档翻译工具',
        url: 'https://www.deepl.com/translator',
        mark: 'DL',
        color: '#bc9aff'
      },
      {
        name: 'Google 翻译',
        description: '多语言文本与网页翻译',
        url: 'https://translate.google.com/',
        mark: 'GT',
        color: '#ffb747'
      },
      {
        name: 'PairDrop',
        description: '设备间通过浏览器传输文件',
        url: 'https://pairdrop.net/',
        mark: 'PD',
        color: '#5effc1'
      },
      {
        name: 'Time.is',
        description: '世界各地时间与时区查询',
        url: 'https://time.is/',
        mark: 'Ti',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'chinese-tech-blogs',
    topic: 'blogs',
    name: '中文技术与独立博客',
    caption: '开发经验、技术周刊与个人写作',
    icon: 'community',
    sites: [
      {
        name: '阮一峰的网络日志',
        description: '技术文章、学习笔记与每周分享',
        url: 'https://www.ruanyifeng.com/blog/',
        mark: '阮',
        color: '#ffe600'
      },
      {
        name: '酷壳',
        description: '软件开发、工程实践与技术评论',
        url: 'https://coolshell.cn/',
        mark: '壳',
        color: '#44d9ff'
      },
      {
        name: '廖雪峰的官方网站',
        description: '编程教程与软件开发文章',
        url: 'https://liaoxuefeng.com/',
        mark: '廖',
        color: '#b3ff3b'
      },
      {
        name: '张鑫旭的博客',
        description: 'CSS、JavaScript 与前端实践',
        url: 'https://www.zhangxinxu.com/wordpress/',
        mark: '张',
        color: '#ff83cf'
      },
      {
        name: 'Anthony Fu',
        description: '开源项目、技术文章与个人记录',
        url: 'https://antfu.me/',
        mark: 'AF',
        color: '#bc9aff'
      },
      {
        name: '少数派',
        description: '数字工具、效率方法与生活体验',
        url: 'https://sspai.com/',
        mark: '派',
        color: '#ffb747'
      },
      {
        name: '美团技术团队',
        description: '后端、前端与系统工程实践',
        url: 'https://tech.meituan.com/',
        mark: '美',
        color: '#5effc1'
      },
      {
        name: '阿里云开发者社区',
        description: '云计算教程、技术文章与问答',
        url: 'https://developer.aliyun.com/',
        mark: '阿',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'independent-tech-blogs',
    topic: 'blogs',
    name: '海外技术写作',
    caption: '前端、系统与软件设计经验',
    icon: 'community',
    sites: [
      {
        name: 'Josh W. Comeau',
        description: '交互式前端教程与 CSS 讲解',
        url: 'https://www.joshwcomeau.com/',
        mark: 'JC',
        color: '#ffe600'
      },
      {
        name: 'Overreacted',
        description: 'React、编程思考与技术随笔',
        url: 'https://overreacted.io/',
        mark: 'Ov',
        color: '#44d9ff'
      },
      {
        name: 'Julia Evans',
        description: '系统知识、调试方法与技术图解',
        url: 'https://jvns.ca/',
        mark: 'JE',
        color: '#b3ff3b'
      },
      {
        name: 'Martin Fowler',
        description: '软件架构、重构与交付实践',
        url: 'https://martinfowler.com/',
        mark: 'MF',
        color: '#ff83cf'
      },
      {
        name: 'Paul Graham',
        description: '创业、编程与思考随笔',
        url: 'https://paulgraham.com/',
        mark: 'PG',
        color: '#bc9aff'
      },
      {
        name: 'Simon Willison',
        description: '开发工具、数据与 AI 实践记录',
        url: 'https://simonwillison.net/',
        mark: 'SW',
        color: '#ffb747'
      },
      {
        name: 'Bram.us',
        description: 'CSS、Web 平台与浏览器技术',
        url: 'https://www.bram.us/',
        mark: 'Br',
        color: '#5effc1'
      },
      {
        name: 'Kent C. Dodds',
        description: 'Web 开发、React 与测试实践',
        url: 'https://kentcdodds.com/',
        mark: 'KD',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'developer-reading',
    topic: 'blogs',
    name: '社区与技术阅读',
    caption: '讨论、长文与文章发现',
    icon: 'community',
    sites: [
      {
        name: '掘金',
        description: '中文开发者文章与技术交流',
        url: 'https://juejin.cn/',
        mark: '掘',
        color: '#ffe600'
      },
      {
        name: '博客园',
        description: '开发者博客与编程经验分享',
        url: 'https://www.cnblogs.com/',
        mark: '园',
        color: '#44d9ff'
      },
      {
        name: 'V2EX',
        description: '开发者与创作者的讨论社区',
        url: 'https://www.v2ex.com/',
        mark: 'V2',
        color: '#b3ff3b'
      },
      {
        name: 'Hacker News',
        description: '技术、创业与互联网话题讨论',
        url: 'https://news.ycombinator.com/',
        mark: 'HN',
        color: '#ff83cf'
      },
      {
        name: 'DEV Community',
        description: '开发者教程、文章与社区讨论',
        url: 'https://dev.to/',
        mark: 'DEV',
        color: '#bc9aff'
      },
      {
        name: 'Hashnode',
        description: '开发者博客与技术写作平台',
        url: 'https://hashnode.com/',
        mark: 'Ha',
        color: '#ffb747'
      },
      {
        name: 'Lobsters',
        description: '计算机与编程技术链接讨论',
        url: 'https://lobste.rs/',
        mark: 'Lo',
        color: '#5effc1'
      },
      {
        name: 'Smashing Magazine',
        description: 'Web 设计、前端与用户体验文章',
        url: 'https://www.smashingmagazine.com/',
        mark: 'SM',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'news-reading',
    topic: 'media',
    name: '新闻与长阅读',
    caption: '科技报道、文化观察与深度阅读',
    icon: 'news',
    sites: [
      {
        name: 'BBC 中文',
        description: '国际新闻、专题与中文报道',
        url: 'https://www.bbc.com/zhongwen',
        mark: 'BBC',
        color: '#ffe600'
      },
      {
        name: 'Reuters',
        description: '国际新闻、商业与时事报道',
        url: 'https://www.reuters.com/',
        mark: 'Re',
        color: '#44d9ff'
      },
      {
        name: 'AP News',
        description: '国际新闻与现场报道',
        url: 'https://apnews.com/',
        mark: 'AP',
        color: '#b3ff3b'
      },
      {
        name: 'The Verge',
        description: '科技产品、互联网与文化报道',
        url: 'https://www.theverge.com/',
        mark: 'Ve',
        color: '#ff83cf'
      },
      {
        name: 'Ars Technica',
        description: '科技、科学与技术分析',
        url: 'https://arstechnica.com/',
        mark: 'Ar',
        color: '#bc9aff'
      },
      {
        name: 'WIRED',
        description: '科技、商业与文化长篇报道',
        url: 'https://www.wired.com/',
        mark: 'Wi',
        color: '#ffb747'
      },
      {
        name: '36氪',
        description: '科技公司、创投与商业资讯',
        url: 'https://36kr.com/',
        mark: '36',
        color: '#5effc1'
      },
      {
        name: '澎湃新闻',
        description: '中文新闻、时事与专题报道',
        url: 'https://www.thepaper.cn/',
        mark: '澎',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'game-stores',
    topic: 'games',
    name: '平台与发行',
    caption: '主机、PC 与正版游戏发现',
    icon: 'game',
    sites: [
      {
        name: 'Epic Games Store',
        description: 'PC 游戏商店与发行平台',
        url: 'https://store.epicgames.com/',
        mark: 'EG',
        color: '#ffe600'
      },
      {
        name: 'GOG',
        description: 'PC 游戏商店与经典游戏',
        url: 'https://www.gog.com/',
        mark: 'GG',
        color: '#44d9ff'
      },
      {
        name: 'Humble Bundle',
        description: '游戏组合包、商店与慈善活动',
        url: 'https://www.humblebundle.com/',
        mark: 'HB',
        color: '#b3ff3b'
      },
      {
        name: 'Nintendo',
        description: '任天堂主机、游戏与官方资讯',
        url: 'https://www.nintendo.com/',
        mark: 'Ni',
        color: '#ff83cf'
      },
      {
        name: 'PlayStation',
        description: 'PlayStation 游戏、主机与服务',
        url: 'https://www.playstation.com/',
        mark: 'PS',
        color: '#bc9aff'
      },
      {
        name: 'Xbox',
        description: 'Xbox 游戏、主机与 Game Pass',
        url: 'https://www.xbox.com/',
        mark: 'XB',
        color: '#ffb747'
      },
      {
        name: 'EA',
        description: 'EA 游戏作品与官方资讯',
        url: 'https://www.ea.com/',
        mark: 'EA',
        color: '#5effc1'
      },
      {
        name: 'Ubisoft',
        description: '育碧游戏、作品资讯与商店',
        url: 'https://www.ubisoft.com/',
        mark: 'Ub',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'game-creation',
    topic: 'games',
    name: '资讯与游戏创作',
    caption: '游戏新闻、引擎与开发资源',
    icon: 'game',
    sites: [
      {
        name: 'IGN',
        description: '游戏新闻、评测与攻略',
        url: 'https://www.ign.com/',
        mark: 'IGN',
        color: '#ffe600'
      },
      {
        name: 'GameSpot',
        description: '游戏新闻、评测与视频报道',
        url: 'https://www.gamespot.com/',
        mark: 'GS',
        color: '#44d9ff'
      },
      {
        name: 'PC Gamer',
        description: 'PC 游戏新闻、评测与硬件资讯',
        url: 'https://www.pcgamer.com/',
        mark: 'PC',
        color: '#b3ff3b'
      },
      {
        name: 'Godot',
        description: '开源 2D 与 3D 游戏引擎',
        url: 'https://godotengine.org/',
        mark: 'Go',
        color: '#ff83cf'
      },
      {
        name: 'Unity',
        description: '游戏引擎、开发工具与学习资源',
        url: 'https://unity.com/',
        mark: 'Un',
        color: '#bc9aff'
      },
      {
        name: 'Unreal Engine',
        description: '实时 3D 创作与游戏开发引擎',
        url: 'https://www.unrealengine.com/',
        mark: 'UE',
        color: '#ffb747'
      },
      {
        name: 'OpenGameArt',
        description: '游戏美术、音效与素材分享',
        url: 'https://opengameart.org/',
        mark: 'OA',
        color: '#5effc1'
      },
      {
        name: 'Kenney',
        description: '游戏素材、工具与开发资源',
        url: 'https://kenney.nl/',
        mark: 'Ke',
        color: '#ff8c7c'
      }
    ]
  },
  {
    id: 'acg',
    topic: 'acg',
    name: 'ACG 社区',
    caption: '找到同好，分享热爱',
    icon: 'community',
    sites: [
      {
        name: '哔哩哔哩',
        description: '你感兴趣的视频，都在这里',
        url: 'https://www.bilibili.com/',
        mark: '哔',
        color: '#df709a'
      },
      {
        name: 'AcFun',
        description: '认真你就赢了的弹幕社区',
        url: 'https://www.acfun.cn/',
        mark: 'A',
        color: '#e36a63'
      },
      {
        name: 'Bangumi',
        description: '记录、发现与讨论 ACG 作品',
        url: 'https://bgm.tv/',
        mark: 'B',
        color: '#df9856'
      },
      {
        name: 'pixiv',
        description: '插画、漫画与创作灵感',
        url: 'https://www.pixiv.net/',
        mark: 'P',
        color: '#409ad4'
      },
      {
        name: '萌娘百科',
        description: '万物皆可萌的 ACG 百科',
        url: 'https://zh.moegirl.org.cn/',
        mark: '萌',
        color: '#6ca05b'
      },
      {
        name: '米游社',
        description: '游戏资讯与玩家创作社区',
        url: 'https://www.miyoushe.com/',
        mark: '米',
        color: '#c18b42'
      }
    ]
  },
  {
    id: 'anime',
    topic: 'acg',
    name: '动漫番剧',
    caption: '下一部好故事，从这里开始',
    icon: 'anime',
    sites: [
      {
        name: '哔哩哔哩番剧',
        description: '新番时间表与经典动画',
        url: 'https://www.bilibili.com/anime/',
        mark: '番',
        color: '#df709a'
      },
      {
        name: '腾讯视频动漫',
        description: '国漫新作与热门连载',
        url: 'https://v.qq.com/channel/cartoon',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '爱奇艺动漫',
        description: '国漫、日漫与动画剧场',
        url: 'https://www.iqiyi.com/dongman/',
        mark: '奇',
        color: '#58a76c'
      },
      {
        name: '优酷动漫',
        description: '热血冒险与精选动画',
        url: 'https://www.youku.com/channel/webcomic',
        mark: '酷',
        color: '#4498c8'
      },
      {
        name: 'Crunchyroll',
        description: '动画流媒体与新番资讯',
        url: 'https://www.crunchyroll.com/',
        mark: 'C',
        color: '#d98042'
      },
      {
        name: 'MyAnimeList',
        description: '动画评分、榜单与片单',
        url: 'https://myanimelist.net/',
        mark: 'M',
        color: '#6684c7'
      }
    ]
  },
  {
    id: 'video',
    topic: 'media',
    name: '视频平台',
    caption: '给自己留一点放映时间',
    icon: 'video',
    sites: [
      {
        name: 'YouTube',
        description: '探索世界各地的精彩视频',
        url: 'https://www.youtube.com/',
        mark: '▶',
        color: '#d96767'
      },
      {
        name: '腾讯视频',
        description: '热门剧集、电影与综艺',
        url: 'https://v.qq.com/',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '爱奇艺',
        description: '好故事，总有新发现',
        url: 'https://www.iqiyi.com/',
        mark: '奇',
        color: '#58a76c'
      },
      {
        name: '优酷',
        description: '剧集、综艺与人文纪实',
        url: 'https://www.youku.com/',
        mark: '酷',
        color: '#4498c8'
      },
      {
        name: '芒果 TV',
        description: '综艺、剧集与快乐日常',
        url: 'https://www.mgtv.com/',
        mark: '芒',
        color: '#d38c38'
      },
      {
        name: '抖音',
        description: '发现生活里的有趣瞬间',
        url: 'https://www.douyin.com/',
        mark: '抖',
        color: '#90819e'
      }
    ]
  },
  {
    id: 'live-streaming',
    topic: 'media',
    name: '直播平台',
    caption: '游戏实况、才艺互动与直播回放',
    icon: 'video',
    sites: [
      {
        name: '哔哩哔哩直播',
        description: '游戏、虚拟主播与兴趣社区直播',
        url: 'https://live.bilibili.com/',
        mark: 'B',
        color: '#ff83cf'
      },
      {
        name: '斗鱼',
        description: '游戏赛事、主播互动与娱乐直播',
        url: 'https://www.douyu.com/',
        mark: '斗',
        color: '#ffb747'
      },
      {
        name: '虎牙',
        description: '游戏实况、电竞赛事与娱乐直播',
        url: 'https://www.huya.com/',
        mark: '虎',
        color: '#ffe600'
      },
      {
        name: 'Twitch',
        description: '全球游戏、创作与社区直播',
        url: 'https://www.twitch.tv/',
        mark: 'Tw',
        color: '#bc9aff'
      },
      {
        name: 'YouTube 直播',
        description: '视频创作者直播与实时活动',
        url: 'https://www.youtube.com/live',
        mark: 'YT',
        color: '#ff8c7c'
      },
      {
        name: 'Kick',
        description: '游戏与娱乐主播直播',
        url: 'https://kick.com/',
        mark: 'K',
        color: '#b3ff3b'
      }
    ]
  },
  {
    id: 'search',
    topic: 'tools',
    name: '综合搜索',
    caption: '让每一个好奇，都有回音',
    icon: 'search',
    sites: [
      {
        name: '必应',
        description: '网页、图片与更多答案',
        url: 'https://cn.bing.com/',
        mark: 'b',
        color: '#46a8a0'
      },
      {
        name: 'Google',
        description: '从一个问题探索整个世界',
        url: 'https://www.google.com/',
        mark: 'G',
        color: '#568bdd'
      },
      {
        name: '百度',
        description: '中文资讯与生活信息搜索',
        url: 'https://www.baidu.com/',
        mark: '度',
        color: '#627ddd'
      },
      {
        name: 'DuckDuckGo',
        description: '注重隐私的综合搜索',
        url: 'https://duckduckgo.com/',
        mark: 'D',
        color: '#ce815b'
      },
      {
        name: '搜狗',
        description: '网页与微信内容搜索',
        url: 'https://www.sogou.com/',
        mark: '搜',
        color: '#d88757'
      },
      {
        name: '知乎',
        description: '在经验与讨论中寻找答案',
        url: 'https://www.zhihu.com/',
        mark: '知',
        color: '#568bdd'
      }
    ]
  },
  {
    id: 'news',
    topic: 'acg',
    name: '番剧资讯',
    caption: '新番日历、作品资料与动画新闻',
    icon: 'news',
    sites: [
      {
        name: 'AniList',
        description: '动画与漫画资料、评分及追番记录',
        url: 'https://anilist.co/',
        mark: 'AL',
        color: '#568bdd'
      },
      {
        name: 'AniDB',
        description: '动画作品、角色与制作资料库',
        url: 'https://anidb.net/',
        mark: 'DB',
        color: '#ce815b'
      },
      {
        name: 'Anime News Network',
        description: '动画行业新闻、评论与访谈',
        url: 'https://www.animenewsnetwork.com/',
        mark: 'AN',
        color: '#6684c7'
      },
      {
        name: 'LiveChart.me',
        description: '新番时间表、预告与播出信息',
        url: 'https://www.livechart.me/',
        mark: 'LC',
        color: '#58a76c'
      },
      {
        name: 'AnimeSchedule',
        description: '按周查看动画播出日程',
        url: 'https://animeschedule.net/',
        mark: 'AS',
        color: '#90819e'
      },
      {
        name: '动漫之家',
        description: '动漫资讯、作品介绍与社区',
        url: 'https://www.dmzj.com/',
        mark: '漫',
        color: '#df9856'
      }
    ]
  },
  {
    id: 'manga',
    topic: 'acg',
    name: '漫画阅读',
    caption: '连载、单行本与数字书架',
    icon: 'manga',
    sites: [
      {
        name: '哔哩哔哩漫画',
        description: '中文漫画连载与正版作品',
        url: 'https://manga.bilibili.com/',
        mark: '哔',
        color: '#df709a'
      },
      {
        name: '腾讯动漫',
        description: '国漫连载与热门漫画',
        url: 'https://ac.qq.com/',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '快看漫画',
        description: '原创漫画与创作者社区',
        url: 'https://www.kuaikanmanhua.com/',
        mark: '快',
        color: '#c18b42'
      },
      {
        name: 'MANGA Plus',
        description: '集英社漫画与同步连载',
        url: 'https://mangaplus.shueisha.co.jp/',
        mark: 'M+',
        color: '#d96767'
      },
      {
        name: 'BOOK☆WALKER',
        description: '漫画、轻小说与电子书',
        url: 'https://bookwalker.jp/',
        mark: 'BW',
        color: '#ce815b'
      },
      {
        name: '少年ジャンプ＋',
        description: '集英社日文漫画与原创连载',
        url: 'https://shonenjumpplus.com/',
        mark: 'J+',
        color: '#d96767'
      }
    ]
  },
  {
    id: 'art',
    topic: 'design',
    name: '插画与创作',
    caption: '收集灵感，也试着亲手创作',
    icon: 'art',
    sites: [
      {
        name: 'ArtStation',
        description: '概念设计、角色与数字艺术',
        url: 'https://www.artstation.com/',
        mark: 'Ar',
        color: '#409ad4'
      },
      {
        name: 'DeviantArt',
        description: '插画、同人作品与艺术社区',
        url: 'https://www.deviantart.com/',
        mark: 'DA',
        color: '#58a76c'
      },
      {
        name: 'LOFTER',
        description: '同人创作、绘画与兴趣社区',
        url: 'https://www.lofter.com/',
        mark: 'LO',
        color: '#6ca05b'
      },
      {
        name: 'BOOTH',
        description: '创作者的同人作品与数字商品',
        url: 'https://booth.pm/',
        mark: 'BO',
        color: '#df709a'
      },
      {
        name: 'CLIP STUDIO ASSETS',
        description: '绘画笔刷、素材与创作资源',
        url: 'https://assets.clip-studio.com/',
        mark: 'CS',
        color: '#90819e'
      },
      {
        name: 'Krita',
        description: '开源数字绘画与动画工具',
        url: 'https://krita.org/',
        mark: 'Kr',
        color: '#90819e'
      }
    ]
  },
  {
    id: 'music',
    topic: 'media',
    name: '音乐与电台',
    caption: '动画原声、同人音乐与日常循环',
    icon: 'music',
    sites: [
      {
        name: '网易云音乐',
        description: '歌单、动画原声与音乐社区',
        url: 'https://music.163.com/',
        mark: '云',
        color: '#d96767'
      },
      {
        name: 'QQ 音乐',
        description: '音乐曲库、歌单与数字专辑',
        url: 'https://y.qq.com/',
        mark: 'Q',
        color: '#58a76c'
      },
      {
        name: 'Spotify',
        description: '音乐、专辑与个性化歌单',
        url: 'https://open.spotify.com/',
        mark: 'S',
        color: '#58a76c'
      },
      {
        name: 'YouTube Music',
        description: '音乐视频、原声与现场演出',
        url: 'https://music.youtube.com/',
        mark: 'YM',
        color: '#d96767'
      },
      {
        name: 'Bandcamp',
        description: '独立音乐人与数字专辑',
        url: 'https://bandcamp.com/',
        mark: 'BC',
        color: '#4498c8'
      },
      {
        name: 'VocaDB',
        description: 'Vocaloid 歌曲、歌手与专辑资料',
        url: 'https://vocadb.net/',
        mark: 'V',
        color: '#46a8a0'
      }
    ]
  },
  {
    id: 'game',
    topic: 'games',
    name: '游戏与同人',
    caption: '发现新游戏，遇见独立创作',
    icon: 'game',
    sites: [
      {
        name: 'Steam',
        description: 'PC 游戏、社区与创意工坊',
        url: 'https://store.steampowered.com/',
        mark: 'St',
        color: '#6684c7'
      },
      {
        name: 'itch.io',
        description: '独立游戏、视觉小说与创作工具',
        url: 'https://itch.io/',
        mark: 'it',
        color: '#d96767'
      },
      {
        name: 'TapTap',
        description: '发现手游、玩家评价与社区',
        url: 'https://www.taptap.cn/',
        mark: 'T',
        color: '#46a8a0'
      },
      {
        name: 'DLsite',
        description: '同人游戏、音声与数字作品商店',
        url: 'https://www.dlsite.com/',
        mark: 'DL',
        color: '#568bdd'
      },
      {
        name: 'VNDB',
        description: '视觉小说作品与发行信息数据库',
        url: 'https://vndb.org/',
        mark: 'VN',
        color: '#c18b42'
      },
      {
        name: 'THBWiki',
        description: '东方 Project 作品与同人资料百科',
        url: 'https://thwiki.cc/',
        mark: '東',
        color: '#df709a'
      }
    ]
  },
  {
    id: 'directory',
    topic: 'acg',
    name: '导航与发现',
    caption: '继续发现更多 ACG 入口',
    icon: 'directory',
    sites: [
      {
        name: '萌导航 · moe48',
        description: 'ACG 网站与常用入口导航',
        url: 'https://www.moe48.com/',
        mark: '萌',
        color: '#df709a'
      },
      {
        name: 'EverythingMoe',
        description: '动漫、漫画与 ACG 工具目录',
        url: 'https://everythingmoe.com/',
        mark: 'EM',
        color: '#90819e'
      },
      {
        name: '萌导航 · moe123',
        description: '二次元网站与兴趣导航',
        url: 'https://www.moe123.net/',
        mark: 'M',
        color: '#6684c7'
      },
      {
        name: '维基百科',
        description: '作品背景、人物与百科资料',
        url: 'https://zh.wikipedia.org/',
        mark: 'W',
        color: '#90819e'
      },
      {
        name: 'Internet Archive',
        description: '公开数字馆藏与历史网页存档',
        url: 'https://archive.org/',
        mark: 'IA',
        color: '#c18b42'
      },
      {
        name: 'The Anime Index',
        description: '动画相关网站与工具索引',
        url: 'https://theindex.moe/',
        mark: 'I',
        color: '#46a8a0'
      }
    ]
  }
]

export const directory: DirectoryCategory[] = directoryTopics.flatMap((topic) => {
  const categories = directoryEntries.filter((category) => category.topic === topic.id)
  if (topic.id === 'acg') {
    return [
      ...categories.filter((category) => category.id === 'anime'),
      ...categories.filter((category) => category.id !== 'anime')
    ]
  }
  if (topic.id === 'media') {
    const order = ['video', 'live-streaming', 'music', 'news-reading']
    return [...categories].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }
  return categories
})

const featuredNames = ['哔哩哔哩', 'Bangumi', 'YouTube', '必应']
export const featuredSites = featuredNames.flatMap((name) =>
  directory.flatMap((category) => category.sites).filter((site) => site.name === name)
)
