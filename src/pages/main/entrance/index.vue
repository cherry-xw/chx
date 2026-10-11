<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import {
  ChatDotRound,
  Collection,
  Compass,
  Film,
  Link,
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
  Connection
} from '@element-plus/icons-vue'
import { directory, featuredSites, type DirectorySite } from '@/data/directory'
import SiteCard from './SiteCard.vue'
import { maxHeat, MIN_ACTIVE_SCORE, pickTopByHeat, readHeat, recordHeat, writeHeat } from '@/utils/usage-heat'

defineOptions({ name: 'EntranceView' })
const selectedCategory = ref('all')
const siteQuery = ref('')
const directorySearch = ref<HTMLInputElement>()
const filterMotion = ref(false)
const normalizedQuery = computed(() => siteQuery.value.trim().toLocaleLowerCase())
const siteCount = directory.reduce((count, category) => count + category.sites.length, 0)
const visibleCategories = computed(() =>
  directory
    .filter(
      (category) => selectedCategory.value === 'all' || category.id === selectedCategory.value
    )
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
function selectCategory(id: string, event: MouseEvent) {
  filterMotion.value = event.detail > 0
  selectedCategory.value = id
}
function resetFilters() {
  filterMotion.value = false
  selectedCategory.value = 'all'
  siteQuery.value = ''
  directorySearch.value?.focus()
}
function browseDirectory() {
  directorySearch.value?.focus()
}
function clearSiteQuery() {
  siteQuery.value = ''
  filterMotion.value = false
  directorySearch.value?.focus()
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
    <div class="entrance-overview">
      <section class="welcome" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="eyebrow"><span></span> A LITTLE CURIOSITY, EVERY DAY</p>
          <h1 id="welcome-title">好奇的世界，<span>一触即达。</span></h1>
          <p class="welcome-description">
            从一部好番、一段视频，到一个新发现。<br
              class="mobile-break"
            />把喜欢的内容，都收在这里。
          </p>
          <div class="welcome-actions">
            <button type="button" class="explore-button" @click="browseDirectory">
              开始探索 <ArrowRight aria-hidden="true" />
            </button>
            <RouterLink class="workbench-link" to="/main/mqtt">
              <Connection aria-hidden="true" /> MQTT 工作台 <ArrowRight aria-hidden="true" />
            </RouterLink>
          </div>
          <div class="welcome-meta">
            <span><Collection />{{ directory.length }} 个精选分类</span><i></i
            ><span><Link />{{ siteCount }} 个探索入口</span>
          </div>
        </div>
        <div class="welcome-art" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <span class="art-dot dot-one"></span><span class="art-dot dot-two"></span>
          <span class="art-tile tile-video"><VideoPlay /></span>
          <span class="art-tile tile-compass"><Compass /></span>
          <span class="art-tile tile-star"><Star /></span>
          <span class="art-caption">STAY CURIOUS.</span>
        </div>
      </section>

      <section class="featured-section" aria-labelledby="featured-title">
        <div class="section-heading">
          <h2 id="featured-title"><Star />常用入口</h2>
          <span>熟悉的地方，随时出发</span>
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
    </div>

    <section class="directory-section" aria-label="分类站点导航">
      <div class="directory-heading">
        <div>
          <p class="directory-kicker">YOUR NEXT DISCOVERY</p>
          <h2>找到你的下一站</h2>
        </div>
        <div class="directory-search">
          <Search aria-hidden="true" />
          <input
            ref="directorySearch"
            v-model="siteQuery"
            type="search"
            aria-label="筛选本站收录的网站"
            placeholder="查找站点、内容或网址…"
            @input="filterMotion = false"
            @keydown.esc="siteQuery = ''"
          />
          <button v-if="siteQuery" type="button" aria-label="清空站点筛选" @click="clearSiteQuery">
            <Close />
          </button>
        </div>
      </div>
      <div class="directory-toolbar">
        <div class="category-filters" role="group" aria-label="筛选站点分类">
          <button
            type="button"
            :class="{ selected: selectedCategory === 'all' }"
            :aria-pressed="selectedCategory === 'all'"
            @click="selectCategory('all', $event)"
          >
            全部站点 <span>{{ siteCount }}</span>
          </button>
          <button
            v-for="category in directory"
            :key="category.id"
            type="button"
            :class="{ selected: selectedCategory === category.id }"
            :aria-pressed="selectedCategory === category.id"
            @click="selectCategory(category.id, $event)"
          >
            <component :is="categoryIcons[category.icon]" aria-hidden="true" />{{ category.name }}
          </button>
        </div>
        <span class="directory-note" role="status">{{ visibleSiteCount }} 个站点</span>
      </div>
      <div
        class="category-grid"
        :class="{ single: selectedCategory !== 'all', 'filter-motion': filterMotion }"
      >
        <section
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-panel"
          :aria-labelledby="'category-' + category.id"
        >
          <div class="category-heading">
            <span class="category-icon"><component :is="categoryIcons[category.icon]" /></span>
            <div>
              <h2 :id="'category-' + category.id">{{ category.name }}</h2>
              <p>{{ category.caption }}</p>
            </div>
            <span class="category-count">{{ String(category.sites.length).padStart(2, '0') }}</span>
          </div>
          <div class="site-grid">
            <SiteCard
              v-for="site in category.sites"
              :key="site.url"
              :site="site"
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
    </section>
    <footer class="entrance-footer">
      <span class="footer-brand">chery<span> / </span>探索有趣，连接喜欢。</span
      ><span>所有站点在新标签页打开</span>
    </footer>
  </main>
</template>

<style scoped>
.entrance {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  width: 100%;
  min-width: 0;
  container: entrance / inline-size;
  padding: 24px clamp(16px, 2vw, 32px) 20px;
}
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 252px;
  padding: 28px 36px;
  overflow: hidden;
  position: relative;
  background: var(--color-hero);
  border: 1px solid color-mix(in srgb, var(--color-hero-line) 40%, transparent);
  border-radius: 18px;
}
.welcome-copy {
  min-width: 0;
  z-index: 1;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 650;
  color: var(--color-accent);
}
.eyebrow span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
h1 {
  margin: 13px 0 9px;
  font-size: clamp(25px, 2.5vw, 34px);
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--color-heading);
}
h1 span {
  color: var(--color-accent);
  font-weight: inherit;
}
.welcome-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.9;
}
.mobile-break {
  display: none;
}
.welcome-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 18px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.welcome-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.welcome-meta svg {
  width: 12px;
  height: 12px;
}
.welcome-meta i {
  height: 10px;
  width: 1px;
  background: var(--color-hero-line);
}
.welcome-art {
  position: relative;
  width: 260px;
  height: 162px;
  flex-shrink: 0;
  color: var(--color-accent);
}
.orbit {
  position: absolute;
  border: 1px solid var(--color-hero-line);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
}
.orbit-one {
  width: 252px;
  height: 128px;
}
.orbit-two {
  width: 180px;
  height: 184px;
}
.art-tile {
  display: grid;
  place-items: center;
  position: absolute;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 20px #25203b0a;
  border-radius: 16px;
}
.tile-compass {
  left: 97px;
  top: 41px;
  width: 76px;
  height: 76px;
  transform: rotate(-12deg);
}
.tile-compass svg {
  width: 43px;
  height: 43px;
  stroke-width: 1px;
}
.tile-video {
  left: 23px;
  top: 20px;
  width: 45px;
  height: 45px;
  color: #c57c93;
  transform: rotate(-14deg);
}
.tile-star {
  right: 12px;
  bottom: 25px;
  width: 43px;
  height: 43px;
  color: #bd9250;
  transform: rotate(14deg);
}
.tile-video svg,
.tile-star svg {
  width: 24px;
  height: 24px;
}
.art-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  background: var(--color-hero-line);
  border-radius: 50%;
}
.dot-one {
  top: 3px;
  right: 62px;
}
.dot-two {
  bottom: 12px;
  left: 54px;
  width: 5px;
  height: 5px;
}
.art-caption {
  position: absolute;
  bottom: 0;
  left: 89px;
  font-size: 10px;
  letter-spacing: 2px;
}
.featured-section {
  margin-top: 27px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 13px;
  gap: 12px;
}
.section-heading h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 650;
}
.section-heading h2 svg {
  width: 15px;
  height: 15px;
  color: var(--color-accent);
}
.section-heading > span {
  font-size: 13px;
  color: var(--color-text-muted);
}
.featured-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.directory-section {
  margin-top: 28px;
}
.directory-toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 12px 0;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.category-filters {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}
.category-filters button {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  min-height: 40px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: transform 160ms var(--ease-out);
}
.category-filters .selected {
  background: var(--color-accent-soft);
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
  font-weight: 600;
  box-shadow: var(--color-card-shadow);
}
.category-filters button span {
  font-size: 12px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--color-accent-soft);
  font-variant-numeric: tabular-nums;
}
.directory-note {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr));
  gap: 20px;
}
.category-panel {
  container: site-category / inline-size;
  min-width: 0;
  padding: 21px 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: var(--color-card-shadow);
}
.category-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 15px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}
.category-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
}
.category-icon svg {
  width: 18px;
  height: 18px;
}
.category-heading h2 {
  font-size: 16px;
  font-weight: 650;
  color: var(--color-heading);
}
.category-heading p {
  margin-top: 1px;
  font-size: 12px;
  color: var(--color-text-muted);
}
.category-count {
  margin-left: auto;
  color: var(--color-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 5px;
}
.category-grid.single {
  grid-template-columns: 1fr;
}
.single .site-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
}
.entrance-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 27px;
  padding-bottom: 4px;
  color: var(--color-text-muted);
  font-size: 12px;
}
.footer-brand {
  letter-spacing: 0.5px;
}
.footer-brand > span {
  margin: 0 7px;
  color: var(--color-border-hover);
}
@media (hover: hover) and (pointer: fine) {
  .category-filters button:hover {
    color: var(--color-accent);
    background: var(--color-accent-soft);
  }
}
@container entrance (max-width: 1150px) {
  .welcome {
    padding: 25px;
  }
  .welcome-art {
    width: 225px;
    transform: scale(0.85);
    transform-origin: right center;
  }
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .category-grid {
    gap: 14px;
  }
  .category-panel {
    padding: 18px 10px 10px;
  }
  .directory-note {
    display: none;
  }
}
@container entrance (max-width: 950px) {
  .welcome-art {
    display: none;
  }
}
@container entrance (max-width: 600px) {
  .welcome {
    min-height: 185px;
    padding: 22px;
    border-radius: 14px;
  }
  .eyebrow {
    font-size: 10px;
    letter-spacing: 1.2px;
  }
  h1 {
    font-size: 26px;
    letter-spacing: -0.7px;
  }
  .mobile-break {
    display: initial;
  }
  .welcome-description {
    font-size: 13px;
  }
  .featured-grid {
    gap: 9px;
  }
  .section-heading > span {
    font-size: 12px;
  }
  .directory-toolbar {
    margin-inline: -4px;
    padding-inline: 4px;
  }
  .category-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 4px;
    gap: 2px;
  }
  .category-filters button {
    padding: 8px 10px;
    font-size: 13px;
  }
  .site-grid,
  .single .site-grid {
    grid-template-columns: 1fr;
  }
  .category-panel {
    padding: 18px 12px 10px;
  }
  .entrance-footer {
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
}

.welcome-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}
.explore-button,
.workbench-link,
.directory-empty button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: transform 160ms var(--ease-out);
}
.explore-button,
.directory-empty button {
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: var(--color-surface);
}
.workbench-link {
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}
.welcome-actions svg {
  width: 16px;
  height: 16px;
  transition: transform 200ms var(--ease-out);
}
.art-tile,
.orbit,
.art-dot {
  transition: transform 250ms var(--ease-out);
}
.welcome-art::before {
  content: '';
  position: absolute;
  inset: 5% 10%;
  border-radius: 50%;
  background: radial-gradient(ellipse, var(--color-accent-soft), transparent 70%);
}
.directory-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
}
.directory-kicker {
  color: var(--color-text-muted);
  letter-spacing: 1.8px;
  font-size: 10px;
  margin-bottom: 5px;
}
.directory-heading h2 {
  color: var(--color-heading);
  font-size: 20px;
  font-weight: 650;
}
.directory-search {
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(340px, 48%);
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}
.directory-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
.directory-search > svg {
  width: 16px;
  flex-shrink: 0;
  color: var(--color-text-muted);
}
.directory-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
}
.directory-search input::placeholder {
  color: var(--color-text-muted);
}
.directory-search input::-webkit-search-cancel-button {
  display: none;
}
.directory-search button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: var(--color-background-soft);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.directory-search button svg {
  width: 14px;
}
.category-filters button > svg {
  width: 14px;
  height: 14px;
  transition: transform 160ms var(--ease-out);
}
.category-filters .selected::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: calc(50% - 8px);
  width: 16px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-accent);
}
.category-icon {
  transition: transform 200ms var(--ease-out);
}
.directory-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 44px 20px;
  border: 1px dashed var(--color-border-hover);
  border-radius: 14px;
  text-align: center;
}
.directory-empty > svg {
  width: 32px;
  color: var(--color-accent);
}
.directory-empty h3 {
  font-size: 17px;
  color: var(--color-heading);
}
.directory-empty p {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.entrance button:focus-visible,
.workbench-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  transition: none;
}
.entrance button:active:not(:focus-visible),
.workbench-link:active:not(:focus-visible) {
  transform: scale(0.97);
}
.filter-motion .category-panel {
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}
@starting-style {
  .filter-motion .category-panel {
    opacity: 0;
    transform: translateY(6px);
  }
}
@media (hover: hover) and (pointer: fine) {
  .welcome:hover .tile-compass {
    transform: translateY(-4px) rotate(0deg);
  }
  .welcome:hover .tile-video {
    transform: translate(-4px, -3px) rotate(-20deg);
  }
  .welcome:hover .tile-star {
    transform: translate(4px, -3px) rotate(24deg);
  }
  .welcome:hover .orbit-one {
    transform: translate(-50%, -50%) rotate(-14deg);
  }
  .welcome:hover .orbit-two {
    transform: translate(-50%, -50%) rotate(-35deg);
  }
  .welcome:hover .dot-one {
    transform: translate(4px, -3px);
  }
  .welcome:hover .dot-two {
    transform: translate(-4px, 3px);
  }
  .explore-button:hover svg,
  .workbench-link:hover svg:last-child {
    transform: translateX(3px);
  }
  .workbench-link:hover {
    border-color: var(--color-accent);
  }
  .category-filters button:hover > svg {
    transform: rotate(-9deg) scale(1.08);
  }
  .category-panel:hover .category-icon {
    transform: rotate(-5deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .entrance *,
  .entrance *::before,
  .entrance *::after {
    transition: none !important;
    animation: none !important;
  }
  .entrance button:active,
  .workbench-link:active,
  .welcome-actions svg,
  .category-icon,
  .category-filters button > svg,
  .art-dot {
    transform: none !important;
  }
  .welcome:hover .tile-compass {
    transform: rotate(-12deg);
  }
  .welcome:hover .tile-video {
    transform: rotate(-14deg);
  }
  .welcome:hover .tile-star {
    transform: rotate(14deg);
  }
  .welcome:hover .orbit {
    transform: translate(-50%, -50%) rotate(-25deg);
  }
  .filter-motion .category-panel {
    opacity: 1;
    transform: none;
  }
}
@container entrance (max-width: 600px) {
  .directory-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
  .directory-search {
    width: 100%;
  }
  .welcome-actions {
    gap: 8px;
  }
  .welcome-actions > * {
    padding-inline: 10px;
    font-size: 12px;
  }
  .category-filters button {
    min-height: 44px;
  }
}

.entrance-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
.entrance-overview .featured-section {
  margin-top: 0;
  min-width: 0;
}
@container entrance (min-width: 1480px) {
  .entrance-overview {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    align-items: stretch;
  }
  .featured-section {
    display: flex;
    flex-direction: column;
  }
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex: 1;
  }
  .welcome {
    min-height: 240px;
  }
}
@container site-category (max-width: 420px) {
  .site-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
