import type { RouteRecordRaw } from 'vue-router'

const mainRouterConfig: Readonly<RouteRecordRaw> = {
  path: '/main',
  name: 'main',
  component: () => import('@/components/layer/keepAliveRouteView.vue'),
  children: [
    {
      path: 'navigation',
      name: 'navigation',
      component: () => import('@/pages/main/navigation/index.vue')
    },
    {
      path: 'blog',
      name: 'blog',
      component: () => import('@/pages/main/blog/index.vue')
    }
  ]
}

export default mainRouterConfig
