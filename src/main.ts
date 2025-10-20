import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.min.mjs'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { plugin as Slicksort } from 'vue-slicksort'
import 'animate.css';
import VueParticles from '@tsparticles/vue3'
import { loadSlim } from "@tsparticles/slim"

import App from './App.vue'
import createRouter from './router'

import "./assets/iconfont/iconfont.css"


const app = createApp(App)

app.use(createPinia())
app.use(createRouter())
app.use(VueParticles, {
  init: async (engine) => {
    await loadSlim(engine) // 使用轻量级版本，如需更多功能可使用 loadFull
  }
})

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app
  .use(ElementPlus, {
    locale: zhCn
  })
  .use(Slicksort)

app.mount('#app')
