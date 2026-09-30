const UNITS: [label: string, ms: number][] = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a millisecond duration as a short display string, e.g. `1m 30s`.
 *
 * - Missing or non-finite input renders as `—`.
 * - Sub-second durations render in milliseconds (`450ms`); zero is `0s`.
 * - Otherwise shows the largest unit (d, h, m, s) plus the next one down if
 *   it's non-zero; smaller units are truncated: `1h 5m`, `2h`, `3d 4h`.
 * - Negative durations keep a leading `-`.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 0) return `-${formatDuration(-ms)}`
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.max(1, Math.floor(ms))}ms`

  let remaining = Math.floor(ms)
  const parts: string[] = []
  let started = false
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
    if (started) break
    started = value > 0
  }
  return parts.join(' ')
}
