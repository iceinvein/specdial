export type ExportRow = Record<string, string | number>

function field(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(header.map((key) => (Object.hasOwn(row, key) ? field(row[key]) : '')).join(','))
  }
  return lines.join('\n') + '\n'
}
