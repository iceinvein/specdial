export type ExportRow = Record<string, string | number>

// RFC 4180: quote fields containing a comma, double quote or newline, doubling inner quotes.
function formatField(value: string | number): string {
  const text = String(value)
  if (/[,"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(header.map((key) => (Object.hasOwn(row, key) ? formatField(row[key]) : '')).join(','))
  }
  return lines.join('\n') + '\n'
}
