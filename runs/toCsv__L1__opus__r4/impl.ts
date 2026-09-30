export type ExportRow = Record<string, string | number>

// Quote a field per RFC 4180 when it contains a comma, quote, or line break.
function escapeField(value: string | number): string {
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Columns are the union of all row keys, in first-seen order.
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
    lines.push(headers.map((key) => (key in row ? escapeField(row[key]) : '')).join(','))
  }
  return lines.join('\n') + '\n'
}
