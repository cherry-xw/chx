import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The package's browser entry is UMD and pulls in Vue's runtime compiler.
      'vue-slicksort': 'vue-slicksort/dist/vue-slicksort.esm.js'
    }
  },
  optimizeDeps: {
    include: ['mqtt']
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://www.xcherry.top',
        changeOrigin: true
      }
    }
  }
})
