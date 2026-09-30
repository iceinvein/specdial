/**
 * Formats non-negative milliseconds using compact duration units.
 * Missing or invalid values display as an em dash. Sub-second values use
 * whole milliseconds; longer durations are truncated to whole seconds.
 */
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

  let seconds = Math.floor(ms / 1000)
  const units = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ] as const
  const parts: string[] = []

  for (const [size, label] of units) {
    const count = Math.floor(seconds / size)
    if (count > 0) {
      parts.push(`${count}${label}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
