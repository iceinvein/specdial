export type ExportRow = Record<string, string | number>

function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(row[h])).join(','))
  }
  return lines.join('\n')
}
