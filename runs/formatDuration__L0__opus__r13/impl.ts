const UNITS: ReadonlyArray<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

const PLACEHOLDER = '—'

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `1m 30s`, `3725000` -> `1h 2m`, `450` -> `450ms`.
 *
 * - Shows at most the two largest non-zero units; smaller units are truncated.
 * - Durations under one second are shown in whole milliseconds.
 * - `null`, `undefined`, `NaN`, infinite, and negative values render as `—`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return PLACEHOLDER

  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    if (count > 0 || parts.length > 0) parts.push(`${count}${label}`)
    if (parts.length === 2) break
  }

  // Drop a trailing zero unit, e.g. "2h 0m" -> "2h".
  if (parts.length === 2 && parts[1].startsWith('0')) parts.pop()
  return parts.join(' ')
}
