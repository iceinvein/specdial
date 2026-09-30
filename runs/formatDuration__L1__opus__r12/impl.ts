export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Round at each unit's precision before picking the unit, so values near a
  // boundary (e.g. 9960ms, 59_600ms) roll over instead of showing "10.0s" or "60s".
  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`

  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
