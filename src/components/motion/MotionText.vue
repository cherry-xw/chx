<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { gsap } from 'gsap'
import { useMotionPresence } from '@/composables/useMotionPresence'
import { loadMotionEngine } from '@/utils/motion-engine'

const props = withDefaults(defineProps<{ text: string; paused?: boolean }>(), { paused: false })
const root = ref<HTMLElement>()
const split = ref(false)
const interacting = ref(false)
let hovered = false
const { running } = useMotionPresence(root, () => props.paused)
const characters = computed(() => {
  if (typeof Intl.Segmenter === 'undefined') return Array.from(props.text)
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(props.text), (part) => part.segment)
})
let context: gsap.Context | undefined
let engine: typeof gsap | undefined
let generation = 0
let disposed = false
let host: Element | null = null

async function play() {
  if (!running.value || disposed) return
  const request = ++generation
  interacting.value = true
  engine = await loadMotionEngine()
  if (request !== generation || disposed || !running.value || !engine) return
  if (!split.value) {
    split.value = true
    await nextTick()
  }
  if (request !== generation || disposed || !running.value || !root.value) return
  context ??= engine.context(() => {}, root.value)
  // Keep the current visual position, but don't retain completed tweens on every hover.
  context.kill(false)
  context.add(() => {
    const letters = root.value!.querySelectorAll('.motion-char')
    const bold = root.value!.querySelectorAll('.char-bold')
    engine!.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } })
      .to(letters, { y: -2, duration: 0.16, stagger: { amount: 0.16 } }, 0)
      .to(bold, { opacity: 1, duration: 0.1, stagger: { amount: 0.16 } }, 0)
      .to(letters, { y: 0, duration: 0.16, stagger: { amount: 0.16 } }, 0.16)
      .to(bold, { opacity: 0, duration: 0.16, stagger: { amount: 0.16 } }, 0.2)
  })
}
function reset() {
  generation++
  interacting.value = false
  if (!context || !engine || !root.value) return
  context.kill(false)
  context.add(() => {
    engine!.to(root.value!.querySelectorAll('.motion-char'), { y: 0, duration: 0.12, ease: 'power3.out', overwrite: true })
    engine!.to(root.value!.querySelectorAll('.char-bold'), { opacity: 0, duration: 0.12, overwrite: true })
  })
}
function restore(force = false) {
  // Idle cards can keep their completed GSAP context. Reverting every hovered
  // card at once turns route deactivation into a long synchronous task.
  if (!force && !interacting.value && !hovered) return
  context?.revert()
  context = undefined
  if (!engine || !root.value) return
  const targets = root.value.querySelectorAll('.motion-char, .char-bold')
  if (targets.length) engine.set(targets, { clearProps: 'transform,opacity' })
}
watch(running, (value) => {
  if (value) {
    if (hovered && host?.matches(':hover')) void play()
    return
  }
  const wasInteracting = interacting.value
  generation++
  interacting.value = false
  if (wasInteracting) restore(true)
})
watch(() => props.text, () => {
  const wasInteracting = interacting.value
  generation++
  interacting.value = false
  if (wasInteracting) restore(true)
  split.value = false
})
function pointerEnter(event: Event) {
  const pointer = event as PointerEvent
  if (pointer.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  hovered = true
  void play()
}
function pointerLeave() {
  hovered = false
  reset()
}
function focusIn(event: Event) {
  if (!(event.target instanceof Element) || !event.target.matches(':focus-visible')) return
  const wasInteracting = interacting.value
  hovered = false
  generation++
  interacting.value = false
  if (wasInteracting) restore(true)
}
onMounted(() => {
  host = root.value?.closest('.motion-row') ?? null
  host?.addEventListener('pointerenter', pointerEnter)
  host?.addEventListener('pointerleave', pointerLeave)
  host?.addEventListener('focusin', focusIn)
})
onBeforeUnmount(() => {
  disposed = true
  generation++
  restore()
  host?.removeEventListener('pointerenter', pointerEnter)
  host?.removeEventListener('pointerleave', pointerLeave)
  host?.removeEventListener('focusin', focusIn)
})
defineExpose({ play, reset })
</script>

<template>
  <span ref="root" class="motion-text" :class="{ 'is-running': running, 'is-interacting': interacting }">
    <span class="text-size" aria-hidden="true">
      <template v-if="split"
        ><span v-for="(char, index) in characters" :key="index" class="size-char">{{ char }}</span></template
      >
      <template v-else>{{ text }}</template>
    </span>
    <span v-if="split" class="motion-letters" aria-hidden="true">
      <span v-for="(char, index) in characters" :key="index" class="motion-char">
        <span class="char-size">{{ char }}</span>
        <span class="char-face">{{ char }}</span>
        <span class="char-bold">{{ char }}</span>
      </span>
    </span>
    <span v-else class="text-face">{{ text }}</span>
    <span v-if="split" class="accessible-text">{{ text }}</span>
    <span class="text-shine" aria-hidden="true">{{ text }}</span>
  </span>
</template>

<style scoped>
.motion-text {
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  white-space: inherit;
}
.text-size {
  display: block;
  overflow: hidden;
  white-space: inherit;
  text-overflow: ellipsis;
  visibility: hidden;
  font-weight: 750;
  user-select: none;
}
.text-face,
.motion-letters {
  position: absolute;
  inset: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: inherit;
}
.motion-char {
  position: relative;
  display: inline-block;
  white-space: pre;
}
.size-char {
  display: inline-block;
  font-weight: inherit;
  white-space: pre;
}
.char-size {
  visibility: hidden;
  font-weight: 750;
  user-select: none;
}
.char-face,
.char-bold {
  position: absolute;
  top: 0;
  left: 0;
}
.char-bold {
  font-weight: 750;
  opacity: 0;
  user-select: none;
}
.accessible-text {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  user-select: none;
}
.text-shine {
  position: absolute;
  inset: 0;
  overflow: hidden;
  white-space: inherit;
  color: transparent;
  background: linear-gradient(100deg, transparent 35%, var(--color-accent) 49%, var(--color-accent) 51%, transparent 65%);
  background-size: 300% 100%;
  background-position: 100% 0;
  background-clip: text;
  pointer-events: none;
  user-select: none;
  opacity: 0;
}
.motion-focus-target[data-ambient='true'] > :is(.site-copy, .category-heading, .service-heading) .motion-text.is-running .text-shine,
.motion-text.is-running.is-interacting .text-shine {
  opacity: 1;
  animation: title-sheen 1200ms linear both;
}
@keyframes title-sheen {
  to { background-position: 0% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .text-shine { display: none; }
  .motion-char { transform: none !important; }
}
</style>
