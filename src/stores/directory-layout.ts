import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { directory, type DirectoryCategory } from '@/data/directory'
import {
  mergeVisibleOrder,
  moveVisibleBlock,
  normalizeDirectoryOrder
} from '@/utils/directory-order'

export const useDirectoryLayoutStore = defineStore('directory-layout', () => {
  const storageKey = 'chery-directory-order'
  const siteStorageKey = 'chery-directory-site-order'
  const defaultOrder = directory.map((category) => category.id)
  const defaultSiteOrders = Object.fromEntries(
    directory.map((category) => [category.id, category.sites.map((site) => site.url)])
  )
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
  function readSiteOrders(): Record<string, string[]> {
    try {
      const saved = localStorage.getItem(siteStorageKey)
      storageAvailable.value = true
      let parsed: unknown = {}
      if (saved) {
        try {
          parsed = JSON.parse(saved)
        } catch {
          parsed = {}
        }
      }
      const source = typeof parsed === 'object' && parsed !== null ? parsed : {}
      return Object.fromEntries(
        directory.map((category) => [
          category.id,
          normalizeDirectoryOrder(
            (source as Record<string, unknown>)[category.id],
            defaultSiteOrders[category.id]
          )
        ])
      )
    } catch {
      storageAvailable.value = false
      return { ...defaultSiteOrders }
    }
  }
  const siteOrders = ref(readSiteOrders())
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
  function orderSites(categoryId: string, sites: DirectoryCategory['sites']) {
    const positions = new Map(
      (siteOrders.value[categoryId] ?? []).map((url, index) => [url, index])
    )
    return [...sites].sort((a, b) => positions.get(a.url)! - positions.get(b.url)!)
  }
  function reorderSites(categoryId: string, previous: readonly string[], next: readonly string[]) {
    const current = siteOrders.value[categoryId]
    if (!current) return
    siteOrders.value = {
      ...siteOrders.value,
      [categoryId]: mergeVisibleOrder(current, previous, next)
    }
    try {
      localStorage.setItem(siteStorageKey, JSON.stringify(siteOrders.value))
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
    }
  }
  function moveSite(
    categoryId: string,
    visible: readonly string[],
    url: string,
    direction: -1 | 1
  ) {
    const index = visible.indexOf(url)
    const target = index + direction
    if (index < 0 || target < 0 || target >= visible.length) return
    const next = [...visible]
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderSites(categoryId, visible, next)
  }
  function moveBlock(visible: readonly string[], id: string, direction: -1 | 1) {
    save(moveVisibleBlock(order.value, visible, id, direction))
  }
  function resetOrder() {
    save(defaultOrder)
    siteOrders.value = { ...defaultSiteOrders }
    try {
      localStorage.setItem(siteStorageKey, JSON.stringify(siteOrders.value))
    } catch {
      storageAvailable.value = false
    }
  }
  function syncStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) order.value = readOrder()
    if (event.key === siteStorageKey || event.key === null) siteOrders.value = readSiteOrders()
  }
  window.addEventListener('storage', syncStorage)
  onScopeDispose(() => window.removeEventListener('storage', syncStorage))
  return {
    orderedCategories,
    storageAvailable,
    reorderVisible,
    moveBlock,
    orderSites,
    reorderSites,
    moveSite,
    resetOrder
  }
})
