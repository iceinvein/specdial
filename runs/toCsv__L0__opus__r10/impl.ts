export type ExportRow = Record<string, string | number>

// Quote a field per RFC 4180 when it contains a delimiter, quote, or line break.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Header is the union of all keys, in first-seen order, so rows with
  // missing or extra fields still line up under the right column.
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
