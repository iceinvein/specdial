export type ExportRow = Record<string, string | number>

function escapeField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const columns = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) columns.add(key)
  }
  const headers = [...columns]
  const lines = [headers.map(escapeField).join(',')]

  for (const row of rows) {
    lines.push(headers.map(header =>
      Object.prototype.hasOwnProperty.call(row, header) ? escapeField(row[header]) : ''
    ).join(','))
  }

  return lines.join('\n')
}
