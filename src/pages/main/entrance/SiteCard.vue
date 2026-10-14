<script setup lang="ts">
import { computed } from 'vue'
import type { DirectorySite } from '@/data/directory'
import { useLinkOpeningStore } from '@/stores/link-opening'

const props = defineProps<{ site: DirectorySite; featured?: boolean; detailed?: boolean }>()
const domain = computed(() => new URL(props.site.url).hostname.replace(/^www\./, ''))
const opening = useLinkOpeningStore()
</script>

<template>
  <a
    class="site-card"
    :class="{ featured, detailed }"
    draggable="false"
    :href="site.url"
    :target="opening.target"
    rel="noopener noreferrer"
    :aria-label="site.name + '（' + opening.description + '）'"
  >
    <span
      class="site-mark"
      :class="{ 'is-single': site.mark.length === 1, 'is-long': site.mark.length > 2 }"
      :style="{ '--site-color': site.color }"
      aria-hidden="true"
      >{{ site.mark }}</span
    >
    <span class="site-copy">
      <span class="site-name" :title="site.name">{{ site.name }}</span>
      <span v-if="detailed" class="site-domain">{{ domain }}</span>
      <span class="site-description" :title="site.description">{{ site.description }}</span>
    </span>
  </a>
</template>

<style scoped>
.site-card {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  min-height: 30px;
  padding: 4px 6px;
  border-radius: 2px;
  text-decoration: none;
  color: var(--color-text);
  transition: transform 100ms var(--ease-out);
}
.site-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--color-accent-soft);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 125ms ease;
}
.site-mark {
  display: grid;
  place-items: center;
  flex: 0 0 20px;
  height: 20px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--site-color) 16%, var(--color-surface));
  color: var(--color-text);
  font:
    650 11px Arial,
    sans-serif;
  transition: transform 160ms var(--ease-out);
}
.site-mark.is-single {
  font-size: 11px;
}
.site-mark.is-long {
  font-size: 8px;
}
.site-copy {
  display: grid;
  grid-template-columns: minmax(70px, 0.85fr) minmax(0, 1.3fr);
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.site-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.5;
}
.site-description {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.featured .site-copy {
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}
.featured {
  padding: 5px 7px;
}
.featured .site-mark {
  flex-basis: 24px;
  height: 24px;
  font-size: 12px;
}
.featured .site-mark.is-long {
  font-size: 9px;
}
.site-card:focus-visible {
  outline-offset: -1px;
}
.site-card:focus-visible::before {
  opacity: 1;
  transition: none;
}
.site-card:focus-visible .site-name {
  color: var(--color-accent);
}
.site-card:active:not(:focus-visible) {
  transform: scale(0.985);
}
@media (hover: hover) and (pointer: fine) {
  .site-card:hover::before {
    opacity: 1;
  }
  .site-card:hover .site-mark {
    transform: scale(1.06);
  }
  .site-card:hover .site-name {
    color: var(--color-accent);
  }
  .site-card:active .site-mark {
    transform: none;
  }
}
@media (pointer: coarse) {
  .site-card {
    min-height: 36px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .site-card,
  .site-mark {
    transform: none !important;
    transition: none;
  }
}
.detailed {
  gap: 10px;
  padding: 7px 6px;
}
.detailed .site-mark {
  flex-basis: 36px;
  height: 36px;
  font-size: 16px;
}
.detailed .site-mark.is-single {
  font-size: 20px;
}
.detailed .site-mark.is-long {
  font-size: 11px;
}
.detailed .site-copy {
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 2px 7px;
}
.detailed .site-name {
  font-weight: 600;
}
.site-domain {
  min-width: 0;
  max-width: 100%;
  justify-self: end;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font:
    10px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.detailed .site-description {
  grid-column: 1 / -1;
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
@container entrance (max-width: 400px) {
  .site-domain {
    max-width: 120px;
  }
}
</style>
