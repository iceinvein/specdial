export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const columns = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) columns.add(key)
  }
  const headers = Array.from(columns)

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
