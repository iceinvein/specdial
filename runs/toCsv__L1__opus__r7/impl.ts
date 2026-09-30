export type ExportRow = Record<string, string | number>

// Quote a field if it contains a comma, double quote, or line break,
// doubling any embedded quotes (RFC 4180).
function escapeField(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Header is the union of keys across all rows, in first-seen order,
  // so rows with extra or missing keys still line up.
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

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((key) => escapeField(row[key])).join(','))
  }
  return lines.join('\n') + '\n'
}
