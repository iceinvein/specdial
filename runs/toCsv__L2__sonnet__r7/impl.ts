export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(
      keys
        .map((key) => (key in row ? escapeField(String(row[key])) : ''))
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
