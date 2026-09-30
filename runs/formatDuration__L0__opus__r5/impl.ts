const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short human-readable string,
 * e.g. `90000` -> `1m 30s`, `3723000` -> `1h 2m`, `450` -> `450ms`.
 *
 * - Shows at most the two largest non-zero units; smaller parts are truncated, not rounded.
 * - Durations under one second are shown in whole milliseconds.
 * - Missing or non-finite input (null, undefined, NaN, Infinity) returns `—`.
 * - Negative durations are formatted by magnitude with a leading `-`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 0) return `-${formatDuration(-ms)}`

  if (ms < 1_000) return `${Math.floor(ms)}ms`

  const parts: string[] = []
  let remaining = Math.floor(ms)
  for (const [label, size] of UNITS) {
    const count = Math.floor(remaining / size)
    remaining -= count * size
    if (count > 0) parts.push(`${count}${label}`)
    else if (parts.length > 0) break
    if (parts.length === 2) break
  }
  return parts.join(' ')
}
