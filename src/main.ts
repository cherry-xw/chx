import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.min.mjs'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { plugin as Slicksort } from 'vue-slicksort'

import App from './App.vue'
import createRouter from './router'

const app = createApp(App)

app.use(createPinia())
app.use(createRouter())

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app
  .use(ElementPlus, {
    locale: zhCn
  })
  .use(Slicksort)

app.mount('#app')
