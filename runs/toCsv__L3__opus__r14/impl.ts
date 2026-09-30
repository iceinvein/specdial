export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      header
        .map((key) => (Object.hasOwn(row, key) ? escapeField(String(row[key])) : ''))
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
