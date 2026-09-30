export type ExportRow = Record<string, string | number>

function escapeField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]
  if (columns.length === 0) return ''

  const lines = [columns.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(columns.map(column =>
      Object.prototype.hasOwnProperty.call(row, column) ? escapeField(row[column]) : ''
    ).join(','))
  }
  return lines.join('\n')
}
