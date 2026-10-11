/**
 * 用户本地热度统计（时间衰减指数平滑）。
 *
 * 每个项目维护 `{ score, lastAt }`，每次使用时更新：
 *   score = score * 0.5 ^ ((now - lastAt) / 半衰期) + 1
 *
 * 越近期的使用权重越高，历史热度随半衰期自然衰减，避免"累计次数最多但已停用"的
 * 项目长期占据默认优先级（例如用户从 A 搜索引擎改用 B 后，B 的热度会逐步反超 A，
 * 而不是永远被几个月的旧使用记录压住）。
 */
export const HEAT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000 // 半衰期：7 天
/** 热度达到该分数才算"有效使用"，用于抑制小样本导致的默认优先级抖动。 */
export const MIN_ACTIVE_SCORE = 3
/** 低于该分数的条目视为已冷却，读取时清除，避免死数据无限累积。 */
const HEAT_MIN_SCORE = 0.01

export interface HeatEntry {
  score: number
  lastAt: number
}

export type HeatMap = Record<string, HeatEntry>

/** 记录一次使用：先按流逝时间衰减旧热度，再加 1。 */
export function recordHeat(map: HeatMap, key: string, now = Date.now()): HeatMap {
  const entry = map[key]
  const elapsed = entry ? Math.max(0, now - entry.lastAt) : 0
  const decay = Math.pow(0.5, elapsed / HEAT_HALF_LIFE_MS)
  map[key] = { score: (entry ? entry.score * decay : 0) + 1, lastAt: now }
  return map
}

export function heatScore(map: HeatMap, key: string): number {
  return map[key]?.score ?? 0
}

export function maxHeat(map: HeatMap): number {
  let max = 0
  for (const entry of Object.values(map)) max = Math.max(max, entry.score)
  return max
}

/** 按热度从高到低返回（同分按 key 字典序，保证顺序稳定）。 */
export function rankByHeat(map: HeatMap): Array<{ key: string; score: number }> {
  return Object.entries(map)
    .map(([key, entry]) => ({ key, score: entry.score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
}

/**
 * 从候选集中取热度最高的 count 项：按热度降序，同分（含无热度项）按 fallbackOrder
 * 稳定回落。用于"常用入口"这类跨分类、只看热度的区块。
 */
export function pickTopByHeat<T>(
  candidates: readonly T[],
  heat: HeatMap,
  count: number,
  keyOf: (item: T) => string,
  fallbackOrder: ReadonlyMap<string, number>
): T[] {
  return [...candidates]
    .sort((a, b) => {
      const diff = heatScore(heat, keyOf(b)) - heatScore(heat, keyOf(a))
      if (diff !== 0) return diff
      const aOrder = fallbackOrder.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER
      const bOrder = fallbackOrder.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder
    })
    .slice(0, count)
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/**
 * 读取并规范化热度：每个条目按"当前时刻"折算衰减后的分数，并把 lastAt 推进到当前，
 * 保证后续 recordHeat 不会重复衰减。已冷却（低于 HEAT_MIN_SCORE）的条目会被剔除。
 */
export function readHeat(storageKey: string, storage?: Storage, now = Date.now()): HeatMap {
  const store = storage ?? safeStorage()
  if (!store) return {}
  try {
    const raw = store.getItem(storageKey)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const map: HeatMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      const entry = value as HeatEntry
      if (
        entry &&
        typeof entry.score === 'number' &&
        Number.isFinite(entry.score) &&
        entry.score > 0 &&
        typeof entry.lastAt === 'number'
      ) {
        const elapsed = Math.max(0, now - entry.lastAt)
        const score = entry.score * Math.pow(0.5, elapsed / HEAT_HALF_LIFE_MS)
        if (score >= HEAT_MIN_SCORE) map[key] = { score, lastAt: now }
      }
    }
    return map
  } catch {
    return {}
  }
}

export function writeHeat(storageKey: string, map: HeatMap, storage?: Storage): void {
  const store = storage ?? safeStorage()
  if (!store) return
  try {
    store.setItem(storageKey, JSON.stringify(map))
  } catch {
    /* 存储不可用时静默降级，功能不受影响。 */
  }
}
