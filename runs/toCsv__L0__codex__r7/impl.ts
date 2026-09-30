export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const escapeCell = (value: string | number): string => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map(header =>
      Object.prototype.hasOwnProperty.call(row, header) ? escapeCell(row[header]) : ''
    ).join(','))
  }

  return lines.join('\n')
}
