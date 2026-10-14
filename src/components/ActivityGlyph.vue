<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMotionPresence } from '@/composables/useMotionPresence'

const props = withDefaults(defineProps<{ seed?: string; paused?: boolean }>(), {
  seed: '',
  paused: false
})
const glyph = ref<HTMLElement>()
const { running } = useMotionPresence(glyph, () => props.paused)
// Stable per-module offsets keep the icons from moving in lockstep after filtering.
const phase = computed(() => {
  const hash = Array.from(props.seed).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) % 2400,
    0
  )
  return { '--activity-phase': `${-hash}ms` }
})
</script>

<template>
  <span
    ref="glyph"
    class="activity-glyph"
    :class="{ 'is-running': running }"
    :style="phase"
    aria-hidden="true"
    title="装饰动效 · 非实时监控"
  >
    <span class="activity-bar"></span>
    <span class="activity-bar"></span>
    <span class="activity-bar"></span>
  </span>
</template>

<style scoped>
.activity-glyph {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  width: 16px;
  height: 16px;
  padding-bottom: 2px;
  flex: 0 0 16px;
  color: var(--color-accent);
  pointer-events: none;
}
.activity-bar {
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background: currentColor;
  transform-origin: center bottom;
  transform: scaleY(0.45);
  animation: activity-level 2400ms linear infinite;
  animation-delay: var(--activity-phase);
  animation-play-state: paused;
}
.activity-bar:nth-child(2) {
  transform: scaleY(0.85);
  animation-delay: calc(var(--activity-phase) - 800ms);
}
.activity-bar:nth-child(3) {
  transform: scaleY(0.6);
  animation-delay: calc(var(--activity-phase) - 1600ms);
}
.is-running .activity-bar {
  animation-play-state: running;
}
@keyframes activity-level {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  20% {
    transform: scaleY(0.85);
  }
  40% {
    transform: scaleY(0.5);
  }
  65% {
    transform: scaleY(1);
  }
  85% {
    transform: scaleY(0.6);
  }
}
@media (prefers-reduced-motion: reduce) {
  .activity-bar {
    animation: none;
  }
}
</style>
