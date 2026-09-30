const UNITS: [string, number][] = [
  ['d', 86_400],
  ['h', 3_600],
  ['m', 60],
  ['s', 1],
]

/**
 * Formats a millisecond duration as a short string, e.g. `1m 30s`.
 * Shows at most the two largest non-zero units. Missing or invalid input
 * (null, undefined, NaN, negative) returns `-`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '-'
  if (ms > 0 && ms < 1000) return '<1s'

  let remaining = Math.floor(ms / 1000)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    if (count > 0) parts.push(`${count}${label}`)
  }
  return parts.length ? parts.slice(0, 2).join(' ') : '0s'
}
