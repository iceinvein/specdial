export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a comma, double quote, or line break,
// and escape embedded double quotes by doubling them.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Union of keys in first-seen order, so rows with extra or missing keys
  // still line up under the right column.
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
