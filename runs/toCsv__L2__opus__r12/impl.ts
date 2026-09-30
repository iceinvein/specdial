export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(
      headers
        .map((key) => (Object.hasOwn(row, key) ? escapeField(String(row[key])) : ''))
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
