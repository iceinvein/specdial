const DURATION_UNITS = [
  [86_400, 'd'],
  [3_600, 'h'],
  [60, 'm'],
  [1, 's'],
] as const

/** Formats nonnegative durations, using an em dash for unavailable values. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms < 1_000) {
    return `${Math.floor(ms)}ms`
  }

  let seconds = Math.floor(ms / 1_000)
  const parts: string[] = []

  for (const [size, suffix] of DURATION_UNITS) {
    const amount = Math.floor(seconds / size)
    if (amount > 0) {
      parts.push(`${amount}${suffix}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
