<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DirectoryIcon, DirectoryTopicId } from '@/data/directory'
import { useMotionPresence } from '@/composables/useMotionPresence'

const props = defineProps<{ topic: DirectoryTopicId; icon: DirectoryIcon; paused?: boolean }>()
const root = ref<HTMLElement>()
const { running } = useMotionPresence(root, () => !!props.paused)
const motif = computed(() => {
  if (props.icon === 'music') return 'wave'
  if (props.icon === 'video' || props.icon === 'anime') return 'play'
  if (props.topic === 'ai') return 'nodes'
  if (props.topic === 'tools') return 'scan'
  if (props.topic === 'development') return 'code'
  if (props.topic === 'games') return 'keys'
  if (props.topic === 'design') return 'spark'
  return 'writing'
})
</script>

<template>
  <span ref="root" class="topic-pulse" :class="[motif, { 'is-running': running }]" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <template v-if="motif === 'wave'">
        <path d="M3 10v4M7.5 5v14M12 8v8M16.5 3v18M21 9v6" />
        <path class="motif-moving wave-one" d="M7.5 5v14" />
        <path class="motif-moving wave-two" d="M16.5 3v18" />
      </template>
      <template v-else-if="motif === 'play'">
        <circle cx="12" cy="12" r="9" class="motif-track" />
        <circle cx="12" cy="12" r="9" class="motif-moving play-ring" stroke-dasharray="12 45" />
        <path d="m10 8 6 4-6 4Z" />
      </template>
      <template v-else-if="motif === 'nodes'">
        <path class="motif-track" d="m5 17 7-12 7 12H5Z" />
        <circle class="motif-moving node-one" cx="12" cy="5" r="2.5" fill="currentColor" />
        <circle class="motif-moving node-two" cx="5" cy="17" r="2.5" fill="currentColor" />
        <circle class="motif-moving node-three" cx="19" cy="17" r="2.5" fill="currentColor" />
      </template>
      <template v-else-if="motif === 'scan'">
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" />
        <path class="motif-track" d="M8 8h8v8H8Z" />
        <path class="motif-moving scan-line" d="M5 6h14" />
      </template>
      <template v-else-if="motif === 'code'">
        <path d="m8 6-5 6 5 6m5-12 5 6-5 6" />
        <path class="motif-moving code-cursor" d="M18 20h4" />
      </template>
      <template v-else-if="motif === 'keys'">
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
        <path class="motif-moving key-light" d="M10 4h4v4h-4Z" fill="currentColor" stroke="none" />
      </template>
      <template v-else-if="motif === 'spark'">
        <path class="motif-moving design-spark" d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      </template>
      <template v-else>
        <path class="motif-track" d="M5 5h14M5 10h14M5 15h10M5 20h7" />
        <path class="motif-moving writing-line" d="M5 15h10" />
      </template>
    </svg>
  </span>
</template>

<style scoped>
.topic-pulse {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  color: var(--color-accent);
}
.topic-pulse svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.motif-track {
  opacity: 0.35;
}
.motif-moving {
  animation-play-state: paused !important;
  transform-box: fill-box;
  transform-origin: center;
}
.play-ring {
  animation: orbit 4s linear infinite;
  transform-box: view-box;
}
.wave-one {
  animation: equalize 1.6s var(--ease-out) infinite alternate;
}
.wave-two {
  animation: equalize 2s var(--ease-out) -0.8s infinite alternate-reverse;
}
.node-one,
.node-two,
.node-three {
  animation: node-signal 2.4s linear infinite;
}
.node-two {
  animation-delay: -0.8s;
}
.node-three {
  animation-delay: -1.6s;
}
.scan-line {
  animation: scan 2.4s var(--ease-out) infinite alternate;
}
.code-cursor {
  animation: cursor-signal 2.2s steps(2, jump-none) infinite;
}
.key-light {
  animation: node-signal 2s linear infinite;
}
.design-spark {
  animation: spark-turn 3s var(--ease-out) infinite alternate;
}
.writing-line {
  transform-origin: left;
  animation: writing 2.4s var(--ease-out) infinite;
}
.motion-focus-target[data-ambient='true'] > .category-heading .is-running .motif-moving {
  animation-play-state: running !important;
}
@keyframes orbit {
  to { transform: rotate(360deg); }
}
@keyframes equalize {
  to { transform: scaleY(0.45); }
}
@keyframes node-signal {
  0%, 100% { opacity: 0.4; }
  35% { opacity: 1; }
}
@keyframes scan {
  to { transform: translateY(12px); }
}
@keyframes cursor-signal {
  to { opacity: 0.25; }
}
@keyframes spark-turn {
  to { transform: rotate(90deg) scale(0.85); }
}
@keyframes writing {
  0%, 100% {
    transform: scaleX(0.35);
    opacity: 0.4;
  }
  60% {
    transform: scaleX(1);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .motif-moving {
    animation: none;
  }
}
</style>
