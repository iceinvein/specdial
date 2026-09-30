/**
 * Formats a duration using compact units, omitting zero-valued units.
 * Fractions of a millisecond are discarded below one second; otherwise,
 * fractions of a second are discarded. Invalid or missing values return `—`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
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
  let seconds = Math.floor(ms / 1000)
  const parts: string[] = []

  for (const [size, suffix] of units) {
    const value = Math.floor(seconds / size)
    if (value > 0) {
      parts.push(`${value}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
