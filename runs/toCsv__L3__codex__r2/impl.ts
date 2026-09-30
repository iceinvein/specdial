export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]

  for (const row of rows) {
    const fields = keys.map((key) => {
      const value = key in row ? String(row[key]) : ''
      return /[,"\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value
    })
    lines.push(fields.join(','))
  }

  return `${lines.join('\n')}\n`
}
