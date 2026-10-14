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
import type { gsap } from 'gsap'
import { useMotionPresence } from '@/composables/useMotionPresence'
import { loadMotionEngine } from '@/utils/motion-engine'
import { nextSpotlightKey } from '@/utils/motion-focus'

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
  let context: gsap.Context | undefined
  let timeline: gsap.core.Timeline | undefined
  let disposed = false
  let loading = false
  let turn = 0

  function clearHighlight() {
    highlighted?.removeAttribute('data-ambient')
    highlighted = undefined
  }
  function advance() {
    clearHighlight()
    if (!running.value || pointerBusy.value || focusBusy.value || document.querySelector('dialog[open]')) return
    const candidates = targets.filter((target) => visible.has(target) && target.isConnected)
    // The useful, heat-ranked featured links get twice the attention of directory sections.
    const kind = turn++ % 3 === 2 ? 'category' : 'featured'
    const preferred = candidates.filter((target) => target.dataset.focusKind === kind)
    const pool = preferred.length ? preferred : candidates
    const group = preferred.length ? kind : 'fallback'
    const key = nextSpotlightKey(pool.map((target) => target.dataset.focusKey || ''), cursors.get(group))
    highlighted = pool.find((target) => target.dataset.focusKey === key)
    if (!highlighted || key === undefined) return
    cursors.set(group, key)
    highlighted.setAttribute('data-ambient', 'true')
  }
  async function sync() {
    if (!running.value || pointerBusy.value || focusBusy.value || !visible.size) {
      timeline?.pause(0)
      clearHighlight()
      return
    }
    if (!timeline && !loading) {
      loading = true
      const engine = await loadMotionEngine()
      loading = false
      if (disposed || !engine || !root.value) return
      context = engine.context(() => {
        timeline = engine.timeline({ paused: true, repeat: -1 })
          .to({}, { duration: 1.2 })
          .call(advance)
          .to({}, { duration: 2.4 })
          .call(clearHighlight)
          .to({}, { duration: 1.4 })
      }, root.value)
    }
    if (running.value && !pointerBusy.value && !focusBusy.value && visible.size) timeline?.play()
  }
  function observeTargets() {
    observer?.disconnect()
    visible.clear()
    clearHighlight()
    targets = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-focus-key]') || [])
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else {
          visible.delete(entry.target)
          if (entry.target === highlighted) clearHighlight()
        }
      }
      void sync()
    }, { threshold: 0.15 })
    targets.forEach((target) => observer?.observe(target))
  }
  function pointerOver(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    pointerBusy.value = event.target instanceof Element && !!event.target.closest('.motion-focus-target, input, button, a')
    if (pointerBusy.value) {
      timeline?.pause(0)
      clearHighlight()
    }
  }
  function pointerOut(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    const next = event.relatedTarget
    pointerBusy.value = next instanceof Element && !!root.value?.contains(next) && !!next.closest('.motion-focus-target, input, button, a')
  }
  function blocksFocus(target: EventTarget | null) {
    return target instanceof Element && !!root.value?.contains(target) &&
      target.matches(':focus-visible, input, textarea, select')
  }
  function focusIn(event: FocusEvent) {
    focusBusy.value = blocksFocus(event.target)
  }
  function focusOut(event: FocusEvent) {
    focusBusy.value = blocksFocus(event.relatedTarget)
  }
  watch([running, pointerBusy, focusBusy], () => { void sync() })
  watch(source, async () => {
    await nextTick()
    if (disposed) return
    timeline?.pause(0)
    observeTargets()
    void sync()
  }, { flush: 'post' })
  onMounted(() => {
    observeTargets()
    root.value?.addEventListener('pointerover', pointerOver)
    root.value?.addEventListener('pointerout', pointerOut)
    root.value?.addEventListener('focusin', focusIn)
    root.value?.addEventListener('focusout', focusOut)
    pointerBusy.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !!root.value?.querySelector('.motion-focus-target:hover, input:hover, button:hover, a:hover')
    focusBusy.value = blocksFocus(document.activeElement)
    void sync()
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
    context?.revert()
    clearHighlight()
    root.value?.removeEventListener('pointerover', pointerOver)
    root.value?.removeEventListener('pointerout', pointerOut)
    root.value?.removeEventListener('focusin', focusIn)
    root.value?.removeEventListener('focusout', focusOut)
  })
  return { running }
}
