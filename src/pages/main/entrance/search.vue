<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Close, Search } from '@element-plus/icons-vue'
import { ElOption, ElOptionGroup, ElSelect } from 'element-plus'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/option-group/style/css'
import 'element-plus/es/components/select/style/css'
import { buildSearchURL, searchEngines } from '@/data/search-engines'
import {
  maxHeat,
  MIN_ACTIVE_SCORE,
  rankByHeat,
  readHeat,
  recordHeat,
  writeHeat
} from '@/utils/usage-heat'

defineOptions({ name: 'SearchView' })
const keyword = defineModel<string>({ default: '' })
const input = ref<HTMLInputElement>()
const groups = ['综合搜索', '视频平台', '开发工具'] as const
const storageKey = 'chery-search-engine'
const engineHeatKey = 'chery-search-engine-heat'
function readEngine() {
  const heat = readHeat(engineHeatKey)
  if (maxHeat(heat) >= MIN_ACTIVE_SCORE) {
    const top = rankByHeat(heat)[0]?.key
    if (top && searchEngines.some((engine) => engine.id === top)) return top
  }
  try {
    const saved = localStorage.getItem(storageKey)
    if (searchEngines.some((engine) => engine.id === saved)) return saved as string
  } catch {
    /* Use the default engine if storage is unavailable. */
  }
  return 'bing'
}
const engineId = ref(readEngine())
const shortcutLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'

function saveEngine() {
  try {
    localStorage.setItem(storageKey, engineId.value)
  } catch {
    /* Searching does not depend on storage. */
  }
}
function search() {
  const url = buildSearchURL(engineId.value, keyword.value)
  if (!url) return
  writeHeat(engineHeatKey, recordHeat(readHeat(engineHeatKey), engineId.value))
  window.open(url, '_blank', 'noopener,noreferrer')
}
function onEnter(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) event.preventDefault()
}
function focusSearch(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
    event.preventDefault()
    input.value?.focus()
    input.value?.select()
  }
}
function clear() {
  keyword.value = ''
  input.value?.focus()
}
onMounted(() => window.addEventListener('keydown', focusSearch))
onUnmounted(() => window.removeEventListener('keydown', focusSearch))
</script>

<template>
  <form class="header-search" role="search" aria-label="站外搜索" @submit.prevent="search">
    <div class="engine-picker">
      <ElSelect
        v-model="engineId"
        aria-label="搜索引擎"
        class="engine-select"
        popper-class="search-engine-menu"
        :fit-input-width="false"
        :teleported="true"
        placement="bottom-start"
        @change="saveEngine"
      >
        <ElOptionGroup v-for="group in groups" :key="group" :label="group">
          <ElOption
            v-for="engine in searchEngines.filter((item) => item.group === group)"
            :key="engine.id"
            :value="engine.id"
            :label="engine.name"
          />
        </ElOptionGroup>
      </ElSelect>
    </div>
    <input
      ref="input"
      v-model="keyword"
      type="text"
      aria-label="搜索关键词"
      placeholder="搜索你感兴趣的内容…"
      autocomplete="off"
      @keydown.enter="onEnter"
    />
    <button v-if="keyword" class="clear-search" type="button" aria-label="清空搜索" @click="clear">
      <Close />
    </button>
    <kbd v-else class="shortcut" aria-hidden="true">{{ shortcutLabel }}</kbd>
    <button
      class="submit-search"
      type="submit"
      aria-label="搜索（在新标签页打开）"
      :disabled="!keyword.trim()"
      title="搜索（在新标签页打开）"
    >
      <Search />
    </button>
  </form>
</template>

<style scoped>
.header-search {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-background);
}
.header-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
.header-search button {
  transition: transform 160ms var(--ease-out);
}
.header-search button svg {
  transition: transform 180ms var(--ease-out);
}
.header-search button:active:not(:disabled):not(:focus-visible) {
  transform: scale(0.95);
}
.header-search button:focus-visible {
  transition: none;
}
@media (hover: hover) and (pointer: fine) {
  .submit-search:hover:not(:disabled) svg {
    transform: rotate(-12deg) scale(1.08);
  }
  .clear-search:hover svg {
    transform: rotate(90deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .header-search button,
  .header-search button svg {
    transition: none;
    transform: none !important;
  }
}
.engine-picker {
  position: relative;
  flex: 0 0 102px;
  min-width: 0;
  border-right: 1px solid var(--color-border);
}
.engine-select {
  width: 100%;
}
.engine-select :deep(.el-select__wrapper) {
  min-height: 30px;
  padding: 4px 9px;
  background: transparent;
  box-shadow: none;
  font-size: 12px;
}
.engine-select :deep(.el-select__selected-item) {
  color: var(--color-text);
}
.engine-select :deep(.el-select__caret) {
  color: var(--color-text-muted);
}
input {
  flex: 1;
  min-width: 0;
  width: 0;
  height: 30px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 12px;
  outline: none;
}
input::placeholder {
  color: var(--color-text-muted);
}
button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 2px;
  cursor: pointer;
}
button svg {
  width: 16px;
  height: 16px;
}
.submit-search {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}
.submit-search:disabled {
  background: transparent;
  color: var(--color-text-muted);
  cursor: default;
}
.clear-search {
  background: transparent;
  color: var(--color-text-secondary);
  width: 26px;
}
.shortcut {
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0 5px;
  margin-right: 7px;
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
}
@media (max-width: 600px) {
  .shortcut {
    display: none;
  }
  .engine-picker {
    flex-basis: 76px;
  }
  .engine-select :deep(.el-select__wrapper) {
    padding-inline: 5px;
  }
  input {
    padding: 0 8px;
  }
}
</style>

<!-- The dropdown is teleported to body, so scope its styles with a dedicated class. -->
<style>
.search-engine-menu.el-popper {
  min-width: 220px;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 8px 28px rgb(0 0 0 / 14%);
  overflow: hidden;
}
.search-engine-menu .el-select-dropdown__wrap {
  max-height: min(360px, 60vh);
}
.search-engine-menu .el-select-dropdown__list {
  padding: 6px;
}
.search-engine-menu .el-select-group__title {
  padding-inline: 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}
.search-engine-menu .el-select-dropdown__item {
  height: 36px;
  padding-inline: 10px;
  border-radius: 6px;
  color: var(--color-text);
  font-size: 12px;
  line-height: 36px;
}
.search-engine-menu .el-select-dropdown__item.is-hovering {
  background: var(--color-background-soft);
}
.search-engine-menu .el-select-dropdown__item.is-selected {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: 600;
}
.search-engine-menu .el-select-group__wrap:not(:last-of-type)::after {
  background: var(--color-border);
}
</style>
