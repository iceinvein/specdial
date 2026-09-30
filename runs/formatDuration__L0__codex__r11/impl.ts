/**
 * Formats nonnegative durations using milliseconds below one second and whole
 * days, hours, minutes, and seconds otherwise. Missing or invalid values use —.
 * Fractional milliseconds and subsecond remainders are truncated.
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
  const units: [number, string][] = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ]

  for (const [size, label] of units) {
    const value = Math.floor(seconds / size)
    if (value > 0) {
      parts.push(`${value}${label}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
