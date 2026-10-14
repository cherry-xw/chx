import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'

export const useActivityMotionStore = defineStore('activity-motion', () => {
  const enabled = ref(true)
  const pageVisible = ref(typeof document === 'undefined' || !document.hidden)
  const media = typeof window === 'undefined' ? undefined : window.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(media?.matches ?? false)
  const allowed = computed(() => enabled.value && pageVisible.value && !reduced.value)

  function syncVisibility() {
    pageVisible.value = !document.hidden
  }
  function syncPreference(event: MediaQueryListEvent) {
    reduced.value = event.matches
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncVisibility)
  media?.addEventListener('change', syncPreference)
  onScopeDispose(() => {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', syncVisibility)
    media?.removeEventListener('change', syncPreference)
  })

  function toggle() {
    enabled.value = !enabled.value
  }

  return { enabled, allowed, toggle }
})
