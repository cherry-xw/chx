<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useActivityMotionStore } from '@/stores/activity-motion'

defineOptions({ name: 'CrtOverlay' })

type TearBand = {
  id: number
  top: number
  height: number
  opacity: number
}

const motion = useActivityMotionStore()
const animated = computed(() => motion.allowed)
const bands = ref<TearBand[]>([])
const filterSeed = ref(7)
const filterScale = ref(18)
const filterFrequency = ref('0.025 0.18')
let burstTimer: ReturnType<typeof setTimeout> | undefined
let endTimer: ReturnType<typeof setTimeout> | undefined
let bandId = 0

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clearTimers() {
  if (burstTimer !== undefined) clearTimeout(burstTimer)
  if (endTimer !== undefined) clearTimeout(endTimer)
  burstTimer = undefined
  endTimer = undefined
}

function stopBurst() {
  clearTimers()
  bands.value = []
}

function scheduleBurst(delay: number) {
  if (!motion.allowed) return
  clearTimers()
  burstTimer = setTimeout(startBurst, delay)
}

function startBurst() {
  burstTimer = undefined
  if (!motion.allowed) return

  const count = Math.random() < 0.35 ? 2 : 1
  filterSeed.value = Math.floor(randomBetween(0, 1000))
  filterScale.value = Math.round(randomBetween(12, 28))
  filterFrequency.value = `${randomBetween(0.018, 0.04).toFixed(3)} ${randomBetween(0.12, 0.24).toFixed(3)}`
  bands.value = Array.from({ length: count }, () => ({
    id: bandId++,
    top: randomBetween(3, 94),
    height: randomBetween(5, 18),
    opacity: randomBetween(0.6, 1)
  }))

  endTimer = setTimeout(
    () => {
      endTimer = undefined
      bands.value = []
      scheduleBurst(randomBetween(2500, 7000))
    },
    randomBetween(120, 260)
  )
}

onMounted(() => {
  if (motion.allowed) scheduleBurst(randomBetween(1600, 3600))
})
watch(animated, (value) => {
  stopBurst()
  if (value) scheduleBurst(randomBetween(800, 2400))
})
onBeforeUnmount(stopBurst)
</script>

<template>
  <div class="crt-overlay" aria-hidden="true">
    <svg class="crt-filter-defs" width="0" height="0" focusable="false" aria-hidden="true">
      <filter
        id="crt-tear-filter"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        color-interpolation-filters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          :baseFrequency="filterFrequency"
          numOctaves="1"
          :seed="filterSeed"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          :scale="filterScale"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
    <span
      v-for="band in bands"
      :key="band.id"
      class="crt-tear"
      :style="{ top: `${band.top}%`, height: `${band.height}px`, opacity: band.opacity }"
    ></span>
    <span class="crt-grain"></span>
    <span class="crt-scanlines"></span>
  </div>
</template>

<style scoped>
.crt-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
.crt-filter-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
.crt-grain,
.crt-scanlines,
.crt-tear {
  position: absolute;
  pointer-events: none;
}
.crt-grain,
.crt-scanlines {
  inset: 0;
}
.crt-tear {
  right: 0;
  left: 0;
  background: var(--crt-tear-tint);
  border-block: 1px solid var(--crt-tear-edge);
  -webkit-backdrop-filter: blur(1.2px) contrast(1.35) saturate(1.2);
  backdrop-filter: blur(1.2px) contrast(1.35) saturate(1.2);
}
@supports (backdrop-filter: url(#crt-tear-filter)) or
  (-webkit-backdrop-filter: url(#crt-tear-filter)) {
  .crt-tear {
    -webkit-backdrop-filter: url(#crt-tear-filter);
    backdrop-filter: url(#crt-tear-filter);
  }
}
.crt-grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='64' height='64' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  image-rendering: pixelated;
  opacity: var(--crt-grain-opacity);
}
.crt-scanlines {
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    var(--crt-scanline) 2px,
    var(--crt-scanline) 3px
  );
  opacity: var(--crt-scanline-opacity);
}
@media (prefers-reduced-motion: reduce) {
  .crt-tear {
    display: none;
  }
}
</style>
