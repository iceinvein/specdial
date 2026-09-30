/** Formats nonnegative milliseconds, truncating fractions of the displayed unit. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms < 1000) {
    return `${Math.floor(ms)}ms`
  }

  let seconds = Math.floor(ms / 1000)
  const parts: string[] = []
  const units: readonly (readonly [number, string])[] = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ]

  for (const [size, suffix] of units) {
    const amount = Math.floor(seconds / size)
    if (amount > 0) {
      parts.push(`${amount}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
