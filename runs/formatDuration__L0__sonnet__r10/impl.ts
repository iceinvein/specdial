export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'
  if (ms < 1000) return ms === 0 ? '0s' : '<1s'

  const total = Math.floor(ms / 1000)
  const units: [string, number][] = [
    ['d', Math.floor(total / 86400)],
    ['h', Math.floor((total % 86400) / 3600)],
    ['m', Math.floor((total % 3600) / 60)],
    ['s', total % 60],
  ]

  const start = units.findIndex(([, v]) => v > 0)
  return units
    .slice(start, start + 2)
    .filter(([, v]) => v > 0)
    .map(([u, v]) => `${v}${u}`)
    .join(' ')
}
