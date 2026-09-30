export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '–'
  if (ms < 1000) return `${ms}ms`

  const seconds = ms / 1000
  // Round on tenths of a second to avoid toFixed's binary-float quirks (e.g. 1050ms).
  if (seconds < 10) return (Math.round(ms / 100) / 10).toFixed(1) + 's'
  if (seconds < 60) return `${Math.round(seconds)}s`

  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round((ms - minutes * 60000) / 1000)
  return `${minutes}m ${remainder}s`
}
