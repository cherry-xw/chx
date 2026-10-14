import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'

export type LinkOpeningMode = 'same-tab' | 'new-tab'
const storageKey = 'chery-link-opening'

export const useLinkOpeningStore = defineStore('link-opening', () => {
  function readMode(): LinkOpeningMode {
    try {
      return localStorage.getItem(storageKey) === 'same-tab' ? 'same-tab' : 'new-tab'
    } catch {
      return 'new-tab'
    }
  }
  const mode = ref<LinkOpeningMode>(readMode())
  const target = computed(() => mode.value === 'same-tab' ? '_self' : '_blank')
  const description = computed(() =>
    mode.value === 'same-tab' ? '在当前页打开' : '在新标签页打开'
  )
  function setMode(next: LinkOpeningMode) {
    mode.value = next
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Keep the current page preference when storage is unavailable.
    }
  }
  function openURL(url: string) {
    if (mode.value === 'same-tab') window.location.assign(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  function syncStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) mode.value = readMode()
  }
  window.addEventListener('storage', syncStorage)
  onScopeDispose(() => window.removeEventListener('storage', syncStorage))
  return { mode, target, description, setMode, openURL }
})
