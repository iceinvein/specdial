export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 10) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`

  const minutes = Math.floor(ms / 60000)
  const remainder = Math.round((ms - minutes * 60000) / 1000)
  return `${minutes}m ${remainder}s`
}
