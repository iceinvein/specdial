const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a duration in milliseconds as a short human-readable string,
 * showing at most the two most significant units (e.g. `1m 30s`, `2h 5m`).
 *
 * - Missing or invalid input (null, undefined, NaN, Infinity, negative) → `—`
 * - Under one second → milliseconds (e.g. `450ms`), `0` → `0s`
 * - Smaller units are truncated, not rounded, so a value never displays
 *   as longer than it actually was
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.floor(ms)}ms`

  const parts: string[] = []
  let remaining = Math.floor(ms)
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0 || parts.length > 0) parts.push(`${value}${label}`)
    if (parts.length === 2) break
  }
  // Drop a trailing zero unit: "2h 0m" → "2h"
  if (parts.length === 2 && parts[1].startsWith('0')) parts.pop()
  return parts.join(' ')
}
