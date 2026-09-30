export type ExportRow = Record<string, string | number>

// Quote a field if it contains a comma, double quote, or line break (RFC 4180).
function escapeField(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Columns come from the first row's keys; later rows missing a key get an empty field.
export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(escapeField).join(','),
    ...rows.map((row) => headers.map((key) => escapeField(row[key])).join(',')),
  ]
  return lines.join('\n') + '\n'
}
