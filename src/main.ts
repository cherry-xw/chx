import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { plugin as Slicksort } from 'vue-slicksort'
// import VueParticles from '@tsparticles/vue3'
// import { loadSlim } from '@tsparticles/slim'

import App from './App.vue'
import createRouter from './router'

import './assets/iconfont/iconfont.css'
import './assets/main.css'
import { useModeStore } from './stores/counter'

const app = createApp(App)

app.use(createPinia())
useModeStore()
app.use(createRouter())
// app.use(VueParticles as any, {
//   async init(engine: any) {
//     await loadSlim(engine) // 使用轻量级版本，如需更多功能可使用 loadFull
//   }
// })

app.use(Slicksort)

app.mount('#app')
