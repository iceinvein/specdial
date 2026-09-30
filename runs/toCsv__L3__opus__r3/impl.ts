export type ExportRow = Record<string, string | number>

function field(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  if (!/[,"\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(header.map((key) => field(Object.hasOwn(row, key) ? row[key] : undefined)).join(','))
  }
  return lines.join('\n') + '\n'
}
