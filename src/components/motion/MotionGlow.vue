<script setup lang="ts">
import { ref } from 'vue'
import { useMotionPresence } from '@/composables/useMotionPresence'

const props = withDefaults(defineProps<{ paused?: boolean }>(), { paused: false })
const glow = ref<HTMLElement>()
const { running } = useMotionPresence(glow, () => props.paused)
</script>

<template>
  <span ref="glow" class="motion-glow" :class="{ 'is-running': running }" aria-hidden="true">
    <span class="motion-beam"></span>
  </span>
</template>

<style scoped>
.motion-glow {
  position: absolute;
  inset: -1px;
  z-index: 2;
  padding: 1px;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  transition: none;
}
.motion-beam {
  position: absolute;
  inset: -150%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg 230deg,
    var(--color-accent) 280deg,
    var(--color-highlight) 300deg,
    transparent 330deg
  );
  animation: perimeter-light 3200ms linear infinite paused;
}
@media (hover: hover) and (pointer: fine) {
  .motion-row:hover > .motion-glow.is-running {
    opacity: 1;
    transition: opacity 160ms var(--ease-out);
  }
  .motion-row:hover > .is-running > .motion-beam {
    animation-play-state: running;
  }
}
@keyframes perimeter-light {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .motion-glow {
    display: none;
  }
}
@supports not (mask-composite: exclude) {
  .motion-glow {
    display: none;
  }
}
</style>
