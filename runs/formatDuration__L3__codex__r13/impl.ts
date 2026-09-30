export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  if (ms < 10000) return `${seconds.toFixed(1)}s`
  if (ms < 60000) return `${Math.round(seconds)}s`

  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds - minutes * 60)
  return `${minutes}m ${remainder}s`
}
