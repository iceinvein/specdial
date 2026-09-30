export type ExportRow = Record<string, string | number>

function escapeCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers, ...rows.map((row) => headers.map((key) => row[key] ?? ''))]
  return lines.map((line) => line.map(escapeCell).join(',')).join('\n') + '\n'
}
