const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

const PLACEHOLDER = '—'

/**
 * Formats a millisecond duration for display, e.g. `1m 30s`, `2h 5m`, `450ms`.
 *
 * - Shows at most the two largest non-zero units (d, h, m, s); smaller units are truncated.
 * - Durations under one second are shown in whole milliseconds (`0ms` for zero).
 * - Missing, non-finite, or negative values render as a placeholder (`—`).
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return PLACEHOLDER

  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining %= size
    if (value > 0 || parts.length > 0) parts.push(`${value}${label}`)
    if (parts.length === 2) break
  }
  // Drop a trailing zero unit, e.g. "1h 0m" -> "1h".
  if (parts.length === 2 && parts[1].startsWith('0')) parts.pop()
  return parts.join(' ')
}
