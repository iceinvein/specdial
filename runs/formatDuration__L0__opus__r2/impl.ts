const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `1m 30s`, `3723000` -> `1h 2m 3s`, `450` -> `450ms`.
 *
 * - Missing or non-finite input (null, undefined, NaN, Infinity) returns `—`.
 * - Durations under one second are shown in whole milliseconds.
 * - Otherwise, zero-valued units are omitted and sub-second remainders are truncated.
 * - Negative durations are formatted by magnitude with a leading `-`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'

  const sign = ms < 0 ? '-' : ''
  let remaining = Math.abs(ms)

  if (remaining < 1_000) return `${sign}${Math.floor(remaining)}ms`

  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    if (count > 0) {
      parts.push(`${count}${label}`)
      remaining -= count * size
    }
  }
  return sign + parts.join(' ')
}
