export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  // Round at each unit's precision before picking the unit, so values near a
  // boundary (e.g. 999.7ms, 9960ms) roll over instead of showing "1000ms" or "10.0s".
  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenths = Math.round(ms / 100)
  if (tenths < 100) return `${(tenths / 10).toFixed(1)}s`

  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`

  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`

  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}
