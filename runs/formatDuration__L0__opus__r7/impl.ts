const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `"1m 30s"`, `3_725_000` -> `"1h 2m"`, `450` -> `"450ms"`.
 *
 * - Shows at most the two most significant non-zero units; smaller units are truncated.
 * - Durations under one second are shown in whole milliseconds.
 * - Negative values are formatted by magnitude with a leading `-`.
 * - `null`, `undefined`, `NaN` and infinite values return `"—"`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 0) return `-${formatDuration(-ms)}`

  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
    else if (parts.length > 0) break // only show adjacent units, e.g. "1h", not "1h 5s"
    if (parts.length === 2) break
  }
  return parts.join(' ')
}
