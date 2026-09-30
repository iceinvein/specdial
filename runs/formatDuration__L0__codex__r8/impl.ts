/**
 * Formats non-negative durations using days, hours, minutes, and seconds.
 * Sub-second durations use milliseconds; fractional units are truncated.
 * Missing or invalid durations display an em dash.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
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

  for (const [size, suffix] of units) {
    const count = Math.floor(seconds / size)
    if (count > 0) {
      parts.push(`${count}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
