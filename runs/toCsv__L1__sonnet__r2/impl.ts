export type ExportRow = Record<string, string | number>

function escapeField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const lines = [columns, ...rows.map((row) => columns.map((col) => row[col] ?? ''))]
  return lines.map((line) => line.map(escapeField).join(',') + '\n').join('')
}
