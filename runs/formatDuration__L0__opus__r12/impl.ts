const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * showing at most the two largest non-zero units (e.g. `1m 30s`, `2h 5m`, `3d 4h`).
 *
 * - Durations under one second are shown in milliseconds (`450ms`, `0ms`).
 * - Smaller units are truncated, not rounded, so values never read as `60s` or `24h`.
 * - Negative durations are prefixed with `-`.
 * - `null`, `undefined`, `NaN` and infinite values return `—`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'

  const sign = ms < 0 ? '-' : ''
  let remaining = Math.floor(Math.abs(ms))

  if (remaining < 1_000) return `${sign}${remaining}ms`

  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining %= size
    if (count > 0) parts.push(`${count}${label}`)
    else if (parts.length > 0) break // skip e.g. "1h 0m 5s" -> "1h"
    if (parts.length === 2) break
  }

  return sign + parts.join(' ')
}
