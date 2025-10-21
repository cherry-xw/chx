import { createRouter, createWebHashHistory, type Router } from 'vue-router'
import Layer from '@/components/layer/container.vue'
import Nav from '@/components/layer/nav.vue'
import TabManage from '@/components/layer/TabManage.vue'
import { useNavStore } from '@/stores/nav'
import { close, start } from '@/components/layer/progress'
import main from './main'
import practice from './practice'

export let router: Router
function createRouterIns() {
  const { name2Nav } = useNavStore()
  router = createRouter({
    history: createWebHashHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        redirect: '/main/entrance'
      },
      {
        path: '/login',
        component: () => import('@/pages/login/index.vue')
      },
      {
        path: '/layer',
        component: Layer,
        children: [
          {
            path: 'blank',
            components: {
              default: TabManage,
              nav: Nav,
              header: () => import('@/components/layer/Header.vue')
            },
            children: [main, practice]
          }
        ]
      }
    ]
  })
  router.beforeEach((to) => {
    start()
    if (typeof to.name === 'string') {
      const nav = name2Nav[to.name]
      if (nav) {
        document.title = `${nav.label} - 無良小萬`
      }
    }
    return
  })

  router.afterEach(() => {
    close()
  })
  return router
}

export default createRouterIns
