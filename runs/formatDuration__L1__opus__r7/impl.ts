export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Round within each unit before picking it, so e.g. 59_700ms becomes "1m 0s", not "60s".
  if (Math.round(ms) < 1000) return `${Math.round(ms)}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  if (totalSeconds < 3600) {
    return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
  }

  const totalMinutes = Math.round(totalSeconds / 60)
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
