export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'
  if (ms === 0) return '0s'
  if (ms < 1000) return '<1s'

  let total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  total %= 86400
  const hours = Math.floor(total / 3600)
  total %= 3600
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds) parts.push(`${seconds}s`)

  return parts.slice(0, 2).join(' ')
}
