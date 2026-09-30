export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    const fields = headers.map((key) => {
      const value = row[key]
      return value === undefined ? '' : escapeField(String(value))
    })
    lines.push(fields.join(','))
  }
  return lines.join('\n') + '\n'
}
