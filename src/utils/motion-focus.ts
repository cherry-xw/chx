// Callers provide only currently visible keys; hidden targets never consume a turn.
export function nextSpotlightKey(keys: readonly string[], current: string | undefined): string | undefined {
  if (!keys.length) return undefined
  const index = current === undefined ? -1 : keys.indexOf(current)
  return keys[(index + 1) % keys.length]
}
