/** Formats nonnegative durations, truncating fractional milliseconds or seconds. */
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
    const count = Math.floor(seconds / size)
    if (count > 0) {
      parts.push(`${count}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
