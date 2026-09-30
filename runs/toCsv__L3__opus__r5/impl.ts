export type ExportRow = Record<string, string | number>

function formatField(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      header
        .map((key) => (Object.prototype.hasOwnProperty.call(row, key) ? formatField(row[key]) : ''))
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
