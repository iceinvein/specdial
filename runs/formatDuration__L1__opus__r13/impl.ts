export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  const totalMs = Math.round(ms)
  if (totalMs < 1000) return `${totalMs}ms`
  // Below 9.95s, one decimal place; above that it would round to "10.0s".
  if (totalMs < 9950) return `${(totalMs / 1000).toFixed(1)}s`

  const totalSeconds = Math.round(totalMs / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
