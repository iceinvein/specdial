const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * showing at most the two largest units, e.g. `1m 30s`, `2h 5m`, `3d 4h`.
 *
 * - Missing or invalid input (null, undefined, NaN, Infinity, negative) → `—`
 * - Under one second → milliseconds, e.g. `0ms`, `250ms`
 * - Smaller units are truncated, not rounded, so values never read as `1m 60s`
 * - A zero second unit is omitted: 1h 0m 5s → `1h`, 2m 0s → `2m`
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const idx = UNITS.findIndex(([, size]) => remaining >= size)
  const parts: string[] = []
  for (const [label, size] of UNITS.slice(idx, idx + 2)) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
  }
  return parts.join(' ')
}
