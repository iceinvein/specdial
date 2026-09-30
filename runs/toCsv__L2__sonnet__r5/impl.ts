export type ExportRow = Record<string, string | number>

function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(
      keys
        .map((key) => {
          const value = row[key]
          return value === undefined ? '' : escapeField(String(value))
        })
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
