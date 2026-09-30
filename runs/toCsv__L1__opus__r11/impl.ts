export type ExportRow = Record<string, string | number>

// Quote a field if it contains a comma, double quote, or line break,
// doubling any embedded quotes (RFC 4180).
function escapeField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Columns are the union of all row keys, in order of first appearance,
  // so rows with differing keys don't shift values into the wrong column.
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
  return lines.map((line) => line + '\n').join('')
}
