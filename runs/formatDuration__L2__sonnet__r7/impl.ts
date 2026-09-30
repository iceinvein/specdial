export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '–'

  if (ms < 1000) return `${String(ms)}ms`

  if (ms < 10000) {
    // Integer tenths avoid binary floating-point errors from toFixed
    const tenths = Math.floor((ms + 50) / 100)
    return `${Math.floor(tenths / 10)}.${tenths % 10}s`
  }

  if (ms < 60000) return `${Math.round(ms / 1000)}s`

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
