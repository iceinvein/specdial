export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—'
  }

  if (ms === 0) {
    return '0s'
  }

  if (ms < 1000) {
    return '<1s'
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
    const amount = Math.floor(seconds / size)
    if (amount > 0) {
      parts.push(`${amount}${label}`)
    }
    seconds %= size
  }

  return parts.join(' ')
}
