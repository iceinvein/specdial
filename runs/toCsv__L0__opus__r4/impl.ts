export type ExportRow = Record<string, string | number>

// Quote a field per RFC 4180 when it contains a delimiter, quote, or line break.
function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Columns are the union of keys across all rows, in first-seen order.
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

  const lines = [
    columns.map(escapeField).join(','),
    ...rows.map((row) => columns.map((col) => escapeField(Object.hasOwn(row, col) ? row[col] : undefined)).join(',')),
  ]
  return lines.join('\r\n')
}
