const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * showing at most the two largest non-zero units (e.g. `1m 30s`, `2h 5m`, `3d 4h`).
 *
 * - `null`, `undefined`, `NaN`, infinite, or negative values render as `—`.
 * - `0` renders as `0s`; positive values under one second render as `<1s`.
 * - Values are truncated (not rounded) to whole seconds.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms === 0) return '0s'
  if (ms < 1000) return '<1s'

  let remaining = Math.floor(ms)
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    if (count > 0 || parts.length > 0) parts.push(`${count}${label}`)
    if (parts.length === 2) break
  }
  // Drop a trailing zero unit, e.g. `2h 0m` -> `2h`.
  if (parts.length === 2 && parts[1].startsWith('0')) parts.pop()
  return parts.join(' ')
}
