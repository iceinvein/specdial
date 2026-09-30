/**
 * Formats a duration in milliseconds as a short human-readable string:
 * "250ms", "1.5s", "42s", "1m 30s", "2h 5m". Missing or invalid values
 * (null, undefined, NaN, negative) render as an en dash.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Each branch checks the rounded value so that e.g. 999.7ms or 9960ms
  // move up to the next unit instead of showing "1000ms" or "10.0s".
  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
