const PLACEHOLDER = '–'

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return PLACEHOLDER

  // Round at each unit before picking a format, so values near a boundary
  // (e.g. 999.6ms, 9960ms, 59600ms) roll over instead of showing "1000ms", "10.0s" or "60s".
  const wholeMs = Math.round(ms)
  if (wholeMs < 1000) return `${wholeMs}ms`

  const tenthsOfSecond = Math.round(ms / 100)
  if (tenthsOfSecond < 100) return `${(tenthsOfSecond / 10).toFixed(1)}s`

  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`

  const hours = Math.floor(totalMinutes / 60)
  return `${hours}h ${totalMinutes % 60}m`
}
