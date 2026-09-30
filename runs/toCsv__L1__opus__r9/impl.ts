export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a comma, double quote, or line break,
// and escape embedded double quotes by doubling them.
function escapeField(value: string | number): string {
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Collect columns from every row (first-seen order) so rows with extra
  // keys don't silently lose data; missing values become empty fields.
  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }

  const lines = [columns.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(columns.map((col) => (col in row ? escapeField(row[col]) : '')).join(','))
  }
  return lines.join('\n') + '\n'
}
