const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `"1m 30s"`, `7_380_000` -> `"2h 3m"`, `450` -> `"450ms"`.
 *
 * - Shows at most the two most significant non-zero units (d, h, m, s).
 *   Lower units are truncated, never rounded up, so output never shows `60s`.
 * - Durations under one second are shown in whole milliseconds.
 * - Negative durations keep a leading `-`.
 * - `null`, `undefined`, `NaN` and infinities return `"—"`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'

  const sign = ms < 0 ? '-' : ''
  let remaining = Math.floor(Math.abs(ms))

  if (remaining < 1_000) return remaining === 0 ? '0s' : `${sign}${remaining}ms`

  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
    else if (parts.length > 0) break
    if (parts.length === 2) break
  }
  return sign + parts.join(' ')
}
