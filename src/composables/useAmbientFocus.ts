import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type WatchSource
} from 'vue'
import { useMotionPresence } from '@/composables/useMotionPresence'
import { nextSpotlightKey } from '@/utils/motion-focus'

const ADVANCE_DELAY = 1200
const HOLD_DELAY = 2400
const REST_DELAY = 1400

export function useAmbientFocus(
  root: Ref<HTMLElement | undefined>,
  source: WatchSource,
  paused: MaybeRefOrGetter<boolean> = false
) {
  const { running } = useMotionPresence(root, paused)
  const pointerBusy = ref(false)
  const focusBusy = ref(false)
  const visible = new Set<Element>()
  const cursors = new Map<string, string>()
  let targets: HTMLElement[] = []
  let highlighted: HTMLElement | undefined
  let observer: IntersectionObserver | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let cycleActive = false
  let disposed = false
  let turn = 0

  function clearHighlight() {
    highlighted?.removeAttribute('data-ambient')
    highlighted = undefined
  }
  function shouldRun() {
    return running.value && !pointerBusy.value && !focusBusy.value && visible.size > 0
  }
  function stopCycle() {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    cycleActive = false
    clearHighlight()
  }
  function schedule(delay: number, next: () => void) {
    timer = setTimeout(() => {
      timer = undefined
      if (!shouldRun()) {
        stopCycle()
        return
      }
      next()
    }, delay)
  }
  function startCycle() {
    if (!shouldRun()) return
    stopCycle()
    cycleActive = true
    schedule(ADVANCE_DELAY, () => {
      advance()
      schedule(HOLD_DELAY, () => {
        clearHighlight()
        schedule(REST_DELAY, startCycle)
      })
    })
  }
  function advance() {
    clearHighlight()
    if (!shouldRun() || document.querySelector('dialog[open]')) return
    const candidates = targets.filter((target) => visible.has(target) && target.isConnected)
    // The useful, heat-ranked featured links get twice the attention of directory sections.
    const kind = turn++ % 3 === 2 ? 'category' : 'featured'
    const preferred = candidates.filter((target) => target.dataset.focusKind === kind)
    const pool = preferred.length ? preferred : candidates
    const group = preferred.length ? kind : 'fallback'
    const key = nextSpotlightKey(
      pool.map((target) => target.dataset.focusKey || ''),
      cursors.get(group)
    )
    highlighted = pool.find((target) => target.dataset.focusKey === key)
    if (!highlighted || key === undefined) return
    cursors.set(group, key)
    highlighted.setAttribute('data-ambient', 'true')
  }
  function sync() {
    if (!shouldRun()) {
      stopCycle()
      return
    }
    if (!cycleActive) startCycle()
  }
  function observeTargets() {
    observer?.disconnect()
    visible.clear()
    clearHighlight()
    targets = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-focus-key]') || [])
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target)
          else {
            visible.delete(entry.target)
            if (entry.target === highlighted) clearHighlight()
          }
        }
        sync()
      },
      { threshold: 0.15 }
    )
    targets.forEach((target) => observer?.observe(target))
  }
  function pointerOver(event: PointerEvent) {
    if (
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return
    pointerBusy.value =
      event.target instanceof Element &&
      !!event.target.closest('.motion-focus-target, input, button, a')
    if (pointerBusy.value) {
      stopCycle()
    }
  }
  function pointerOut(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    const next = event.relatedTarget
    pointerBusy.value =
      next instanceof Element &&
      !!root.value?.contains(next) &&
      !!next.closest('.motion-focus-target, input, button, a')
  }
  function blocksFocus(target: EventTarget | null) {
    return (
      target instanceof Element &&
      !!root.value?.contains(target) &&
      target.matches(':focus-visible, input, textarea, select')
    )
  }
  function focusIn(event: FocusEvent) {
    focusBusy.value = blocksFocus(event.target)
  }
  function focusOut(event: FocusEvent) {
    focusBusy.value = blocksFocus(event.relatedTarget)
  }
  watch([running, pointerBusy, focusBusy], () => {
    sync()
  })
  watch(
    source,
    async () => {
      await nextTick()
      if (disposed) return
      stopCycle()
      observeTargets()
      sync()
    },
    { flush: 'post' }
  )
  onMounted(() => {
    observeTargets()
    root.value?.addEventListener('pointerover', pointerOver)
    root.value?.addEventListener('pointerout', pointerOut)
    root.value?.addEventListener('focusin', focusIn)
    root.value?.addEventListener('focusout', focusOut)
    pointerBusy.value =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !!root.value?.querySelector('.motion-focus-target:hover, input:hover, button:hover, a:hover')
    focusBusy.value = blocksFocus(document.activeElement)
    sync()
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
    stopCycle()
    root.value?.removeEventListener('pointerover', pointerOver)
    root.value?.removeEventListener('pointerout', pointerOut)
    root.value?.removeEventListener('focusin', focusIn)
    root.value?.removeEventListener('focusout', focusOut)
  })
  return { running }
}
