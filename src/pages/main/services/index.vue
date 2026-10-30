<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import {
  TopRight,
  Connection,
  Search,
  Close,
  Lock,
  HomeFilled,
  Switch,
  Film,
  Download,
  Bottom,
  Monitor,
  Cpu,
  Platform,
  Timer,
  Printer
} from '@element-plus/icons-vue'
import { usePanelMotion } from '@/composables/usePanelMotion'
import MotionGlow from '@/components/motion/MotionGlow.vue'
import MotionText from '@/components/motion/MotionText.vue'
import { useAmbientFocus } from '@/composables/useAmbientFocus'
import {
  personalServices,
  serviceCategories,
  serviceLinks,
  type ServiceCategoryId
} from '@/data/personal-services'

defineOptions({ name: 'PersonalServicesView' })
const currentHost = window.location.hostname
const serviceIcons: Readonly<Record<string, Component>> = {
  Lock,
  HomeFilled,
  Switch,
  Film,
  Download,
  Bottom,
  Monitor,
  Cpu,
  Connection,
  Platform,
  Timer,
  Printer
}
type CategoryFilter = 'all' | ServiceCategoryId
const categoryFilter = ref<CategoryFilter>('all')
const query = ref('')
const searchInput = ref<HTMLInputElement>()
const results = ref<HTMLElement>()
const { update: updatePanels, cancel: cancelAnimation } = usePanelMotion(results, '.service-card')
const services = personalServices.map((service) => ({ ...service, links: serviceLinks(service) }))
const categoryOptions: { value: CategoryFilter; label: string; count: number }[] = [
  { value: 'all', label: '全部服务', count: services.length },
  ...serviceCategories.map((category) => ({
    value: category.id,
    label: category.name,
    count: services.filter((service) => service.category === category.id).length
  }))
]
const filteredServices = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return services
    .filter(
      (service) =>
        (categoryFilter.value === 'all' || service.category === categoryFilter.value) &&
        `${service.name} ${service.description} ${service.port}`.toLocaleLowerCase().includes(term)
    )
    .map((service) => ({
      ...service,
      primary: service.links[0],
      alternatives: service.links.slice(1)
    }))
})
const groupedServices = computed(() =>
  serviceCategories
    .filter((category) => categoryFilter.value === 'all' || category.id === categoryFilter.value)
    .map((category) => ({
      ...category,
      services: filteredServices.value.filter((service) => service.category === category.id)
    }))
    .filter((group) => group.services.length > 0)
)
const groupsWidth = ref(0)
const masonryColumns = computed(() => {
  const groupCount = groupedServices.value.length
  if (groupCount <= 1) return groupCount
  if (!groupsWidth.value) return 0
  const gap = 8
  const minColumnWidth = 285
  const maxByWidth = Math.max(1, Math.floor((groupsWidth.value + gap) / (minColumnWidth + gap)))
  return Math.min(groupCount, maxByWidth, 5)
})
let groupsObserver: ResizeObserver | undefined
onMounted(() => {
  if (!results.value) return
  groupsObserver = new ResizeObserver(([entry]) => {
    groupsWidth.value = entry.contentRect.width
  })
  groupsObserver.observe(results.value)
})
onBeforeUnmount(() => groupsObserver?.disconnect())
const servicesRoot = ref<HTMLElement>()
const { running: pageMotion } = useAmbientFocus(
  servicesRoot,
  () => filteredServices.value.map((service) => service.name).join('|'),
  () => !!query.value.trim()
)
async function selectCategory(value: CategoryFilter, event: MouseEvent) {
  if (categoryFilter.value === value) return
  await updatePanels(() => {
    categoryFilter.value = value
  }, event)
}
function resetFilters() {
  cancelAnimation()
  query.value = ''
  categoryFilter.value = 'all'
  searchInput.value?.focus()
}
function clearQuery() {
  cancelAnimation()
  query.value = ''
  searchInput.value?.focus()
}
</script>

<template>
  <main ref="servicesRoot" class="personal-services" :data-motion-active="pageMotion">
    <header class="services-header">
      <h1>个人服务</h1>
      <span>{{ services.length }} 个服务</span
      ><span class="current-host"
        >当前来源 <code>{{ currentHost }}</code></span
      >
    </header>

    <div class="services-layout">
      <section class="service-directory" aria-label="个人服务目录">
        <div class="directory-toolbar">
          <div class="service-search">
            <Search aria-hidden="true" />
            <input
              ref="searchInput"
              v-model="query"
              type="search"
              placeholder="搜索服务、用途或端口…"
              aria-label="搜索个人服务"
              @input="cancelAnimation"
              @keydown.esc="clearQuery"
            />
            <button v-if="query" type="button" aria-label="清空搜索" @click="clearQuery">
              <Close />
            </button>
          </div>
          <div class="category-filters" role="group" aria-label="按业务分类筛选">
            <button
              v-for="option in categoryOptions"
              :key="option.value"
              type="button"
              :class="{ selected: categoryFilter === option.value }"
              :aria-pressed="categoryFilter === option.value"
              @click="selectCategory(option.value, $event)"
            >
              {{ option.label }}<span>{{ option.count }}</span>
            </button>
          </div>
        </div>
        <div class="results-heading">
          <h2>服务目录</h2>
          <span role="status">{{ filteredServices.length }} 个匹配服务</span>
        </div>
        <div ref="results">
          <div
            v-if="filteredServices.length"
            class="services-groups"
            :style="masonryColumns ? { columnCount: masonryColumns } : undefined"
          >
            <section
              v-for="group in groupedServices"
              :key="group.id"
              class="service-group"
              :aria-labelledby="`service-group-${group.id}`"
            >
              <div class="group-heading">
                <h3 :id="`service-group-${group.id}`">{{ group.name }}</h3>
                <span>{{ group.caption }}</span>
                <span class="group-count">{{ group.services.length }}</span>
              </div>
              <div class="services-grid">
                <article
                  v-for="service in group.services"
                  :key="service.name"
                  class="service-card motion-focus-target motion-row"
                  :data-panel-key="service.name"
                  :data-focus-key="service.name"
                  data-focus-kind="service"
                >
                  <MotionGlow />
                  <div class="service-heading">
                    <span class="service-icon" aria-hidden="true"
                      ><component :is="serviceIcons[service.icon] || Platform"
                    /></span>
                    <h4><MotionText :text="service.name" /></h4>
                    <span class="service-port" :aria-label="'端口 ' + service.port"
                      >:{{ service.port }}</span
                    >
                  </div>
                  <p class="service-description">{{ service.description }}</p>
                  <p v-if="service.primary" class="service-address" :title="service.primary.url">
                    {{ service.primary.url.replace(/^https?:\/\//, '') }}
                  </p>
                  <div class="service-links">
                    <a
                      v-if="service.primary"
                      class="primary-link"
                      :href="service.primary.url"
                      :title="service.primary.url"
                      :aria-label="
                        service.name + ' · ' + service.primary.label + '（在新标签页打开）'
                      "
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ service.primary.label }}<TopRight aria-hidden="true" />
                    </a>
                    <div v-if="service.alternatives.length" class="alternative-links">
                      <a
                        v-for="link in service.alternatives"
                        :key="link.url"
                        :href="link.url"
                        :title="link.url"
                        :aria-label="service.name + ' · ' + link.label + '（在新标签页打开）'"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ link.label }}<TopRight aria-hidden="true"
                      /></a>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
          <div v-else class="service-empty" role="status">
            <Search aria-hidden="true" />
            <h3>还没有找到这个服务</h3>
            <p>换个关键词，或查看其他业务分类。</p>
            <button type="button" @click="resetFilters">查看全部服务</button>
          </div>
        </div>
      </section>
    </div>
    <footer>
      <span>chery / 个人服务</span
      ><span>所有服务在新标签页打开 <TopRight aria-hidden="true" /></span>
    </footer>
  </main>
</template>

<style scoped>
.personal-services {
  width: 100%;
  min-width: 0;
  container: services / inline-size;
  padding: 12px;
  color: var(--color-text);
}
.services-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-height: 30px;
  margin-bottom: 10px;
}
h1 {
  font-size: 15px;
  line-height: 1.5;
  font-weight: 650;
  color: var(--color-heading);
}
.services-header > span {
  font-size: 11px;
  color: var(--color-text-muted);
}
.services-header .current-host {
  margin-left: auto;
}
.current-host code {
  margin-left: 6px;
  color: var(--color-text);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.service-directory {
  min-width: 0;
}
.directory-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 3px;
}
.service-search {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-background);
}
.service-search:focus-within {
  outline: 1px solid var(--color-accent);
  outline-offset: 1px;
}
.service-search > svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.service-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 12px;
}
.service-search input::placeholder {
  color: var(--color-text-muted);
}
.service-search button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 0;
  border-radius: 2px;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}
.service-search button svg {
  width: 12px;
  height: 12px;
}
.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.category-filters button {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: transform 100ms var(--ease-out);
}
.category-filters button::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: var(--color-accent-soft);
  opacity: 0;
  transition: opacity 125ms ease;
}
.category-filters button.selected {
  color: var(--color-accent);
  border-color: var(--color-border-hover);
}
.category-filters button.selected::before {
  opacity: 1;
}
.category-filters button:focus-visible::before {
  transition: none;
}
.category-filters button span {
  font:
    10px ui-monospace,
    monospace;
}
.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 10px 0 6px;
}
.results-heading h2 {
  font-size: 12px;
  font-weight: 600;
}
.results-heading > span {
  font-size: 10px;
  color: var(--color-text-muted);
}
.services-groups {
  columns: 285px 5;
  column-gap: 8px;
  column-fill: balance;
}
.service-group {
  min-width: 0;
  margin-bottom: 12px;
  padding: 7px;
  border: 1px solid var(--color-border);
  border-top: 2px solid var(--color-border-hover);
  border-radius: 2px;
  break-inside: avoid;
  break-inside: avoid-column;
}
.group-heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: -7px -7px 7px;
  padding: 5px 7px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-header);
  break-after: avoid;
}
.group-heading h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-heading);
}
.group-heading > span {
  font-size: 10px;
  color: var(--color-text-muted);
}
.group-heading .group-count {
  margin-left: auto;
  font:
    10px ui-monospace,
    monospace;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 285px), 1fr));
  gap: 8px;
  align-items: stretch;
}
.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
}
.service-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 2px;
  background: var(--color-highlight);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 160ms var(--ease-out);
  pointer-events: none;
}
.service-card:focus-within::before {
  transform: scaleX(1);
  transition: none;
}
.service-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border: 1px solid var(--color-highlight);
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 125ms ease;
}
.service-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-panel-header);
}
.service-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--color-accent);
}
.service-icon svg {
  width: 15px;
  height: 15px;
  animation: service-icon-drift 2600ms var(--ease-out) infinite alternate paused;
}
.service-card h4 {
  min-width: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  overflow-wrap: anywhere;
  color: var(--color-heading);
}
.service-port {
  margin-left: auto;
  font:
    11px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.service-card[data-ambient='true'] .service-heading {
  background: var(--color-accent-soft);
}
.service-card[data-ambient='true'] h4 {
  color: var(--color-accent);
}
.personal-services[data-motion-active='true'] .service-card[data-ambient='true'] .service-icon svg {
  animation-play-state: running;
}
@keyframes service-icon-drift {
  to {
    transform: translateY(-1px) rotate(-8deg);
  }
}
.service-description {
  padding: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
.service-address {
  padding: 0 8px 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font:
    11px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.service-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 7px;
  margin-top: auto;
  padding: 0 8px 8px;
}
.primary-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 7px;
  border: 1px solid var(--color-border-hover);
  border-radius: 2px;
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: transform 100ms var(--ease-out);
}
.primary-link svg {
  width: 12px;
  height: 12px;
  transition: transform 160ms var(--ease-out);
}
.alternative-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.alternative-links a {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 28px;
  padding: 3px;
  font-size: 11px;
  color: var(--color-text-secondary);
  text-decoration: none;
}
.alternative-links svg {
  width: 10px;
  height: 10px;
}
.service-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px;
  border: 1px dashed var(--color-border);
  text-align: center;
}
.service-empty > svg {
  width: 20px;
  height: 20px;
}
.service-empty h3 {
  font-size: 14px;
  font-weight: 600;
}
.service-empty p {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.service-empty button {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
footer {
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
footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
footer svg {
  width: 10px;
  height: 10px;
}
.primary-link:active:not(:focus-visible),
.category-filters button:active:not(:focus-visible) {
  transform: scale(0.97);
}
.service-card:focus-within::after {
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
  .personal-services[data-motion-active='true'] .service-card:hover .service-icon svg {
    animation-play-state: running;
  }
  .service-card:hover::before {
    transform: scaleX(1);
  }
  .service-card:hover::after {
    opacity: 1;
  }
  .primary-link:hover svg {
    transform: translate(2px, -2px);
  }
  .alternative-links a:hover {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .category-filters button:hover::before {
    opacity: 0.6;
  }
  .category-filters button.selected:hover::before {
    opacity: 1;
  }
}
@container services (max-width: 600px) {
  .services-header .current-host {
    margin-left: 0;
  }
  .service-search {
    max-width: none;
    flex-basis: 100%;
  }
}
@media (pointer: coarse) {
  .primary-link,
  .alternative-links a,
  .category-filters button {
    min-height: 34px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .service-card::before {
    transition: none;
  }
  .primary-link,
  .primary-link svg,
  .category-filters button {
    transform: none !important;
    transition: none;
  }
}
</style>
