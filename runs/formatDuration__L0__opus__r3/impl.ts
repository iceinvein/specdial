const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a duration in milliseconds as a short human-readable string,
 * using at most the two largest non-zero adjacent units (e.g. `1m 30s`, `2h 5m`, `3d 4h`).
 *
 * - Values are truncated, never rounded up, so `59_999` is `59s`, not `60s`.
 * - Durations under one second are shown in milliseconds (`450ms`).
 * - `null`, `undefined`, `NaN`, infinite and negative values render as `—`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1_000) return `${Math.floor(ms)}ms`

  const i = UNITS.findIndex(([, size]) => ms >= size)
  const [label, size] = UNITS[i]
  const major = Math.floor(ms / size)
  const parts = [`${major}${label}`]

  const next = UNITS[i + 1]
  if (next) {
    const minor = Math.floor((ms - major * size) / next[1])
    if (minor > 0) parts.push(`${minor}${next[0]}`)
  }
  return parts.join(' ')
}
