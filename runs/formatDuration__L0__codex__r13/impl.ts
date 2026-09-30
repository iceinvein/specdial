/**
 * Formats whole milliseconds below one second, then whole days/hours/minutes/seconds.
 * Omits zero units and returns an em dash for missing or invalid durations.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms < 1000) {
    return `${Math.floor(ms)}ms`
  }

  let seconds = Math.floor(ms / 1000)
  const parts: string[] = []
  const units = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ] as const

  for (const [size, suffix] of units) {
    const value = Math.floor(seconds / size)
    if (value > 0) {
      parts.push(`${value}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
