const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a duration in milliseconds as a short human-readable string,
 * e.g. `90000` -> `"1m 30s"`.
 *
 * - Shows at most the two largest non-zero units (`"2h 5m"`, `"3d 4h"`);
 *   smaller units are truncated, not rounded.
 * - Durations under one second are shown in milliseconds (`"250ms"`, `"0ms"`).
 * - Missing or invalid input (null, undefined, NaN, Infinity, negative)
 *   returns `"—"`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'

  if (ms < 1000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
    else if (parts.length > 0) break // keep units adjacent: "1h", not "1h 5s"
    if (parts.length === 2) break
  }
  return parts.join(' ')
}
