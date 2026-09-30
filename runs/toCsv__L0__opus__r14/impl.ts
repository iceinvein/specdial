export type ExportRow = Record<string, string | number>

// Quote per RFC 4180: wrap in double quotes when the value contains a comma,
// quote, CR or LF, and double any embedded quotes.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Header is the union of all keys, in first-seen order, so rows with
  // missing or extra keys still line up; missing values become empty cells.
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
