# Chery-Web 项目开发指南

## 项目概述

Chery-Web 是一个基于 Vue 3 的现代化前端应用,采用最新的前端技术栈构建,支持多标签页管理、MQTT 实时通信、Canvas 绑定学习等功能模块。

## 技术栈

### 核心框架
- **Vue**: Vue 3.4+ (Composition API + `<script setup>` 语法,禁止 Options API)
- **TypeScript**: TypeScript 5.4+ (严格模式,禁止隐式 any)
- **构建工具**: Vite 5.3+
- **路由**: Vue Router 4.3+ (Hash 模式)
- **状态管理**: Pinia 2.1+ (响应式状态管理)

### UI & 样式
- **UI 组件库**: Element Plus 2.7+ (中文语言包,支持暗色模式)
- **图标**: Element Plus Icons Vue + 自定义 iconfont
- **CSS 方案**: Tailwind CSS 3.4+ + Less 4.2+ + Scoped CSS
- **动画**: Animate.css 4.1+
- **拖拽排序**: Vue-slicksort 2.0+

### 网络请求
- **请求库**: chery-fetch 1.0+ (自定义封装,支持中间件机制)
  - 支持请求缓存 (processCache)
  - 支持重复请求合并 (mergeDuplicateRequests)
  - 支持 Token 无感刷新 (tokenRefreshMiddleware)
  - 统一响应格式: `{ data: any, status: boolean, msg: string }`

### 其他功能库
- **MQTT**: mqtt 5.14+ (实时消息通信)
- **工具库**:
  - lodash 4.17+ (通用工具函数)
  - nanoid 5.0+ (唯一 ID 生成)
  - crypto-js 4.2+ (加密工具)
  - js-md5 0.8+ (MD5 哈希)
- **进度条**: nprogress 0.2+
- **粒子效果**: @tsparticles/vue3 3.0+ (可选)

## 项目架构

### 目录结构
```
src/
├── pages/              # 页面组件
│   ├── login/         # 登录页
│   ├── main/          # 主要功能页
│   │   ├── entrance/  # 入口页(首页)
│   │   ├── blog/      # 博客模块
│   │   ├── mqtt/      # MQTT 功能模块
│   │   └── navigation/# Canvas 绑定学习模块
│   └── practice/      # 练习模块
│       └── draw/      # 绘图练习
├── components/        # 通用组件
│   ├── layer/         # 布局层组件
│   │   ├── container.vue      # 主容器
│   │   ├── nav.vue            # 左侧导航
│   │   ├── Header.vue         # 头部
│   │   ├── TabManage.vue      # 多标签页管理
│   │   ├── keepAliveRouteView.vue # 路由缓存视图
│   │   ├── progress.ts        # NProgress 封装
│   │   └── SecondConfirmation.vue # 二次确认对话框
│   ├── AnimBox.vue    # 动画盒子
│   └── FrostedGlass.vue # 毛玻璃效果
├── router/            # 路由配置
│   ├── index.ts       # 主路由(路由守卫、NProgress)
│   ├── main/          # main 模块路由
│   └── practice/      # practice 模块路由
├── stores/            # Pinia 状态管理
│   ├── nav.ts         # 导航树状态管理
│   └── counter.ts     # 计数器示例
├── api/               # API 封装
│   ├── index.ts       # serve 创建器(普通请求)
│   └── middleware/    # 中间件
│       └── token.ts   # Token 刷新中间件
├── utils/             # 工具函数
│   ├── common.ts      # 通用工具(recursion, encode等)
│   └── hashers.ts     # 哈希工具
├── assets/            # 静态资源
│   ├── main.css       # 全局样式
│   └── iconfont/      # 自定义图标
├── main.ts            # 应用入口(Element Plus 注册)
└── App.vue            # 根组件
```

### 核心功能模块

#### 1. 多标签页管理 (TabManage)
- 支持动态打开/关闭标签页
- 支持标签页拖拽排序 (vue-slicksort)
- 支持标签页二次关闭确认 (SecondConfirmation)
- 支持路由缓存 (keepAliveRouteView)

#### 2. 导航树管理 (NavStore)
- 树形结构导航菜单
- 支持目录与叶子节点区分
- 支持外链新标签页打开 (blank: true)
- 动态路由标题更新 (beforeEach 守卫)

#### 3. Token 无感刷新机制
- 基于 chery-fetch 中间件实现
- 自动检测 401 状态码
- refreshToken 刷新流程
- 并发请求合并优化
- 刷新失败通知提示 (ElNotification)

#### 4. MQTT 实时通信
- 连接管理 (connect.vue)
- 订阅管理 (subscribe.vue)
- 基于 mqtt.js 客户端

#### 5. Canvas 绑定学习模块
- 自定义渲染引擎 (chrender)
- 支持多种图形元素 (path, circle, rectangle, text)
- 绘图交互逻辑

## 开发规范

### 组件开发规范
1. **必须使用 `<script setup lang="ts">` 语法**
2. **Props 和 Emits 必须显式定义类型**:
   ```typescript
   interface Props {
     title: string
     count?: number
   }
   const props = defineProps<Props>()

   interface Emits {
     (e: 'update', value: number): void
   }
   const emit = defineEmits<Emits>()
   ```

3. **组件命名**: PascalCase (如 `TabManage.vue`)
4. **样式作用域**: 必须使用 `<style scoped>` 或 Tailwind CSS
5. **单一职责原则**: 业务逻辑与 UI 逻辑分离,复杂逻辑提取为 composables

### TypeScript 规范
1. **禁止使用 any**,必须显式定义类型
2. **接口定义**: 使用 `interface` 或 `type` 显式定义
3. **API 类型定义**: 统一在 `src/api/` 下定义响应类型
   ```typescript
   declare namespace API {
     interface Context<T> {
       request: RequestConfig
       response: Response<T>
     }
   }
   ```

### 路由规范
1. **路由命名**: 所有路由必须有 `name` 属性(用于 NavStore 映射)
2. **路由守卫**: 使用 `beforeEach` 和 `afterEach` 处理进度条和标题
3. **懒加载**: 使用 `() => import()` 动态导入组件
4. **元信息**: 使用 `meta.hideProgress` 控制进度条显示

### API 请求规范
1. **统一使用 `serve` 或 `tServe` 创建器**:
   ```typescript
   // 普通请求(不带 token)
   import serve from '@/api'
   const res = await serve<{ data: UserInfo }>('/getUserInfo').promise()

   // 需要 token 的请求
   import { tServe } from '@/api'
   const res = await tServe<{ data: UserInfo }>('/getUserInfo').promise()
   ```

2. **响应类型定义**: 必须定义响应数据类型
3. **错误处理**: Token 失败自动处理,其他错误需自行处理
4. **请求缓存**: 使用 `processCache` 中间件自动缓存
5. **重复请求合并**: 使用 `useMergeIdenticalRequest: true` 选项

### 状态管理规范
1. **使用 Pinia Composition API**:
   ```typescript
   export const useNavStore = defineStore('nav', () => {
     const nav = reactive<Nav[]>([])
     function addNav(item: Nav) { ... }
     return { nav, addNav }
   })
   ```

2. **Store 命名**: `useXxxStore` 格式
3. **响应式数据**: 使用 `reactive` 或 `ref`
4. **禁止直接修改 state**,必须通过 actions

### 样式规范
1. **优先使用 Tailwind CSS** 工具类
2. **复杂样式使用 Less + Scoped**:
   ```vue
   <style scoped lang="less">
   .container {
     @apply flex items-center; // 可混用 Tailwind
   }
   </style>
   ```

3. **暗色模式**: 使用 Element Plus dark theme CSS vars
4. **动画**: 使用 animate.css 或自定义 CSS transitions

### Git 提交规范
- **feat**: 新功能
- **fix**: Bug 修复
- **refactor**: 重构
- **style**: 样式调整
- **docs**: 文档更新
- **test**: 测试相关

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 环境配置

### 开发环境 (.env.development)
```bash
EDITOR=code
VITE_SERVER_CONFIG=http://localhost:3000
```

### 生产环境 (.env.production)
- API 代理: `/api` -> `https://www.xcherry.top`

### Vite 代理配置
```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://www.xcherry.top',
      changeOrigin: true
    }
  }
}
```

## 关键技术细节

### Token 刷新流程
1. 请求拦截: 添加 `Authorization: accessToken` 到 header
2. 响应拦截: 检测 401 状态码
3. 刷新 Token: 调用 `/refreshToken` 接口,使用 refreshToken
4. 更新 Token: 存储新的 accessToken 和 refreshToken 到 localStorage
5. 重试请求: 使用 `next(true)` 重新执行原请求

### 多标签页缓存机制
- 使用 Vue Router 的 `keep-alive` 组件
- 动态管理 `include` 和 `exclude` 列表
- 支持手动清除缓存

### 导航树二次确认机制
- NavStore 中配置 `secondConfirmation` 字段
- 支持静态 boolean 或动态函数判断
- SecondConfirmation 组件弹窗确认

## 常见问题

### 1. Token 刷新失败怎么办?
- 检查 localStorage 中 refreshToken 是否存在
- 检查 `/refreshToken` 接口返回格式
- 查看 ElNotification 提示内容

### 2. 如何新增导航菜单项?
在 `src/stores/nav.ts` 的 `navOrigin` 数组中添加:
```typescript
{
  label: '菜单名',
  name: 'routeName',
  icon: 'ElementPlusIconName', // 参考 https://element-plus.org/zh-CN/component/icon
  focus: false,
  children: [...] // 如有子菜单
}
```

### 3. 如何新增需要 Token 的 API?
```typescript
import { tServe } from '@/api'

interface UserInfo {
  id: string
  name: string
}

const res = await tServe<{ data: UserInfo }>('/getUserInfo', {}).promise()
if (res.status) {
  console.log(res.data)
}
```

### 4. 如何配置路由缓存?
在路由组件中:
```vue
<template>
  <keep-alive :include="cachedViews">
    <router-view />
  </keep-alive>
</template>
```

### 5. 如何使用 MQTT?
参考 `src/pages/main/mqtt/` 目录下的组件:
- `connect.vue`: 连接配置
- `subscribe.vue`: 订阅管理

## IDE 配置建议

### VSCode 插件
- **Volar** (Vue.volar) - Vue 3 + TypeScript 支持
- **TypeScript Vue Plugin (Volar)** - .vue 文件 TS 支持
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Tailwind CSS IntelliSense** - Tailwind 类名提示

### VSCode 设置
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.inlineHandlerLeading": true
}
```

## 性能优化建议

1. **路由懒加载**: 所有页面组件使用动态导入
2. **图片懒加载**: 使用 `v-lazy` 或自定义指令
3. **大列表虚拟滚动**: 使用 `vue-virtual-scroller`
4. **避免不必要的重渲染**: 合理使用 `v-once` 和 `v-memo`
5. **合理使用 keep-alive**: 只缓存必要的路由组件
6. **请求缓存**: 使用 `processCache` 中间件缓存重复请求
7. **请求合并**: 并发相同请求使用 `mergeDuplicateRequests`

## 安全注意事项

1. **Token 存储**: 使用 localStorage,注意 XSS 防护
2. **敏感信息**: 不要在代码中硬编码密钥、密码等
3. **输入验证**: 所有用户输入必须验证
4. **加密传输**: 使用 HTTPS,敏感数据使用 crypto-js 加密
5. **CSP 配置**: 生产环境配置 Content-Security-Policy

## 维护与更新

### 依赖更新
```bash
# 检查可更新依赖
npm outdated

# 更新依赖(谨慎操作,需测试)
npm update <package-name>
```

### 类型定义更新
- 新增 API 接口时同步更新类型定义
- 新增组件 Props/Emits 时必须定义类型
- 定期检查 TypeScript 版本兼容性

### 文档更新
- 新增功能模块时更新本文档
- 架构调整时同步更新架构说明
- 保持文档与代码实际状态一致

---

**最后更新**: 2026-04-02
**维护者**: wan