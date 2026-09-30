export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]
  if (columns.length === 0) return ''

  const escapeField = (value: string | number): string => {
    const field = String(value)
    return /[",\r\n]/.test(field)
      ? `"${field.replace(/"/g, '""')}"`
      : field
  }

  return [
    columns.map(escapeField).join(','),
    ...rows.map(row => columns.map(column =>
      escapeField(Object.prototype.hasOwnProperty.call(row, column) ? row[column] : '')
    ).join(',')),
  ].join('\n')
}
