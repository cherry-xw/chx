import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      // 生成的 iconfont 脚本
      'src/assets/iconfont/iconfont.js'
    ]
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    name: 'app/custom-rules',
    rules: {
      // 项目中 API 中间件、vue-flow 数据等处有意使用 any,与旧配置保持一致
      '@typescript-eslint/no-explicit-any': 'off',
      // 未使用变量降级为警告(与旧 @vue/eslint-config-typescript 一致)
      '@typescript-eslint/no-unused-vars': 'warn',
      // 工作流节点组件按 vue-flow 惯例直接修改 node.data(需重构才能消除)
      'vue/no-mutating-props': 'off'
    }
  },
  skipFormatting
)
