export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a comma, quote, CR or LF; double embedded quotes.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  // Header is the union of keys across all rows, in first-seen order,
  // so rows with differing shapes don't silently drop columns.
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }
  if (headers.length === 0) return ''

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(Object.hasOwn(row, h) ? row[h] : undefined)).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
