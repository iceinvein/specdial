/** Formats nonnegative durations, truncating fractions of the displayed unit. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms < 1000) {
    return `${Math.floor(ms)}ms`
  }

  let seconds = Math.floor(ms / 1000)
  const units: [number, string][] = [
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ]
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
