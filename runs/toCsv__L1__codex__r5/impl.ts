export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const headers = Object.keys(rows[0])
  const escapeField = (value: string | number): string => {
    const text = String(value)
    return /[",\r\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text
  }

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(headers.map(header => escapeField(row[header] ?? '')).join(','))
  }

  return lines.join('\n') + '\n'
}
