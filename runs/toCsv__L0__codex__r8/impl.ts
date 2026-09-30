export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const escape = (value: string | number): string => {
    const text = String(value)
    return /[,"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const lines = [columns.map(escape).join(',')]
  for (const row of rows) {
    lines.push(columns.map(column => {
      const value = Object.prototype.hasOwnProperty.call(row, column) ? row[column] : ''
      return escape(value)
    }).join(','))
  }
  return lines.join('\n')
}
