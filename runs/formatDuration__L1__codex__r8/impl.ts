export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '–'
  }

  const milliseconds = Math.round(ms)
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }

  if (milliseconds < 10000) {
    return `${(milliseconds / 1000).toFixed(1)}s`
  }

  const seconds = Math.round(milliseconds / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
