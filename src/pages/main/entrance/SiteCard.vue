<script setup lang="ts">
import { TopRight } from '@element-plus/icons-vue'
import { onBeforeUnmount } from 'vue'
import type { DirectorySite } from '@/data/directory'

defineProps<{ site: DirectorySite; featured?: boolean }>()
let bounce: Animation | undefined
function animateMark(event: PointerEvent, leaving = false) {
  if (
    event.pointerType !== 'mouse' ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const mark = (event.currentTarget as HTMLElement).querySelector('.site-mark')
  if (!mark) return
  const current = getComputedStyle(mark).transform
  bounce?.cancel()
  const direction = leaving ? -1 : 1
  bounce = mark.animate(
    [
      { transform: current === 'none' ? 'rotate(0deg)' : current },
      { transform: `rotate(${direction * 7}deg) scale(1.04)` },
      { transform: `rotate(${-direction * 3}deg) scale(1.01)` },
      { transform: 'rotate(0deg) scale(1)' }
    ],
    { duration: 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
  )
}
onBeforeUnmount(() => bounce?.cancel())
</script>

<template>
  <a
    class="site-card"
    :class="{ featured }"
    :href="site.url"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="site.name + '（在新标签页打开）'"
    @pointerenter="animateMark($event)"
    @pointerleave="animateMark($event, true)"
  >
    <span class="site-mark" :style="{ '--site-color': site.color }" aria-hidden="true">{{
      site.mark
    }}</span>
    <span class="site-copy">
      <span class="site-name">{{ site.name }}</span>
      <span class="site-description">{{ site.description }}</span>
    </span>
    <TopRight class="site-arrow" aria-hidden="true" />
  </a>
</template>

<style scoped>
.site-card {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  isolation: isolate;
  transition: transform 160ms var(--ease-out);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 11px;
  text-decoration: none;
  color: var(--color-text);
}
.site-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--color-accent-soft);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  opacity: 0;
  transition: opacity 180ms ease;
}
.site-mark {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--site-color) 12%, var(--color-surface));
  color: var(--site-color);
  font-size: 20px;
  font-weight: 750;
  font-family: Arial, sans-serif;
}
.site-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.site-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}
.site-description {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.site-arrow {
  flex: 0 0 13px;
  width: 13px;
  height: 13px;
  margin-left: auto;
  color: var(--color-text-muted);
  opacity: 0;
  transform: translate(-3px, 3px);
  transition:
    transform 180ms var(--ease-out),
    opacity 180ms ease;
}
.featured {
  padding: 17px;
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--color-card-shadow);
}
.featured .site-arrow {
  opacity: 0.65;
}
.site-card:focus-visible {
  outline-offset: 1px;
}
.site-card:focus-visible .site-arrow {
  opacity: 1;
  transform: none;
  transition: none;
}
.site-card:active:not(:focus-visible) {
  transform: scale(0.985);
}
@media (hover: hover) and (pointer: fine) {
  .site-card:hover::before {
    opacity: 0.65;
  }
  .site-card:hover {
    background: var(--color-background-soft);
  }
  .featured:hover {
    border-color: var(--color-border-hover);
    background: var(--color-surface);
  }
  .site-card:hover .site-arrow {
    opacity: 1;
    color: var(--color-accent);
    transform: translate(1px, -1px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .site-card,
  .site-arrow {
    transform: none !important;
    transition-property: opacity;
  }
}
@container entrance (max-width: 600px) {
  .featured {
    padding: 12px;
    gap: 9px;
  }
  .featured .site-arrow {
    display: none;
  }
  .featured .site-description {
    font-size: 13px;
  }
}
</style>
