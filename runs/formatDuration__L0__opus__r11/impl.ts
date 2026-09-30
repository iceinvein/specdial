const UNITS: ReadonlyArray<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string.
 *
 * - Missing or invalid input (null, undefined, NaN, ±Infinity, negative) → `'—'`
 * - Under one second → milliseconds, e.g. `'450ms'`, `'0ms'`
 * - Otherwise the two most significant units, truncated (never rounded up),
 *   with zero-valued trailing units omitted: `'1m 30s'`, `'2h 5m'`, `'1h'`, `'3d 4h'`
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (parts.length === 0 && value === 0) continue
    parts.push(`${value}${label}`)
    if (parts.length === 2) break
  }
  if (parts.length === 2 && parts[1].startsWith('0')) parts.pop()
  return parts.join(' ')
}
