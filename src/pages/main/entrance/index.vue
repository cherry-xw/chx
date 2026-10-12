<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
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
import SiteCard from './SiteCard.vue'
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
const siteQuery = ref('')
const directorySearch = ref<HTMLInputElement>()
const categoryGrid = ref<HTMLElement>()
const normalizedQuery = computed(() => siteQuery.value.trim().toLocaleLowerCase())
const siteCount = directory.reduce((count, category) => count + category.sites.length, 0)
const visibleCategories = computed(() =>
  directory
    .filter((category) => selectedTopic.value === 'all' || category.topic === selectedTopic.value)
    .map((category) => ({
      ...category,
      sites: category.sites.filter((site) =>
        `${site.name} ${site.description} ${site.url}`
          .toLocaleLowerCase()
          .includes(normalizedQuery.value)
      )
    }))
    .filter((category) => category.sites.length)
)
const visibleSiteCount = computed(() =>
  visibleCategories.value.reduce((count, category) => count + category.sites.length, 0)
)
function selectTopic(id: DirectoryTopicId | 'all') {
  if (selectedTopic.value === id) return
  selectedTopic.value = id
}
function resetFilters() {
  selectedTopic.value = 'all'
  siteQuery.value = ''
  directorySearch.value?.focus()
}
function clearSiteQuery() {
  siteQuery.value = ''
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
        <div class="directory-search">
          <Search aria-hidden="true" />
          <input
            ref="directorySearch"
            v-model="siteQuery"
            type="search"
            aria-label="筛选本站收录的网站"
            placeholder="查找站点、内容或网址…"
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
              @click="selectTopic('all')"
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
              @click="selectTopic(topic.id)"
              >
              <component :is="categoryIcons[topic.icon]" aria-hidden="true" />{{ topic.name
              }}<span>{{ topic.count }}</span>
            </button>
          </div>
          <span class="directory-note" role="status">{{ visibleSiteCount }} 个站点</span>
        </aside>
        <div v-if="activeTopic" class="topic-summary">
          <h2>{{ activeTopic.name }}</h2>
          <span>{{ activeTopic.caption }}</span>
          <span class="topic-stats"
            >{{ visibleCategories.length }} 个区块 · {{ visibleSiteCount }} 个站点</span
          >
          <button type="button" @click="selectTopic('all')">
            返回全部
          </button>
        </div>
        <div id="directory-results" ref="categoryGrid" class="directory-results">
          <div class="category-grid" :class="{ 'is-topic': selectedTopic !== 'all' }">
            <section
              v-for="category in visibleCategories"
              :key="category.id"
              class="category-panel"
              :data-panel-key="category.id"
              :aria-labelledby="'category-' + category.id"
            >
              <div class="category-heading">
                <span class="category-icon"
                  ><component :is="categoryIcons[category.icon]"
                /></span>
                <div class="category-title">
                  <h2 :id="'category-' + category.id">
                    {{ category.name
                    }}<span class="category-count">{{ category.sites.length }}</span>
                  </h2>
                </div>
              </div>
              <p v-if="selectedTopic !== 'all'" class="category-caption">{{ category.caption }}</p>
              <div class="site-grid">
                <SiteCard
                  v-for="site in category.sites"
                  :key="site.url"
                  :site="site"
                  :detailed="selectedTopic !== 'all'"
                  @click="recordVisit(site.url)"
                />
              </div>
            </section>
          </div>
          <div v-if="!visibleSiteCount" class="directory-empty" role="status">
            <Search aria-hidden="true" />
            <h3>暂时没有找到匹配的站点</h3>
            <p>试试更短的关键词，或切换到全部分类。</p>
            <button type="button" @click="resetFilters">重置筛选</button>
          </div>
        </div>
      </div>
    </section>
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
@container entrance (max-width: 600px) {
  .directory-heading { flex-wrap: wrap; gap: 6px; }
  .directory-search { width: 100%; order: 3; }
  .topic-summary .topic-stats { margin-left: 0; }
}
</style>
