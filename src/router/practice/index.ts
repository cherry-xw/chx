import type { RouteRecordRaw } from 'vue-router'

const practiceRouterConfig: Readonly<RouteRecordRaw> = {
  path: '/practice',
  name: 'practice',
  component: () => import('@/components/layer/keepAliveRouteView.vue'),
  redirect: '/practice/draw',
  children: [
    {
      path: 'draw',
      name: 'draw',
      component: () => import('@/pages/practice/draw/index.vue')
    },
    {
      path: 'navigation',
      name: 'navigation',
      component: () => import('@/pages/main/navigation/index.vue')
    }
  ]
}

export default practiceRouterConfig
