/** Formats nonnegative durations, rounding down to milliseconds or whole seconds. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms === 0) {
    return '0s'
  }

  if (ms < 1000) {
    return `${Math.floor(ms)}ms`
  }

  const units = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ] as const
  let remaining = Math.floor(ms / 1000)
  const parts: string[] = []

  for (const [seconds, suffix] of units) {
    const count = Math.floor(remaining / seconds)
    if (count > 0) {
      parts.push(`${count}${suffix}`)
    }
    remaining %= seconds
  }

  return parts.join(' ')
}
