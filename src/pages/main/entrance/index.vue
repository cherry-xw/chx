<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, ref } from 'vue'
import {
  ChatDotRound,
  Collection,
  Compass,
  Film,
  Search,
  Star,
  VideoPlay,
  Reading,
  Picture,
  Headset,
  Mouse,
  Calendar,
  ArrowRight,
  Close,
  Connection,
  Rank,
  ArrowUp,
  ArrowDown,
  RefreshLeft,
  Setting
} from '@element-plus/icons-vue'
import {
  directory,
  directoryTopics,
  featuredSites,
  type DirectorySite,
  type DirectoryCategory,
  type DirectoryTopicId
} from '@/data/directory'
import { DragHandle, SlickItem, SlickList } from 'vue-slicksort'
import { useDirectoryLayoutStore } from '@/stores/directory-layout'
import SiteCard from './SiteCard.vue'
import { usePanelMotion } from '@/composables/usePanelMotion'
import {
  maxHeat,
  MIN_ACTIVE_SCORE,
  pickTopByHeat,
  readHeat,
  recordHeat,
  writeHeat
} from '@/utils/usage-heat'

defineOptions({ name: 'EntranceView' })
const selectedTopic = ref<DirectoryTopicId | 'all'>('all')
const layout = useDirectoryLayoutStore()
const editingLayout = ref(false)
const sorting = ref(false)
const layoutMessage = ref('')
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionQuery.matches)
function syncMotion(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches
}
motionQuery.addEventListener('change', syncMotion)
onBeforeUnmount(() => motionQuery.removeEventListener('change', syncMotion))
const siteQuery = ref('')
const directorySearch = ref<HTMLInputElement>()
const previewCount = 6
const detailDialog = ref<HTMLDialogElement>()
const detailCategory = ref<DirectoryCategory>()
onDeactivated(() => detailDialog.value?.close())
async function showCategoryDetails(category: DirectoryCategory) {
  detailCategory.value = category
  await nextTick()
  detailDialog.value?.showModal()
}
const categoryGrid = ref<HTMLElement>()
const { update: updatePanels, cancel: cancelCategoryAnimation } = usePanelMotion(
  categoryGrid,
  '.category-panel'
)
const normalizedQuery = computed(() => siteQuery.value.trim().toLocaleLowerCase())
const siteCount = directory.reduce((count, category) => count + category.sites.length, 0)
const visibleCategories = computed(() =>
  layout.orderedCategories
    .filter((category) => selectedTopic.value === 'all' || category.topic === selectedTopic.value)
    .map((category) => ({
      ...category,
      sites: layout.orderSites(
        category.id,
        category.sites.filter((site) =>
          `${site.name} ${site.description} ${site.url}`
            .toLocaleLowerCase()
            .includes(normalizedQuery.value)
        )
      )
    }))
    .filter((category) => category.sites.length)
)
const visibleSiteCount = computed(() =>
  visibleCategories.value.reduce((count, category) => count + category.sites.length, 0)
)
async function selectTopic(id: DirectoryTopicId | 'all', event: MouseEvent) {
  if (selectedTopic.value === id) return
  await updatePanels(() => {
    selectedTopic.value = id
  }, event)
}
function resetFilters() {
  cancelCategoryAnimation()
  selectedTopic.value = 'all'
  siteQuery.value = ''
  directorySearch.value?.focus()
}
function clearSiteQuery() {
  siteQuery.value = ''
  cancelCategoryAnimation()
  directorySearch.value?.focus()
}
const topics = directoryTopics.map((topic) => ({
  ...topic,
  count: directory
    .filter((category) => category.topic === topic.id)
    .reduce((sum, category) => sum + category.sites.length, 0)
}))
const activeTopic = computed(() =>
  directoryTopics.find((topic) => topic.id === selectedTopic.value)
)
let dragVisibleIds: string[] = []
function startSorting() {
  cancelCategoryAnimation()
  sorting.value = true
  dragVisibleIds = visibleCategories.value.map((category) => category.id)
}
function finishSorting() {
  sorting.value = false
}
let draggedSite: { categoryId: string; url: string } | undefined
function startSiteDrag(categoryId: string, url: string, event: DragEvent) {
  if (!editingLayout.value || !event.dataTransfer) return
  draggedSite = { categoryId, url }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', url)
  sorting.value = true
}
function dropSite(category: DirectoryCategory, targetUrl: string, event: DragEvent) {
  event.preventDefault()
  const source = draggedSite
  draggedSite = undefined
  sorting.value = false
  if (!source || source.categoryId !== category.id || source.url === targetUrl) return
  const current = category.sites.map((site) => site.url)
  const sourceIndex = current.indexOf(source.url)
  const targetIndex = current.indexOf(targetUrl)
  if (sourceIndex < 0 || targetIndex < 0) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const insertAfter = event.clientY > rect.top + rect.height / 2
  const next = [...current]
  next.splice(sourceIndex, 1)
  const adjustedTarget = next.indexOf(targetUrl) + (insertAfter ? 1 : 0)
  next.splice(adjustedTarget, 0, source.url)
  layout.reorderSites(category.id, current, next)
  layoutMessage.value = layout.storageAvailable
    ? '区块内站点顺序已保存'
    : '顺序已调整，仅在当前页面生效'
}
function cancelSiteDrag() {
  draggedSite = undefined
  sorting.value = false
}
function moveSite(category: DirectoryCategory, url: string, direction: -1 | 1, event: MouseEvent) {
  const trigger = event.currentTarget as HTMLButtonElement
  layout.moveSite(
    category.id,
    category.sites.map((site) => site.url),
    url,
    direction
  )
  const index = category.sites.findIndex((site) => site.url === url) + direction + 1
  layoutMessage.value = `${category.name}内站点已移至第 ${index} 位`
  if (event.detail === 0) {
    nextTick(() => {
      const row = trigger.closest('.site-row')
      const focusTarget = trigger.disabled
        ? row?.querySelector<HTMLButtonElement>('.site-move-controls button:not(:disabled)')
        : trigger
      focusTarget?.focus()
    })
  }
}
function saveSortedPanels(next: DirectoryCategory[]) {
  const currentIds = visibleCategories.value.map((category) => category.id)
  if (dragVisibleIds.length && dragVisibleIds.join('|') !== currentIds.join('|')) return
  layout.reorderVisible(
    currentIds,
    next.map((category) => category.id)
  )
  layoutMessage.value = layout.storageAvailable
    ? '区块顺序已保存'
    : '顺序已调整，浏览器存储不可用，仅在当前页面生效'
  dragVisibleIds = []
}
async function movePanel(id: string, direction: -1 | 1, event: MouseEvent) {
  const trigger = event.currentTarget as HTMLButtonElement
  await updatePanels(() => {
    layout.moveBlock(
      visibleCategories.value.map((category) => category.id),
      id,
      direction
    )
  }, event)
  await nextTick()
  if (event.detail === 0) {
    const panel = [
      ...(categoryGrid.value?.querySelectorAll<HTMLElement>('.category-panel') ?? [])
    ].find((element) => element.dataset.panelKey === id)
    const focusTarget = trigger.disabled
      ? panel?.querySelector<HTMLButtonElement>('.move-controls button:not(:disabled)')
      : trigger
    focusTarget?.focus({ preventScroll: true })
    panel?.scrollIntoView({ block: 'nearest' })
  }
  const name = directory.find((category) => category.id === id)?.name
  const position = visibleCategories.value.findIndex((category) => category.id === id) + 1
  layoutMessage.value = `${name}已移至当前视图第 ${position} 个位置`
}
async function restoreOrder(event: MouseEvent) {
  await updatePanels(() => layout.resetOrder(), event)
  layoutMessage.value = '已恢复全部区块的默认顺序'
}
function toggleLayout() {
  editingLayout.value = !editingLayout.value
  layoutMessage.value = ''
}
const categoryIcons = {
  community: ChatDotRound,
  anime: Film,
  video: VideoPlay,
  search: Search,
  news: Calendar,
  manga: Reading,
  art: Picture,
  music: Headset,
  game: Mouse,
  directory: Compass
}

// 常用入口：按本地使用热度（时间衰减）跨分类取 Top N；热度不足时回退到静态精选。
const SITE_HEAT_KEY = 'chery-usage-sites'
const featuredCount = featuredSites.length
const allSites = directory.flatMap((category) => category.sites)
function computeFeaturedSites(): DirectorySite[] {
  const heat = readHeat(SITE_HEAT_KEY)
  if (maxHeat(heat) < MIN_ACTIVE_SCORE) return featuredSites
  const defaultOrder = new Map(featuredSites.map((site, index) => [site.url, index]))
  return pickTopByHeat(allSites, heat, featuredCount, (site) => site.url, defaultOrder)
}
const personalizedFeatured = ref<DirectorySite[]>(computeFeaturedSites())
// 页面被 KeepAlive 缓存，切回页签时按最新热度刷新；交互过程中不即时跳动。
onActivated(() => {
  personalizedFeatured.value = computeFeaturedSites()
})
function recordVisit(url: string) {
  writeHeat(SITE_HEAT_KEY, recordHeat(readHeat(SITE_HEAT_KEY), url))
}
</script>

<template>
  <main class="entrance">
    <header class="entrance-overview">
      <h1>站点导航</h1>
      <span class="overview-count"
        >{{ directoryTopics.length }} 专题 / {{ directory.length }} 区块 /
        {{ siteCount }} 站点</span
      >
      <nav class="portal-links" aria-label="应用快捷入口">
        <RouterLink to="/main/services"
          ><Collection aria-hidden="true" />个人服务<ArrowRight aria-hidden="true"
        /></RouterLink>
        <RouterLink to="/main/mqtt"
          ><Connection aria-hidden="true" />MQTT<ArrowRight aria-hidden="true"
        /></RouterLink>
      </nav>
    </header>
    <section class="featured-section" aria-labelledby="featured-title">
      <div class="section-heading">
        <h2 id="featured-title"><Star aria-hidden="true" />常用入口</h2>
        <span>按使用热度排序</span>
      </div>
      <div class="featured-grid">
        <SiteCard
          v-for="site in personalizedFeatured"
          :key="site.url"
          :site="site"
          featured
          @click="recordVisit(site.url)"
        />
      </div>
    </section>

    <section class="directory-section" aria-label="分类站点导航">
      <div class="directory-heading">
        <h2>站点目录</h2>
        <button
          type="button"
          class="layout-toggle"
          :class="{ selected: editingLayout }"
          :aria-pressed="editingLayout"
          :disabled="sorting"
          @click="toggleLayout"
        >
          <Setting aria-hidden="true" />{{ editingLayout ? '完成调整' : '调整布局' }}
        </button>
        <div class="directory-search">
          <Search aria-hidden="true" />
          <input
            ref="directorySearch"
            :disabled="sorting"
            v-model="siteQuery"
            type="search"
            aria-label="筛选本站收录的网站"
            placeholder="查找站点、内容或网址…"
            @input="cancelCategoryAnimation"
            @keydown.esc="siteQuery = ''"
          />
          <button v-if="siteQuery" type="button" aria-label="清空站点筛选" @click="clearSiteQuery">
            <Close />
          </button>
        </div>
      </div>
      <div class="directory-layout">
        <aside class="directory-toolbar">
          <div class="category-filters" role="group" aria-label="筛选站点分类">
            <button
              type="button"
              :class="{ selected: selectedTopic === 'all' }"
              :aria-pressed="selectedTopic === 'all'"
              @click="selectTopic('all', $event)"
              :disabled="sorting"
            >
              <Compass aria-hidden="true" />全部站点 <span>{{ siteCount }}</span>
            </button>
            <button
              v-for="topic in topics"
              :data-topic="topic.id"
              :key="topic.id"
              type="button"
              :class="{ selected: selectedTopic === topic.id }"
              :aria-pressed="selectedTopic === topic.id"
              @click="selectTopic(topic.id, $event)"
              :disabled="sorting"
            >
              <component :is="categoryIcons[topic.icon]" aria-hidden="true" />{{ topic.name
              }}<span>{{ topic.count }}</span>
            </button>
          </div>
          <span class="directory-note" role="status">{{ visibleSiteCount }} 个站点</span>
        </aside>
        <div v-if="editingLayout" class="layout-toolbar">
          <span>拖动区块或站点，也可使用前移 / 后移按钮；调整时显示全部站点，顺序自动保存。</span>
          <button type="button" :disabled="sorting" @click="restoreOrder">
            <RefreshLeft aria-hidden="true" />恢复全部默认顺序
          </button>
        </div>
        <p v-if="!layout.storageAvailable" class="storage-notice" role="status">
          浏览器存储不可用，布局调整仅在当前页面生效。
        </p>
        <p class="sort-announcement" role="status" aria-live="polite">{{ layoutMessage }}</p>
        <div v-if="activeTopic" class="topic-summary">
          <h2>{{ activeTopic.name }}</h2>
          <span>{{ activeTopic.caption }}</span>
          <span class="topic-stats"
            >{{ visibleCategories.length }} 个区块 · {{ visibleSiteCount }} 个站点</span
          >
          <button type="button" :disabled="sorting" @click="selectTopic('all', $event)">
            返回全部
          </button>
        </div>
        <div id="directory-results" ref="categoryGrid" class="directory-results">
          <SlickList
            class="category-grid"
            :class="{ 'is-topic': selectedTopic !== 'all', 'is-editing': editingLayout }"
            :list="visibleCategories"
            axis="xy"
            :use-drag-handle="true"
            :distance="6"
            :transition-duration="reducedMotion ? 0 : 200"
            :dragged-settling-duration="0"
            append-to="#directory-results"
            helper-class="directory-sort-helper"
            @update:list="saveSortedPanels"
            @sort-start="startSorting"
            @sort-end="finishSorting"
            @sort-cancel="finishSorting"
          >
            <SlickItem
              v-for="(category, index) in visibleCategories"
              :key="category.id"
              :index="index"
              :disabled="!editingLayout"
              tag="section"
              class="category-panel"
              :data-panel-key="category.id"
              :aria-labelledby="'category-' + category.id"
            >
              <div class="category-heading">
                <DragHandle
                  v-if="editingLayout"
                  tag="span"
                  class="drag-handle"
                  title="拖动调整区块位置"
                  aria-hidden="true"
                  ><Rank
                /></DragHandle>
                <span v-else class="category-icon"
                  ><component :is="categoryIcons[category.icon]"
                /></span>
                <div class="category-title">
                  <h2 :id="'category-' + category.id">
                    {{ category.name
                    }}<span class="category-count">{{ category.sites.length }}</span>
                  </h2>
                </div>
                <div v-if="editingLayout" class="move-controls">
                  <button
                    type="button"
                    :disabled="index === 0 || sorting"
                    :aria-label="'前移' + category.name"
                    @click="movePanel(category.id, -1, $event)"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    :disabled="index === visibleCategories.length - 1 || sorting"
                    :aria-label="'后移' + category.name"
                    @click="movePanel(category.id, 1, $event)"
                  >
                    <ArrowDown />
                  </button>
                </div>
                <button
                  v-else
                  type="button"
                  class="category-more"
                  :aria-label="'查看' + category.name + '全部站点'"
                  @click="showCategoryDetails(category)"
                >
                  更多<ArrowRight aria-hidden="true" />
                </button>
              </div>
              <p v-if="selectedTopic !== 'all'" class="category-caption">{{ category.caption }}</p>
              <div class="site-grid">
                <div
                  v-for="(site, siteIndex) in editingLayout
                    ? category.sites
                    : category.sites.slice(0, previewCount)"
                  :key="site.url"
                  class="site-row"
                  :class="{ 'is-site-editing': editingLayout }"
                  :draggable="editingLayout"
                  @dragstart.stop="startSiteDrag(category.id, site.url, $event)"
                  @dragend="cancelSiteDrag"
                  @dragover.prevent.stop
                  @drop.stop="dropSite(category, site.url, $event)"
                >
                  <SiteCard
                    :site="site"
                    :detailed="selectedTopic !== 'all'"
                    @click="recordVisit(site.url)"
                  />
                  <div v-if="editingLayout" class="site-move-controls">
                    <button
                      type="button"
                      :disabled="siteIndex === 0 || sorting"
                      :aria-label="`前移${site.name}`"
                      @click="moveSite(category, site.url, -1, $event)"
                    >
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      :disabled="siteIndex === category.sites.length - 1 || sorting"
                      :aria-label="`后移${site.name}`"
                      @click="moveSite(category, site.url, 1, $event)"
                    >
                      <ArrowDown />
                    </button>
                  </div>
                </div>
              </div>
            </SlickItem>
          </SlickList>
          <div v-if="!visibleSiteCount" class="directory-empty" role="status">
            <Search aria-hidden="true" />
            <h3>暂时没有找到匹配的站点</h3>
            <p>试试更短的关键词，或切换到全部分类。</p>
            <button type="button" @click="resetFilters">重置筛选</button>
          </div>
        </div>
      </div>
    </section>
    <dialog
      ref="detailDialog"
      class="category-detail"
      aria-labelledby="category-detail-title"
      @click="
        (event) => {
          if (event.target === detailDialog) detailDialog?.close()
        }
      "
    >
      <template v-if="detailCategory">
        <header class="category-heading">
          <h2 id="category-detail-title">
            {{ detailCategory.name }} · {{ detailCategory.sites.length }} 站点
          </h2>
          <button type="button" class="category-more" autofocus @click="detailDialog?.close()">
            关闭<Close aria-hidden="true" />
          </button>
        </header>
        <p class="category-caption">{{ detailCategory.caption }}</p>
        <div class="detail-sites">
          <SiteCard
            v-for="site in detailCategory.sites"
            :key="site.url"
            :site="site"
            detailed
            @click="recordVisit(site.url)"
          />
        </div>
      </template>
    </dialog>
    <footer class="entrance-footer">
      <span>{{ visibleCategories.length }} 个区块 · {{ visibleSiteCount }} 个站点</span
      ><span>外部站点在新标签页打开</span>
    </footer>
  </main>
</template>

<style scoped>
.entrance {
  width: 100%;
  min-width: 0;
  container: entrance / inline-size;
  padding: 12px;
  color: var(--color-text);
}
.entrance-overview {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 30px;
  margin-bottom: 10px;
}
h1 {
  font-size: 15px;
  line-height: 1.5;
  font-weight: 650;
  color: var(--color-heading);
}
.overview-count {
  font:
    11px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.portal-links {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.portal-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  background: var(--color-surface);
  text-decoration: none;
  font-size: 12px;
  transition: transform 100ms var(--ease-out);
}
.portal-links svg {
  width: 13px;
  height: 13px;
}
.portal-links svg:last-child {
  transition: transform 160ms var(--ease-out);
}
.featured-section {
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
  margin-bottom: 10px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 28px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-header);
}
.section-heading h2 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}
.section-heading svg {
  width: 12px;
  height: 12px;
}
.section-heading > span {
  color: var(--color-text-muted);
  font-size: 10px;
}
.featured-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 3px;
}
.directory-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.directory-heading h2 {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.directory-search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(100%, 360px);
  min-height: 30px;
  margin-left: auto;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
}
.directory-search:focus-within {
  outline: 1px solid var(--color-accent);
  outline-offset: 1px;
}
.directory-search > svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.directory-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 12px;
}
.directory-search input::placeholder {
  color: var(--color-text-muted);
}
.directory-search button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 0;
  border-radius: 2px;
  color: var(--color-text);
  background: var(--color-background-soft);
  cursor: pointer;
}
.directory-search button svg {
  width: 12px;
  height: 12px;
}
.directory-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 8px;
}
.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  min-width: 0;
}
.category-filters button {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-secondary);
  white-space: nowrap;
  font-size: 11px;
  cursor: pointer;
  transition: transform 100ms var(--ease-out);
}
.category-filters button::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--color-accent-soft);
  opacity: 0;
  transition: opacity 125ms ease;
}
.category-filters button svg {
  width: 12px;
  height: 12px;
}
.category-filters button span {
  font:
    10px ui-monospace,
    monospace;
}
.category-filters button.selected {
  border-color: var(--color-border-hover);
  color: var(--color-accent);
}
.category-filters button.selected::before {
  opacity: 1;
}
.category-filters button:focus-visible::before {
  transition: none;
}
.directory-note {
  margin-left: auto;
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 10px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 310px), 1fr));
  gap: 8px;
  align-items: start;
}
.category-grid.is-topic {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
}
.category-panel {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
}
.category-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 3px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-header);
}
.category-icon {
  display: flex;
  align-items: center;
  color: var(--color-accent);
}
.category-icon svg {
  width: 14px;
  height: 14px;
}
.category-title h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 650;
  color: var(--color-heading);
}
.category-count {
  font:
    10px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.category-more {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 24px;
  padding: 2px 4px;
  margin-left: auto;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 10px;
  cursor: pointer;
}
.category-more svg {
  width: 11px;
  height: 11px;
  transition: transform 160ms var(--ease-out);
}
.site-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 3px;
}
.site-row {
  display: flex;
  align-items: center;
  min-width: 0;
}
.site-row > :deep(.site-card) {
  flex: 1;
}
.site-row.is-site-editing {
  cursor: grab;
}
.site-row.is-site-editing:active {
  cursor: grabbing;
}
.site-move-controls {
  display: flex;
  flex: 0 0 auto;
}
.site-move-controls button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.site-move-controls svg {
  width: 12px;
  height: 12px;
}
.site-move-controls button:focus-visible {
  outline-offset: -1px;
}

.directory-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px;
  border: 1px dashed var(--color-border);
}
.directory-empty > svg {
  width: 20px;
  height: 20px;
}
.directory-empty h3 {
  font-size: 14px;
  font-weight: 600;
}
.directory-empty p {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.directory-empty button {
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
.entrance-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
  font-size: 10px;
  color: var(--color-text-muted);
}
.portal-links a:active:not(:focus-visible),
.category-filters button:active:not(:focus-visible) {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .portal-links a:hover,
  .category-more:hover {
    color: var(--color-accent);
    background: var(--color-accent-soft);
  }
  .portal-links a:hover svg:last-child,
  .category-more:hover svg {
    transform: translateX(2px);
  }
  .category-filters button:hover::before {
    opacity: 0.6;
  }
  .category-filters button.selected:hover::before {
    opacity: 1;
  }
}
@container entrance (max-width: 700px) {
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .entrance-overview {
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .portal-links {
    gap: 4px;
  }
  .directory-note {
    display: none;
  }
  .category-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 2px 1px 5px;
  }
  .category-filters button {
    flex-shrink: 0;
    min-height: 32px;
  }
}
@media (pointer: coarse) {
  .portal-links a,
  .category-more {
    min-height: 32px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .portal-links a,
  .portal-links svg,
  .category-more svg,
  .category-filters button {
    transform: none !important;
    transition: none;
  }
}

.layout-toggle,
.layout-toolbar button,
.topic-summary button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 3px 7px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 11px;
  cursor: pointer;
}
.layout-toggle svg,
.layout-toolbar svg {
  width: 12px;
  height: 12px;
}
.layout-toggle.selected {
  background: var(--color-highlight);
  color: var(--color-on-highlight);
}
.layout-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 8px;
  border: 1px dashed var(--color-border-hover);
  background: var(--color-accent-soft);
  color: var(--color-text-secondary);
  font-size: 11px;
}
.storage-notice {
  padding: 4px 0 8px;
  font-size: 11px;
  color: var(--color-accent);
}
.sort-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.topic-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}
.topic-summary h2 {
  font-size: 13px;
  font-weight: 650;
}
.topic-summary > span {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.topic-summary .topic-stats {
  margin-left: auto;
}
.category-caption {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
.drag-handle {
  user-select: none;
  -webkit-user-select: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 24px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  color: var(--color-accent);
}
.drag-handle svg {
  width: 15px;
  height: 15px;
}
.drag-handle:active {
  cursor: grabbing;
}
.move-controls {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.move-controls button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}
.move-controls svg {
  width: 13px;
  height: 13px;
}
button:disabled {
  cursor: default;
  opacity: 0.45;
}
.is-editing {
  user-select: none;
  -webkit-user-select: none;
}
.category-detail {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  background: var(--color-surface);
}
.category-detail::backdrop {
  background: #0008;
}
.category-detail h2 {
  font-size: 14px;
}
.category-detail .category-heading {
  position: sticky;
  top: 0;
  z-index: 1;
}
.detail-sites {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  padding: 6px;
}
.is-editing .category-heading {
  border-bottom-style: dashed;
}
.category-filters button:focus-visible,
.move-controls button:focus-visible {
  outline-offset: -1px;
}
@media (hover: hover) and (pointer: fine) {
  .move-controls button:hover:not(:disabled),
  .layout-toggle:hover,
  .topic-summary button:hover {
    background: var(--color-accent-soft);
    border-color: var(--color-border-hover);
  }
}
@media (pointer: coarse) {
  .move-controls button,
  .drag-handle {
    width: 32px;
    height: 32px;
  }
}
@container entrance (max-width: 600px) {
  .directory-heading {
    flex-wrap: wrap;
    gap: 6px;
  }
  .directory-search {
    width: 100%;
    order: 3;
  }
  .layout-toggle {
    margin-left: auto;
  }
  .topic-summary .topic-stats {
    margin-left: 0;
  }
}
</style>
<style>
.directory-sort-helper {
  rotate: none;
  animation: none !important;
  writing-mode: horizontal-tb;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
  z-index: 2500;
  outline: 2px solid var(--color-highlight);
  box-shadow: 0 8px 24px #00000026;
  cursor: grabbing;
}
</style>
