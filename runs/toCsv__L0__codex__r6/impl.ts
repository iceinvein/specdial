export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
  if (headers.length === 0) return ''

  const escape = (value: string | number): string => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(header =>
      Object.prototype.hasOwnProperty.call(row, header) ? escape(row[header]) : ''
    ).join(','))
  }

  return lines.join('\n')
}
