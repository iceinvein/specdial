const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * showing at most the two largest units (e.g. `1m 30s`, `2h 5m`, `3d 4h`).
 *
 * - Missing or non-finite values render as `—`.
 * - Durations under one second render in milliseconds (e.g. `450ms`).
 * - Smaller units are truncated, not rounded (`59.9s` → `59s`), so a
 *   displayed value never overstates elapsed time.
 * - Negative durations are prefixed with `-`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 0) return `-${formatDuration(-ms)}`
  if (ms < 1000) return `${Math.floor(ms)}ms`

  const total = Math.floor(ms)
  const first = UNITS.findIndex(([, size]) => total >= size)
  const parts: string[] = []
  let remaining = total
  for (const [label, size] of UNITS.slice(first, first + 2)) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
  }
  return parts.join(' ')
}
