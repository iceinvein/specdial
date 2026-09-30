export type ExportRow = Record<string, string | number>

function escapeCell(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  // Union of keys in first-seen order, so rows with differing keys still line up.
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }

  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','))
  }
  return lines.join('\r\n')
}
