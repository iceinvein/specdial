/**
 * Formats a duration in milliseconds as a short human-readable string.
 *
 *   null / undefined / invalid -> "–"
 *   < 1s    -> "250ms"
 *   < 10s   -> "1.5s"
 *   < 1m    -> "42s"
 *   < 1h    -> "1m 30s"
 *   >= 1h   -> "2h 5m"
 *
 * Rounding happens before choosing a unit, so values near a boundary
 * roll over cleanly (e.g. 59_700ms is "1m 0s", not "60s").
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  const rounded = Math.round(ms)
  if (rounded < 1000) return `${rounded}ms`

  const tenths = Math.round(rounded / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(rounded / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    return `${minutes}m ${totalSeconds % 60}s`
  }

  const totalMinutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  return `${hours}h ${totalMinutes % 60}m`
}
