export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Round at each unit's precision before picking the unit, so values near a
  // boundary (e.g. 9960ms, 59_999ms) don't render as "10.0s" or "60s".
  if (Math.round(ms) < 1000) return `${Math.round(ms)}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
