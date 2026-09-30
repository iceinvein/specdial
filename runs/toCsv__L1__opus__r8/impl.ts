export type ExportRow = Record<string, string | number>

// Quote a field when it contains a delimiter, quote, or line break (RFC 4180),
// doubling any embedded quotes.
function escapeField(value: string | number): string {
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Header is the union of keys, in first-seen order, so rows with extra or
  // missing keys still line up under the right columns.
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
