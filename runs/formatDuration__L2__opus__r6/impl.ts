export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  // Round via ms / 100 rather than toFixed, which misrounds halves like 1.45.
  if (seconds < 10) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`

  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${Math.round(seconds - minutes * 60)}s`
}
