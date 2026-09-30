const UNITS: Array<[label: string, ms: number]> = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/**
 * Formats a duration in milliseconds as a short human-readable string,
 * e.g. `90000` -> `"1m 30s"`.
 *
 * - Shows at most the two largest non-zero units (`"2h 5m"`, `"3d 4h"`);
 *   smaller units are truncated, never rounded up.
 * - Durations under one second are shown in milliseconds (`"450ms"`).
 * - Missing or invalid input (null, undefined, NaN, Infinity, negative)
 *   returns `"—"` so the UI has a placeholder to render.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'

  const total = Math.floor(ms)
  if (total < 1_000) return `${total}ms`

  const parts: string[] = []
  let remaining = total
  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size)
    remaining -= value * size
    if (value > 0) parts.push(`${value}${label}`)
    else if (parts.length > 0) break
    if (parts.length === 2) break
  }
  return parts.join(' ')
}
