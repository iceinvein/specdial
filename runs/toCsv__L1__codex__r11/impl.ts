export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const escape = (value: string | number): string => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(header => escape(row[header] ?? '')).join(',')),
  ]

  return lines.join('\n') + '\n'
}
