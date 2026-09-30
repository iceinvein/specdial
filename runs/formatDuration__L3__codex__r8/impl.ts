export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  if (ms < 10000) return `${seconds.toFixed(1)}s`
  if (ms < 60000) return `${Math.round(seconds)}s`

  const minutes = Math.floor(ms / 60000)
  const remainingSeconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${remainingSeconds}s`
}
