export type ExportRow = Record<string, string | number>

function formatField(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(keys.map((key) => formatField(Object.hasOwn(row, key) ? row[key] : undefined)).join(','))
  }
  return lines.join('\n') + '\n'
}
