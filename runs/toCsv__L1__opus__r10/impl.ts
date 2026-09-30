export type ExportRow = Record<string, string | number>

function escapeField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  // RFC 4180: quote fields containing commas, quotes, or line breaks,
  // and double any embedded quotes.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Collect columns from every row, in first-seen order, so rows with
  // extra or missing keys still line up under the right header.
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
    lines.push(columns.map((column) => escapeField(row[column])).join(','))
  }
  return lines.join('\n') + '\n'
}
