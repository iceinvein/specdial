export type ExportRow = Record<string, string | number>

function escapeCell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const lines = [columns, ...rows.map((row) => columns.map((col) => row[col]))]
  return lines.map((line) => line.map(escapeCell).join(',') + '\n').join('')
}
