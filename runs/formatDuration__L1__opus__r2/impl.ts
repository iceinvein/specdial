export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Each tier rounds before comparing, so values near a boundary
  // (e.g. 9960ms) roll over to the next tier instead of showing "10.0s".
  if (Math.round(ms) < 1000) return `${Math.round(ms)}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  if (totalSeconds < 3600) {
    return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
  }

  const totalMinutes = Math.floor(totalSeconds / 60)
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
