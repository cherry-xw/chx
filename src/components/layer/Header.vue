<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { Compass, Monitor, Moon, Sunny, User } from '@element-plus/icons-vue'
import { ElButton, ElMessage, ElPopover } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/popover/style/css'
import { useModeStore, useUserInfoStore, type ThemePreference } from '@/stores/counter'
import { useNavStore } from '@/stores/nav'
import HeaderSearch from '@/pages/main/entrance/search.vue'
import serve from '@/api'

defineOptions({ name: 'HeaderView' })
const route = useRoute()
const router = useRouter()
const theme = useModeStore()
const userStore = useUserInfoStore()
const { userInfo } = storeToRefs(userStore)
const { name2Nav } = useNavStore()
const pageName = computed(() => name2Nav[String(route.name)]?.label ?? '探索首页')
const searchKeyword = ref('')
const themeOptions: { value: ThemePreference; label: string; icon: typeof Sunny }[] = [
  { value: 'light', label: '浅色模式', icon: Sunny },
  { value: 'dark', label: '深色模式', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor }
]
async function logout() {
  try {
    await serve('/logout').sync
    userStore.updateUserInfo()
    router.push({ path: '/login', query: { from: route.path } })
    ElMessage.success('登出成功')
  } catch {
    ElMessage.error('登出失败，请稍后重试')
  }
}
</script>

<template>
  <header class="page-header">
    <div class="page-location">
      <Compass /><span>{{ pageName }}</span>
    </div>
    <HeaderSearch v-model="searchKeyword" class="toolbar-search" />
    <div class="theme-picker" role="group" aria-label="外观模式">
      <button
        v-for="option in themeOptions"
        :key="option.value"
        type="button"
        :class="{ active: theme.preference === option.value }"
        :aria-label="option.label"
        :aria-pressed="theme.preference === option.value"
        :title="option.label"
        @click="theme.setPreference(option.value)"
      >
        <component :is="option.icon" />
      </button>
    </div>
    <el-popover v-if="userInfo?.name" placement="bottom-end" :width="150" trigger="click">
      <el-button text class="logout-button" @click="logout">登出</el-button>
      <template #reference>
        <button class="user-button" type="button" :aria-label="userInfo.name + '，打开用户菜单'">
          <User /><span>{{ userInfo.name }}</span>
        </button>
      </template>
    </el-popover>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 72px;
  flex-shrink: 0;
  padding: 0 32px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.page-location {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-right: auto;
  white-space: nowrap;
}
.page-location svg {
  width: 17px;
  height: 17px;
  color: var(--color-accent);
}
.toolbar-search {
  flex: 1;
  max-width: 520px;
}
.theme-picker {
  display: flex;
  flex-shrink: 0;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-background);
}
.theme-picker button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.theme-picker svg {
  width: 15px;
  height: 15px;
}
.theme-picker button.active {
  background: var(--color-surface);
  color: var(--color-accent);
  box-shadow: 0 1px 4px #0000000d;
}
.user-button {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 0;
  padding: 5px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
}
.user-button svg {
  width: 19px;
  height: 19px;
}
.user-button span {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logout-button {
  width: 100%;
}
@media (hover: hover) and (pointer: fine) {
  .theme-picker button:hover {
    color: var(--color-accent);
    background: var(--color-accent-soft);
  }
}
@media (max-width: 1050px) {
  .page-header {
    padding: 0 24px;
    gap: 14px;
  }
  .page-location {
    display: none;
  }
  .toolbar-search {
    max-width: none;
  }
}
@media (max-width: 600px) {
  .page-header {
    padding: 0 12px;
    height: 64px;
    gap: 8px;
  }
  .theme-picker {
    padding: 2px;
    gap: 0;
  }
  .theme-picker button {
    width: 26px;
    height: 30px;
  }
  .user-button span {
    display: none;
  }
}
</style>
