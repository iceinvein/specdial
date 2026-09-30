const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * showing at most the two largest units, e.g. `1m 30s`, `2h 5m`, `3d`.
 *
 * - Missing or invalid input (null, undefined, NaN, Infinity, negative) returns `—`.
 * - Durations under one second are shown in milliseconds, e.g. `450ms`.
 * - Otherwise the value is truncated to whole seconds; zero trailing units are omitted.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1_000) return `${Math.floor(ms)}ms`

  let remaining = Math.floor(ms / 1_000) * 1_000
  const parts: string[] = []
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    const started = parts.length > 0
    if (count > 0) parts.push(`${count}${label}`)
    if (started) break
  }
  return parts.join(' ')
}
