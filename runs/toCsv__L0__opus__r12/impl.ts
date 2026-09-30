export type ExportRow = Record<string, string | number>

// RFC 4180: fields containing a delimiter, quote, or line break are wrapped
// in double quotes, with embedded quotes doubled.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  // Header is the union of keys across all rows, in first-seen order, so rows
  // with missing or extra keys still line up under the right columns.
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
  if (columns.length === 0) return ''

  const lines = [columns.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(columns.map((col) => escapeField(row[col])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
