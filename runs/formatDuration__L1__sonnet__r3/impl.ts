export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'

  const rounded = Math.round(ms)
  if (rounded < 1000) return `${rounded}ms`

  const tenths = Math.round(rounded / 100) / 10
  if (tenths < 10) return `${tenths.toFixed(1)}s`

  const totalSeconds = Math.round(rounded / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${seconds}s`
}
