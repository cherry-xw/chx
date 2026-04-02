import type { RouteRecordRaw } from 'vue-router'

const mainRouterConfig: Readonly<RouteRecordRaw> = {
  path: '/main',
  name: 'main',
  component: () => import('@/components/layer/keepAliveRouteView.vue'),
  redirect: '/main/entrance',
  children: [
    {
      path: 'entrance',
      name: 'entrance',
      component: () => import('@/pages/main/entrance/index.vue')
    },
    {
      path: 'blog',
      name: 'blog',
      component: () => import('@/pages/main/blog/index.vue')
    },
    {
      path: 'mqtt',
      name: 'mqtt',
      component: () => import('@/pages/main/mqtt/index.vue')
    },
    {
      path: 'workflow',
      name: 'workflow',
      component: () => import('@/pages/main/workflow/index.vue')
    }
  ]
}

export default mainRouterConfig
