<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
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
import { LAN_HOST, VPN_HOST, personalServices, serviceLinks } from '@/data/personal-services'

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
type AccessFilter = 'all' | 'domain' | 'vpn' | 'lan'
const accessFilter = ref<AccessFilter>('all')
const query = ref('')
const searchInput = ref<HTMLInputElement>()
const results = ref<HTMLElement>()
const services = personalServices.map((service) => ({ ...service, links: serviceLinks(service) }))
const accessOptions: { value: AccessFilter; label: string; count: number }[] = [
  { value: 'all', label: '全部服务', count: services.length },
  {
    value: 'domain',
    label: '外网直达',
    count: services.filter((service) => service.domainUrl).length
  },
  { value: 'vpn', label: '隧道访问', count: services.filter((service) => service.vpn).length },
  { value: 'lan', label: '局域网', count: services.filter((service) => service.lan).length }
]
const filteredServices = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return services
    .filter((service) => {
      const matchesAccess =
        accessFilter.value === 'all' ||
        (accessFilter.value === 'domain' ? !!service.domainUrl : service[accessFilter.value])
      return (
        matchesAccess &&
        `${service.name} ${service.description} ${service.port}`.toLocaleLowerCase().includes(term)
      )
    })
    .map((service) => {
      const preferredLabel =
        accessFilter.value === 'lan'
          ? '局域网打开'
          : accessFilter.value === 'vpn'
            ? '隧道打开'
            : '外网直达'
      const primary =
        service.links.find((link) => link.label === preferredLabel) || service.links[0]
      return { ...service, primary, alternatives: service.links.filter((link) => link !== primary) }
    })
})
function selectAccess(value: AccessFilter) {
  accessFilter.value = value
}
function resetFilters() {
  query.value = ''
  accessFilter.value = 'all'
  searchInput.value?.focus()
}
function clearQuery() {
  query.value = ''
  searchInput.value?.focus()
}
</script>

<template>
  <main class="personal-services">
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
              @keydown.esc="clearQuery"
            />
            <button v-if="query" type="button" aria-label="清空搜索" @click="clearQuery">
              <Close />
            </button>
          </div>
          <div class="access-filters" role="group" aria-label="按访问方式筛选">
            <button
              v-for="option in accessOptions"
              :key="option.value"
              type="button"
              :class="{ selected: accessFilter === option.value }"
              :aria-pressed="accessFilter === option.value"
              @click="selectAccess(option.value)"
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
          <div v-if="filteredServices.length" class="services-grid">
            <article
              v-for="service in filteredServices"
              :key="service.name"
              class="service-card"
              :data-panel-key="service.name"
            >
              <div class="service-heading">
                <span class="service-icon" aria-hidden="true"
                  ><component :is="serviceIcons[service.icon] || Platform"
                /></span>
                <h3>{{ service.name }}</h3>
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
                  :aria-label="service.name + ' · ' + service.primary.label + '（在新标签页打开）'"
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
          <div v-else class="service-empty" role="status">
            <Search aria-hidden="true" />
            <h3>还没有找到这个服务</h3>
            <p>换个关键词，或查看其他访问方式。</p>
            <button type="button" @click="resetFilters">查看全部服务</button>
          </div>
        </div>
      </section>

      <aside class="network-sidebar" aria-label="访问指南">
        <div class="network-heading">
          <Connection aria-hidden="true" />
          <h2>网络入口</h2>
        </div>
        <dl class="network-guide">
          <div>
            <dt>外网</dt>
            <dd>专属域名直达</dd>
          </div>
          <div>
            <dt>隧道</dt>
            <dd>
              <code>{{ VPN_HOST }}</code
              ><span>需连接私人隧道</span>
            </dd>
          </div>
          <div>
            <dt>局域网</dt>
            <dd>
              <code>{{ LAN_HOST }}</code
              ><span>需在同一局域网</span>
            </dd>
          </div>
        </dl>
        <p class="network-note">按实际网络选择入口；未检测服务在线状态。</p>
      </aside>
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
.access-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.access-filters button {
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
.access-filters button::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: var(--color-accent-soft);
  opacity: 0;
  transition: opacity 125ms ease;
}
.access-filters button.selected {
  color: var(--color-accent);
  border-color: var(--color-border-hover);
}
.access-filters button.selected::before {
  opacity: 1;
}
.access-filters button:focus-visible::before {
  transition: none;
}
.access-filters button span {
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
}
.service-card h3 {
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
.network-sidebar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  min-width: 0;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
}
.network-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}
.network-heading h2 {
  font-size: 12px;
  font-weight: 600;
}
.network-heading svg {
  width: 14px;
  height: 14px;
  color: var(--color-accent);
}
.network-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}
.network-guide > div {
  display: flex;
  align-items: center;
  gap: 7px;
}
.network-guide dt {
  font-size: 11px;
  font-weight: 600;
}
.network-guide dd {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-secondary);
}
.network-guide code {
  color: var(--color-accent);
  font-size: 11px;
}
.network-note {
  margin-left: auto;
  font-size: 10px;
  color: var(--color-text-muted);
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
.access-filters button:active:not(:focus-visible) {
  transform: scale(0.97);
}
.service-card:focus-within::after {
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
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
  .access-filters button:hover::before {
    opacity: 0.6;
  }
  .access-filters button.selected:hover::before {
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
  .network-guide {
    flex-direction: column;
  }
  .network-note {
    margin-left: 0;
  }
}
@media (pointer: coarse) {
  .primary-link,
  .alternative-links a,
  .access-filters button {
    min-height: 34px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .service-card::before {
    transition: none;
  }
  .primary-link,
  .primary-link svg,
  .access-filters button {
    transform: none !important;
    transition: none;
  }
}
</style>
