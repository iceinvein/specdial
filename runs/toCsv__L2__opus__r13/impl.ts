export type ExportRow = Record<string, string | number>

function formatField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  if (!/[",\r\n]/.test(text)) return text
  return '"' + text.replace(/"/g, '""') + '"'
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((key) => formatField(Object.hasOwn(row, key) ? row[key] : undefined)).join(','))
  }
  return lines.join('\n') + '\n'
}
