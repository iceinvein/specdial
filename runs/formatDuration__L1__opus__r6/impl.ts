const EMPTY = '–'

/**
 * Formats a duration in milliseconds as a short human-readable string.
 *
 *   null/undefined/invalid → "–"
 *   < 1s                   → "250ms"
 *   < 10s                  → "1.5s"
 *   < 1m                   → "42s"
 *   < 1h                   → "1m 30s"
 *   ≥ 1h                   → "2h 5m"
 *
 * Each tier checks the value *after* rounding, so e.g. 59_999ms becomes
 * "1m 0s" rather than "60s".
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return EMPTY

  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  const hours = Math.floor(totalMinutes / 60)
  return `${hours}h ${totalMinutes % 60}m`
}
