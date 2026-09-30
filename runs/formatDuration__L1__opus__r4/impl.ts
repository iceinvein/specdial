export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Each branch checks the rounded value so e.g. 999.6ms becomes "1.0s", not "1000ms".
  if (Math.round(ms) < 1000) return `${Math.round(ms)}ms`

  const tenths = Math.round(ms / 100) / 10
  if (tenths < 10) return `${tenths.toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
