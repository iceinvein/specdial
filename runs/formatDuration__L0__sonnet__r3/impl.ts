const UNITS: [string, number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'
  if (ms < 1000) return `${Math.round(ms)}ms`

  let remaining = Math.round(ms / 1000) * 1000
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const n = Math.floor(remaining / size)
    remaining -= n * size
    if (n > 0) parts.push(`${n}${label}`)
  }
  // Keep it short: show at most the two most significant units.
  return parts.slice(0, 2).join(' ')
}
