export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '–'
  if (ms < 1000) return `${String(ms)}ms`
  if (ms < 10000) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  // % is exact in floating point, so the remainder can't come out negative.
  const remainder = ms % 60000
  const minutes = Math.round((ms - remainder) / 60000)
  return `${minutes}m ${Math.round(remainder / 1000)}s`
}
