export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(
      keys
        .map((key) => (Object.prototype.hasOwnProperty.call(row, key) ? escapeField(String(row[key])) : ''))
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
