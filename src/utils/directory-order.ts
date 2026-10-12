/** Keep saved IDs in order, discard removed/invalid IDs, and append newly added blocks. */
export function normalizeDirectoryOrder(saved: unknown, knownIds: readonly string[]): string[] {
  const known = new Set(knownIds)
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of [...(Array.isArray(saved) ? saved : []), ...knownIds]) {
    if (typeof id === 'string' && known.has(id) && !seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }
  return result
}

/** A filtered reorder may replace only the slots occupied by that visible subset. */
export function mergeVisibleOrder(
  current: readonly string[],
  previousVisible: readonly string[],
  nextVisible: readonly string[]
): string[] {
  const visible = new Set(previousVisible)
  if (
    visible.size !== previousVisible.length ||
    nextVisible.length !== previousVisible.length ||
    new Set(nextVisible).size !== visible.size ||
    previousVisible.some((id) => !current.includes(id)) ||
    nextVisible.some((id) => !visible.has(id))
  ) {
    return [...current]
  }
  let next = 0
  return current.map((id) => (visible.has(id) ? nextVisible[next++] : id))
}

export function moveVisibleBlock(
  current: readonly string[],
  visible: readonly string[],
  id: string,
  direction: -1 | 1
): string[] {
  const index = visible.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= visible.length) return [...current]
  const reordered = [...visible]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  return mergeVisibleOrder(current, visible, reordered)
}
