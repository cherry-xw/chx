import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { colorPalettes, useModeStore } from '../src/stores/counter.ts'
import { buildSearchURL, searchEngines } from '../src/data/search-engines.ts'
import { directory, featuredSites } from '../src/data/directory.ts'
import {
  HEAT_HALF_LIFE_MS,
  MIN_ACTIVE_SCORE,
  heatScore,
  maxHeat,
  pickTopByHeat,
  rankByHeat,
  readHeat,
  recordHeat,
  writeHeat
} from '../src/utils/usage-heat.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    }
  }
}

function browser(t, { saved = null, palette = null, dark = false, storageDisabled = false } = {}) {
  const values = new Map(saved ? [['chery-theme', saved]] : [])
  if (palette) values.set('chery-palette', palette)
  const classes = new Set(['unrelated-class'])
  const listeners = new Map()
  const storageListeners = new Map()
  const media = {
    matches: dark,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name)
  }
  const storage = {
    getItem(key) {
      if (storageDisabled) throw new Error('Storage disabled')
      return values.get(key) ?? null
    },
    setItem(key, value) {
      if (storageDisabled) throw new Error('Storage disabled')
      values.set(key, value)
    }
  }
  const globals = {
    localStorage: storage,
    window: {
      matchMedia: () => media,
      addEventListener: (name, callback) => storageListeners.set(name, callback),
      removeEventListener: (name) => storageListeners.delete(name)
    },
    document: {
      documentElement: {
        dataset: {},
        classList: {
          toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name))
        },
        style: {}
      }
    }
  }
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  const stores = []
  const createStore = () => {
    setActivePinia(createPinia())
    const store = useModeStore()
    stores.push(store)
    return store
  }
  t.after(() => {
    stores.forEach((store) => store.$dispose())
    for (const key of Object.keys(globals)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
      else delete globalThis[key]
    }
  })
  return {
    createStore,
    values,
    classes,
    globals,
    systemChange(value) {
      media.matches = value
      listeners.get('change')?.({ matches: value })
    },
    storageChange(value) {
      values.set('chery-theme', value)
      storageListeners.get('storage')?.({ key: 'chery-theme' })
    },
    paletteChange(value) {
      if (value === null) values.delete('chery-palette')
      else values.set('chery-palette', value)
      storageListeners.get('storage')?.({ key: 'chery-palette' })
    },
    clearPreferences() {
      values.clear()
      storageListeners.get('storage')?.({ key: null })
    }
  }
}

test('first visit follows the system, including later system changes', (t) => {
  const env = browser(t)
  const theme = env.createStore()
  assert.equal(theme.preference, 'system')
  assert.equal(theme.mode, 'light')
  env.systemChange(true)
  assert.equal(theme.mode, 'dark')
  assert(env.classes.has('dark'))
  assert(env.classes.has('unrelated-class'))
  assert.equal(env.globals.document.documentElement.style.colorScheme, 'dark')
})

test('manual preference survives a new store and overrides system changes', (t) => {
  const env = browser(t, { dark: true })
  let theme = env.createStore()
  theme.switchMode('light')
  env.systemChange(false)
  env.systemChange(true)
  assert.equal(theme.mode, 'light')
  assert.equal(env.values.get('chery-theme'), 'light')
  theme.$dispose()
  theme = env.createStore()
  assert.equal(theme.mode, 'light')
  theme.setPreference('system')
  assert.equal(theme.mode, 'dark')
  env.systemChange(false)
  assert.equal(theme.mode, 'light')
})

test('other tabs can update the theme', (t) => {
  const env = browser(t)
  const theme = env.createStore()
  env.storageChange('dark')
  assert.equal(theme.mode, 'dark')
  env.storageChange('light')
  assert.equal(theme.mode, 'light')
})

test('disabled storage and invalid stored preferences fall back gracefully', (t) => {
  const env = browser(t, { dark: true, storageDisabled: true })
  const theme = env.createStore()
  assert.equal(theme.mode, 'dark')
  assert.doesNotThrow(() => theme.switchMode('light'))
  assert.equal(theme.mode, 'light')
})

test('invalid saved theme follows the system', (t) => {
  const env = browser(t, { saved: 'invalid', dark: true })
  assert.equal(env.createStore().mode, 'dark')
})

test('palette persists independently of light, dark and system preference', (t) => {
  const env = browser(t, { saved: 'light', dark: true })
  let theme = env.createStore()
  assert.equal(theme.palette, 'cobalt')
  for (const option of colorPalettes) {
    theme.setPalette(option.value)
    assert.equal(theme.palette, option.value)
    assert.equal(env.globals.document.documentElement.dataset.palette, option.value)
    assert.equal(env.values.get('chery-palette'), option.value)
    assert.equal(theme.preference, 'light')
  }
  theme.$dispose()
  theme = env.createStore()
  assert.equal(theme.palette, 'wine')
  theme.setPreference('system')
  assert.equal(theme.mode, 'dark')
  env.systemChange(false)
  assert.equal(theme.mode, 'light')
  assert.equal(theme.palette, 'wine')
  assert.equal(env.values.get('chery-palette'), 'wine')
})

test('other tabs can change and clear palette without overwriting theme preference', (t) => {
  const env = browser(t, { saved: 'light', palette: 'wine', dark: true })
  const theme = env.createStore()
  env.paletteChange('terracotta')
  assert.equal(theme.palette, 'terracotta')
  assert.equal(theme.preference, 'light')
  env.paletteChange('invalid')
  assert.equal(theme.palette, 'cobalt')
  env.paletteChange('wine')
  env.paletteChange(null)
  assert.equal(theme.palette, 'cobalt')
  env.paletteChange('terracotta')
  env.clearPreferences()
  assert.equal(theme.palette, 'cobalt')
  assert.equal(theme.preference, 'system')
  assert.equal(theme.mode, 'dark')
})

test('invalid palette falls back and disabled storage still permits switching', (t) => {
  const env = browser(t, { palette: 'invalid', storageDisabled: true })
  const theme = env.createStore()
  assert.equal(theme.palette, 'cobalt')
  assert.doesNotThrow(() => theme.setPalette('wine'))
  assert.equal(theme.palette, 'wine')
  assert.equal(env.globals.document.documentElement.dataset.palette, 'wine')
})

test('pre-paint initialization agrees with persisted and system preferences', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  for (const [saved, system, expected] of [
    ['dark', false, true],
    ['light', true, false],
    [null, true, true],
    ['system', false, false],
    ['invalid', true, true]
  ]) {
    let actual
    const document = {
      documentElement: {
        dataset: {},
        classList: {
          toggle: (_, value) => {
            actual = value
          }
        },
        style: {}
      }
    }
    vm.runInNewContext(bootstrap, {
      localStorage: { getItem: () => saved },
      matchMedia: () => ({ matches: system }),
      document
    })
    assert.equal(actual, expected)
    assert.equal(document.documentElement.style.colorScheme, expected ? 'dark' : 'light')
    assert.equal(document.documentElement.dataset.palette, 'cobalt')
  }
})

test('pre-paint palette restoration matches registered palettes, including invalid and disabled storage', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  for (const saved of [...colorPalettes.map((option) => option.value), null, 'invalid']) {
    for (const dark of [false, true]) {
      const document = { documentElement: { dataset: {}, style: {}, classList: { toggle() {} } } }
      vm.runInNewContext(bootstrap, {
        localStorage: { getItem: (key) => (key === 'chery-palette' ? saved : 'system') },
        matchMedia: () => ({ matches: dark }),
        document
      })
      const expected = colorPalettes.some((option) => option.value === saved) ? saved : 'cobalt'
      assert.equal(document.documentElement.dataset.palette, expected)
      assert.equal(document.documentElement.style.colorScheme, dark ? 'dark' : 'light')
    }
  }
  const document = { documentElement: { dataset: {}, style: {}, classList: { toggle() {} } } }
  assert.doesNotThrow(() =>
    vm.runInNewContext(bootstrap, {
      localStorage: {
        getItem() {
          throw new Error('Storage disabled')
        }
      },
      matchMedia: () => ({ matches: true }),
      document
    })
  )
  assert.equal(document.documentElement.dataset.palette, 'cobalt')
  assert.equal(document.documentElement.style.colorScheme, 'dark')
})

test('search ignores empty queries and unknown engines', () => {
  assert.equal(buildSearchURL('bing', '   \n'), null)
  assert.equal(buildSearchURL('missing', '动漫'), null)
})

test('every search engine encodes Chinese, query delimiters and URL path characters', () => {
  const query = '动漫 &?# + /测试'
  for (const engine of searchEngines) {
    const url = buildSearchURL(engine.id, '  ' + query + '  ')
    assert.equal(new URL(url).protocol, 'https:')
    assert.equal(decodeURIComponent(url.slice(engine.url.length)), query)
    assert(!url.includes(' '))
    assert.equal(new URL(url).hash, '')
  }
  assert.equal(new URL(buildSearchURL('bilibili', query)).searchParams.get('keyword'), query)
})

test('expanded directory has unique HTTPS destinations and four existing featured sites', () => {
  const sites = directory.flatMap((category) => category.sites)
  assert(directory.length >= 10)
  assert.equal(new Set(directory.map((category) => category.id)).size, directory.length)
  assert(sites.length >= 60)
  assert.equal(new Set(sites.map((site) => site.url)).size, sites.length)
  assert(sites.some((site) => site.url === 'https://www.moe48.com/'))
  assert(sites.some((site) => site.url === 'https://everythingmoe.com/'))
  assert.equal(featuredSites.length, 4)
  sites.forEach((site) => assert.equal(new URL(site.url).protocol, 'https:'))
  featuredSites.forEach((site) => assert(sites.includes(site)))
})

test('all six palette/mode combinations maintain 7:1 contrast on actual surfaces and filled actions', () => {
  const css = readFileSync(new URL('../src/assets/base.css', import.meta.url), 'utf8')
  const blocks = [...css.matchAll(/(?:^|\n)(:root[^{}]*)\{([^}]+)\}/g)]
  assert.equal(blocks.length, 6)
  function luminance(hex) {
    const channels = hex
      .slice(1)
      .match(/../g)
      .map((channel) => parseInt(channel, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  for (const palette of colorPalettes) {
    for (const dark of [false, true]) {
      const index = `${palette.value}/${dark ? 'dark' : 'light'}`
      const colors = {}
      for (const block of blocks) {
        const matches = block[1].split(',').some((selector) => {
          if (selector.includes('.dark') && !dark) return false
          const target = selector.match(/\[data-palette=['"]([^'"]+)['"]\]/)?.[1]
          return !target || target === palette.value
        })
        if (matches)
          Object.assign(
            colors,
            Object.fromEntries(
              [...block[2].matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/g)].map((match) => [
                match[1],
                match[2]
              ])
            )
          )
      }
      const bootStyles = readFileSync(new URL('../index.html', import.meta.url), 'utf8').match(
        /<style>([\s\S]*?)<\/style>/
      )[1]
      const selector = `html${dark ? '.dark' : ''}${palette.value === 'cobalt' ? '' : `[data-palette='${palette.value}']`}`
      const bootBackground = [...bootStyles.matchAll(/([^{}]+)\{([^}]+)\}/g)]
        .find((block) => block[1].trim() === selector)?.[2]
        .match(/background:\s*(#[\da-f]{6})/)?.[1]
      assert.equal(
        bootBackground,
        colors['--color-background'],
        `${index}: pre-paint background disagrees`
      )
      for (const foreground of [
        '--color-heading',
        '--color-text',
        '--color-text-secondary',
        '--color-text-muted',
        '--color-accent'
      ]) {
        for (const background of [
          '--color-background',
          '--color-surface',
          '--color-background-soft',
          '--color-background-mute',
          '--color-hero',
          '--color-panel-header',
          '--color-item-surface',
          '--color-accent-soft'
        ]) {
          const light = luminance(colors[foreground])
          const dark = luminance(colors[background])
          const ratio = (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)
          assert(
            ratio >= 7,
            'Theme ' +
              index +
              ': ' +
              foreground +
              ' on ' +
              background +
              ' is only ' +
              ratio.toFixed(2) +
              ':1'
          )
        }
      }
      const highlightText = luminance(colors['--color-on-highlight'])
      const highlightBackground = luminance(colors['--color-highlight'])
      const highlightRatio =
        (Math.max(highlightText, highlightBackground) + 0.05) /
        (Math.min(highlightText, highlightBackground) + 0.05)
      assert(
        highlightRatio >= 7,
        `Theme ${index}: highlight action contrast is ${highlightRatio.toFixed(2)}:1`
      )
      const actionText = luminance(colors['--color-on-accent'])
      const actionBackground = luminance(colors['--color-accent'])
      const actionRatio =
        (Math.max(actionText, actionBackground) + 0.05) /
        (Math.min(actionText, actionBackground) + 0.05)
      assert(
        actionRatio >= 7,
        `Theme ${index}: filled action contrast is ${actionRatio.toFixed(2)}:1`
      )
    }
  }
})

test('heat accumulates for repeated use and decays over one half-life', () => {
  const t0 = Date.now()
  const map = {}
  recordHeat(map, 'site', t0)
  recordHeat(map, 'site', t0)
  recordHeat(map, 'site', t0)
  assert.equal(heatScore(map, 'site'), 3)
  const storage = memoryStorage()
  writeHeat('k', map, storage)
  const decayed = readHeat('k', storage, t0 + HEAT_HALF_LIFE_MS)
  assert.ok(Math.abs(heatScore(decayed, 'site') - 1.5) < 1e-9)
})

test('recent heavy use outranks larger but older history (A → B switch)', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = Date.now()
  const map = {}
  // A：连续 30 天每天一次，最后一次在 14 天前
  for (let i = 0; i < 30; i++) {
    recordHeat(map, 'A', now - 14 * DAY - (29 - i) * DAY)
  }
  // B：最近 7 天每天一次，最后一次在现在
  for (let i = 0; i < 7; i++) {
    recordHeat(map, 'B', now - (6 - i) * DAY)
  }
  const storage = memoryStorage()
  writeHeat('k', map, storage)
  const heat = readHeat('k', storage, now)
  assert.ok(
    heatScore(heat, 'B') > heatScore(heat, 'A'),
    '近期使用应反超累计次数优势：B 热度 ' +
      heatScore(heat, 'B') +
      ' ≤ A 热度 ' +
      heatScore(heat, 'A')
  )
  assert.equal(rankByHeat(heat)[0].key, 'B')
})

test('heat below the active threshold does not count as meaningful usage', () => {
  const map = {}
  recordHeat(map, 'x', 0)
  recordHeat(map, 'x', 0)
  assert.equal(maxHeat(map), 2)
  assert.ok(maxHeat(map) < MIN_ACTIVE_SCORE)
  recordHeat(map, 'x', 0)
  assert.ok(maxHeat(map) >= MIN_ACTIVE_SCORE)
})

test('rankByHeat orders descending and breaks ties by key', () => {
  const map = {}
  recordHeat(map, 'bing', 0)
  recordHeat(map, 'bing', 0)
  recordHeat(map, 'baidu', 0)
  recordHeat(map, 'google', 0)
  recordHeat(map, 'google', 0)
  assert.deepEqual(
    rankByHeat(map).map((item) => item.key),
    ['bing', 'google', 'baidu']
  )
})

test('pickTopByHeat selects top-heat items and fills the rest in fallback order', () => {
  const map = {}
  recordHeat(map, 'https://hot-a.example/', 0)
  recordHeat(map, 'https://hot-a.example/', 0)
  recordHeat(map, 'https://hot-b.example/', 0)
  const candidates = ['default-1', 'hot-b', 'default-2', 'hot-a', 'default-3'].map((name) => ({
    name,
    url: 'https://' + name + '.example/'
  }))
  const fallbackOrder = new Map(
    ['default-1', 'default-2', 'default-3'].map((name, index) => [
      'https://' + name + '.example/',
      index
    ])
  )
  const picked = pickTopByHeat(candidates, map, 4, (item) => item.url, fallbackOrder)
  assert.deepEqual(
    picked.map((item) => item.name),
    ['hot-a', 'hot-b', 'default-1', 'default-2']
  )
})

test('readHeat tolerates missing, malformed and unavailable storage', () => {
  assert.deepEqual(readHeat('k', memoryStorage()), {})
  const broken = memoryStorage()
  broken.setItem('k', '{not-json')
  assert.deepEqual(readHeat('k', broken), {})
  const malformed = memoryStorage()
  malformed.setItem(
    'k',
    JSON.stringify({ good: { score: 1, lastAt: 0 }, bad: 'nope', zero: { score: 0, lastAt: 0 } })
  )
  assert.deepEqual(Object.keys(readHeat('k', malformed, 0)), ['good'])
  const now = Date.now()
  const stale = memoryStorage()
  stale.setItem('k', JSON.stringify({ old: { score: 5, lastAt: now - 30 * HEAT_HALF_LIFE_MS } }))
  assert.deepEqual(readHeat('k', stale, now), {})
  assert.doesNotThrow(() =>
    writeHeat(
      'k',
      {},
      {
        getItem: () => null,
        setItem: () => {
          throw new Error('full')
        }
      }
    )
  )
  assert.deepEqual(
    readHeat('k', {
      getItem: () => {
        throw new Error('no storage')
      }
    }),
    {}
  )
})
