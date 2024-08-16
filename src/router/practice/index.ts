import type { RouteRecordRaw } from 'vue-router'

const practiceRouterConfig: Readonly<RouteRecordRaw> = {
  path: '/practice',
  name: 'practice',
  component: () => import('@/components/layer/keepAliveRouteView.vue'),
  children: [
    {
      path: 'draw',
      name: 'draw',
      component: () => import('@/pages/practice/draw/index.vue')
    }
  ]
}

export default practiceRouterConfig
