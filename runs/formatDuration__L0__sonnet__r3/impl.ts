const PLACEHOLDER = '—'

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return PLACEHOLDER

  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds === 0) return ms > 0 ? '<1s' : '0s'

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: [number, string][] = [
    [days, 'd'],
    [hours, 'h'],
    [minutes, 'm'],
    [seconds, 's'],
  ]

  // Show the two most significant units, skipping zero-valued ones (e.g. "1h", "1m 30s").
  const start = parts.findIndex(([value]) => value > 0)
  return parts
    .slice(start, start + 2)
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(' ')
}
