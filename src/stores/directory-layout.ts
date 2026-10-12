import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { directory } from '@/data/directory'
import {
  mergeVisibleOrder,
  moveVisibleBlock,
  normalizeDirectoryOrder
} from '@/utils/directory-order'

export const useDirectoryLayoutStore = defineStore('directory-layout', () => {
  const storageKey = 'chery-directory-order'
  const defaultOrder = directory.map((category) => category.id)
  const storageAvailable = ref(true)
  function readOrder(): string[] {
    try {
      const saved = localStorage.getItem(storageKey)
      storageAvailable.value = true
      if (!saved) return [...defaultOrder]
      try {
        return normalizeDirectoryOrder(JSON.parse(saved), defaultOrder)
      } catch {
        return [...defaultOrder]
      }
    } catch {
      storageAvailable.value = false
      return [...defaultOrder]
    }
  }
  const order = ref(readOrder())
  const orderedCategories = computed(() => {
    const positions = new Map(order.value.map((id, index) => [id, index]))
    return [...directory].sort((a, b) => positions.get(a.id)! - positions.get(b.id)!)
  })
  function save(next: readonly string[]) {
    order.value = normalizeDirectoryOrder(next, defaultOrder)
    try {
      localStorage.setItem(storageKey, JSON.stringify(order.value))
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
    }
  }
  function reorderVisible(previous: readonly string[], next: readonly string[]) {
    save(mergeVisibleOrder(order.value, previous, next))
  }
  function moveBlock(visible: readonly string[], id: string, direction: -1 | 1) {
    save(moveVisibleBlock(order.value, visible, id, direction))
  }
  function resetOrder() {
    save(defaultOrder)
  }
  function syncStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) order.value = readOrder()
  }
  window.addEventListener('storage', syncStorage)
  onScopeDispose(() => window.removeEventListener('storage', syncStorage))
  return {
    orderedCategories,
    storageAvailable,
    reorderVisible,
    moveBlock,
    resetOrder
  }
})
