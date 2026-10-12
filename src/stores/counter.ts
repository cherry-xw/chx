import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemePreference = 'light' | 'dark' | 'system'
// Keep persisted identifiers compatible while updating the visual palettes.
export const colorPalettes = [
  { value: 'cobalt', label: 'EL 荧光黄' },
  { value: 'terracotta', label: '青柠绿' },
  { value: 'wine', label: '霓虹紫' }
] as const
export type ColorPalette = (typeof colorPalettes)[number]['value']

export function isColorPalette(value: unknown): value is ColorPalette {
  return colorPalettes.some((option) => option.value === value)
}

export const useModeStore = defineStore('counter', () => {
  const storageKey = 'chery-theme'
  const paletteStorageKey = 'chery-palette'
  const systemQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(systemQuery.matches)
  function readPreference(): ThemePreference {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved === 'light' || saved === 'dark' ? saved : 'system'
    } catch {
      return 'system'
    }
  }
  const preference = ref<ThemePreference>(readPreference())
  function readPalette(): ColorPalette {
    try {
      const saved = localStorage.getItem(paletteStorageKey)
      return isColorPalette(saved) ? saved : 'cobalt'
    } catch {
      return 'cobalt'
    }
  }
  const palette = ref<ColorPalette>(readPalette())
  const mode = computed<'light' | 'dark'>(() =>
    preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value
  )
  function setPreference(value: ThemePreference) {
    preference.value = value
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      // Theme changes remain usable when browser storage is unavailable.
    }
  }
  function switchMode(md?: 'light' | 'dark') {
    setPreference(md ?? (mode.value === 'light' ? 'dark' : 'light'))
  }
  function setPalette(value: ColorPalette) {
    if (!isColorPalette(value)) return
    palette.value = value
    try {
      localStorage.setItem(paletteStorageKey, value)
    } catch {
      // The selected palette remains usable without browser storage.
    }
  }
  function syncSystem(event: MediaQueryListEvent) {
    systemDark.value = event.matches
  }
  function syncStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) preference.value = readPreference()
    if (event.key === paletteStorageKey || event.key === null) palette.value = readPalette()
  }
  systemQuery.addEventListener('change', syncSystem)
  window.addEventListener('storage', syncStorage)
  onScopeDispose(() => {
    systemQuery.removeEventListener('change', syncSystem)
    window.removeEventListener('storage', syncStorage)
  })
  watch(
    mode,
    (value) => {
      document.documentElement.classList.toggle('dark', value === 'dark')
      document.documentElement.style.colorScheme = value
    },
    { immediate: true, flush: 'sync' }
  )
  watch(
    palette,
    (value) => {
      document.documentElement.dataset.palette = value
    },
    { immediate: true, flush: 'sync' }
  )
  return { mode, preference, palette, setPreference, switchMode, setPalette }
})

export const useUserInfoStore = defineStore('userInfo', () => {
  type UserInfo = {
    company: string
    createTime: string
    department: string
    email: string
    id: string
    isDelete: number
    mobile: string
    name: string
    password: string
    position: string
    roleLevel: number
    state: number
    token: string
    updateTime: string
    userName: string
  }
  const str = localStorage.getItem('backend-ui') || undefined
  let ui: UserInfo | undefined = undefined
  if (str) {
    ui = JSON.parse(str)
  }
  const userInfo = ref<UserInfo | undefined>(ui)
  function updateUserInfo(info?: UserInfo) {
    userInfo.value = info
    localStorage.setItem('backend-ui', JSON.stringify(info || {}))
  }
  return { userInfo, updateUserInfo }
})
