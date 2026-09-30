export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a comma, double quote, or line break,
// and escape embedded double quotes by doubling them.
function escapeField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Columns are the union of all row keys, in first-seen order, so rows with
  // extra or missing keys still line up under the right header.
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
