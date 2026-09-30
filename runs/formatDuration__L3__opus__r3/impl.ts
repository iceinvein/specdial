export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 10) return `${(Math.round(seconds * 10) / 10).toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`

  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds - minutes * 60)
  return `${minutes}m ${remainder}s`
}
