export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a delimiter, quote, or line break,
// and double any embedded quotes.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Header is the union of all row keys, in first-seen order, so rows with
  // differing shapes still line up. Missing values become empty cells.
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
    lines.push(columns.map((col) => escapeField(row[col])).join(','))
  }
  return lines.join('\r\n')
}
