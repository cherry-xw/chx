import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  toValue,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'
import { useActivityMotionStore } from '@/stores/activity-motion'

export function useMotionPresence(
  element: Ref<HTMLElement | undefined>,
  paused: MaybeRefOrGetter<boolean> = false
) {
  const motion = useActivityMotionStore()
  const active = ref(true)
  const inView = ref(false)
  const allowed = computed(() => motion.allowed && active.value && !toValue(paused))
  const running = computed(() => allowed.value && inView.value)
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    if (!element.value || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(([entry]) => {
      inView.value = !!entry?.isIntersecting
    })
    observer.observe(element.value)
  })
  onActivated(() => {
    active.value = true
  })
  onDeactivated(() => {
    active.value = false
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { allowed, running }
}
