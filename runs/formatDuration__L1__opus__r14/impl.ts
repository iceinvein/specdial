/**
 * Formats a duration in milliseconds as a short human-readable string.
 *
 *   null / undefined / NaN / negative -> "–"
 *   < 1s    -> "250ms"
 *   < 10s   -> "1.5s"   (one decimal place)
 *   < 1m    -> "42s"
 *   < 1h    -> "1m 30s"
 *   >= 1h   -> "2h 5m"
 *
 * Rounding is applied before choosing a unit, so values near a boundary
 * roll over cleanly (e.g. 59_700 -> "1m 0s", not "60s").
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    return `${minutes}m ${totalSeconds % 60}s`
  }

  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  return `${hours}h ${totalMinutes % 60}m`
}
