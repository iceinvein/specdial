export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '–'
  if (ms < 1000) return `${String(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 10) return (Math.round(ms / 100) / 10).toFixed(1) + 's'
  if (seconds < 60) return `${Math.round(seconds)}s`

  // `%` is exact for doubles, so the remainder never goes negative or past a minute.
  const remainderMs = ms % 60000
  const minutes = Math.round((ms - remainderMs) / 60000)
  return `${minutes}m ${Math.round(remainderMs / 1000)}s`
}
