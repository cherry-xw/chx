import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useModeStore } from '../src/stores/counter.ts'
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

function browser(t, { saved = null, dark = false, storageDisabled = false } = {}) {
  const values = new Map(saved ? [['chery-theme', saved]] : [])
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
  }
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

test('body and secondary text maintain 7:1 contrast in both themes, including hover and hero surfaces', () => {
  const css = readFileSync(new URL('../src/assets/base.css', import.meta.url), 'utf8')
  const blocks = [...css.matchAll(/(?:^|\n):root(?:,\s*:root.dark|\.dark)\s*\{([^}]+)\}/g)]
  assert.equal(blocks.length, 2)
  function luminance(hex) {
    const channels = hex
      .slice(1)
      .match(/../g)
      .map((channel) => parseInt(channel, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  for (const [index, block] of blocks.entries()) {
    const colors = Object.fromEntries(
      [...block[1].matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/g)].map((match) => [match[1], match[2]])
    )
    for (const foreground of ['--color-text', '--color-text-secondary', '--color-text-muted']) {
      for (const background of [
        '--color-background',
        '--color-surface',
        '--color-background-soft',
        '--color-hero'
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
    '近期使用应反超累计次数优势：B 热度 ' + heatScore(heat, 'B') + ' ≤ A 热度 ' + heatScore(heat, 'A')
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
    writeHeat('k', {}, { getItem: () => null, setItem: () => { throw new Error('full') } })
  )
  assert.deepEqual(readHeat('k', { getItem: () => { throw new Error('no storage') } }), {})
})
