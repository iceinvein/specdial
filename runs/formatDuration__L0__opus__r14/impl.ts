const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `"1m 30s"`.
 *
 * - Shows at most the two most significant non-zero units (`"2h 5m"`, `"3d 4h"`).
 * - Durations under one second are shown in milliseconds (`"450ms"`).
 * - Values are truncated, not rounded, so a label never overstates elapsed time.
 * - `null`, `undefined`, `NaN`, infinite, and negative values render as `"—"`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    if (count > 0) parts.push(`${count}${label}`)
    else if (parts.length > 0) break // don't skip a unit, e.g. "1h 5s"
    if (parts.length === 2) break
  }
  return parts.join(' ')
}
