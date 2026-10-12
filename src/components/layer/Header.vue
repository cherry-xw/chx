<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { Compass, Monitor, Moon, Sunny, User, Setting } from '@element-plus/icons-vue'
import { ElButton, ElMessage, ElPopover } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/popover/style/css'
import {
  colorPalettes,
  isColorPalette,
  useModeStore,
  useUserInfoStore,
  type ThemePreference
} from '@/stores/counter'
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
const pageName = computed(() => name2Nav[String(route.name)]?.label ?? '首页')
const searchKeyword = ref('')
const themeOptions: { value: ThemePreference; label: string; icon: typeof Sunny }[] = [
  { value: 'light', label: '浅色模式', icon: Sunny },
  { value: 'dark', label: '深色模式', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor }
]
function changePalette(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (isColorPalette(value)) theme.setPalette(value)
}
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
    <el-popover placement="bottom-end" :width="260" trigger="click">
      <template #reference>
        <button type="button" class="appearance-button" aria-label="调整外观">
          <Setting /><span>外观</span>
        </button>
      </template>
      <div class="appearance-panel">
        <p>让这里更像你</p>
        <label class="palette-picker">
          <span class="palette-label">配色</span>
          <select :value="theme.palette" aria-label="页面配色" @change="changePalette">
            <option v-for="option in colorPalettes" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
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
      </div>
    </el-popover>
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
  gap: 10px;
  height: 42px;
  flex-shrink: 0;
  padding: 0 12px;
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
  border-radius: 3px;
  background: var(--color-background);
}
.palette-picker {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.palette-picker select {
  max-width: 150px;
  min-height: 28px;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}
.palette-picker option {
  background: var(--color-surface);
  color: var(--color-text);
}
.theme-picker button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 2px;
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
    padding: 0 10px;
    gap: 8px;
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
    padding: 4px 8px;
    height: auto;
    min-height: 42px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .theme-picker {
    padding: 2px;
    gap: 0;
  }
  .palette-label {
    display: none;
  }
  .palette-picker select {
    max-width: 150px;
    padding-inline: 3px;
  }
  .palette-picker {
    margin-right: auto;
  }
  .toolbar-search {
    flex: 1;
    min-width: 0;
  }
  .theme-picker button {
    width: 26px;
    height: 30px;
  }
  .user-button span {
    display: none;
  }
}
.appearance-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 28px;
  min-height: 28px;
  padding: 4px 7px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: transform 160ms var(--ease-out);
}
.appearance-button svg {
  width: 16px;
  height: 16px;
}
.appearance-button:active:not(:focus-visible) {
  transform: scale(0.97);
}
.appearance-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 5px;
}
.appearance-panel > p {
  font-size: 14px;
  font-weight: 650;
  color: var(--color-heading);
}
.appearance-panel .palette-picker {
  justify-content: space-between;
}
.appearance-panel .palette-label {
  display: inline;
}
.appearance-panel .theme-picker {
  justify-content: space-between;
}
.appearance-panel .theme-picker button {
  width: 64px;
  height: 34px;
}
@media (max-width: 600px) {
  .appearance-button span {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .appearance-button {
    transform: none !important;
    transition: none;
  }
}
</style>
