export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]

  for (const row of rows) {
    const fields = headers.map((key) => {
      const value = key in row ? String(row[key]) : ''
      return /[,"\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value
    })
    lines.push(fields.join(','))
  }

  return lines.join('\n') + '\n'
}
