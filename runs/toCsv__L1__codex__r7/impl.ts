export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const escapeField = (value: string | number): string => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const columns = Object.keys(rows[0])
  const lines = [
    columns.map(escapeField).join(','),
    ...rows.map(row => columns.map(column => escapeField(row[column] ?? '')).join(',')),
  ]

  return lines.join('\n') + '\n'
}
