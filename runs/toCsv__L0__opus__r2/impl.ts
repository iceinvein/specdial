export type ExportRow = Record<string, string | number>

// Characters that make spreadsheet apps (Excel, Sheets) treat a cell as a formula.
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/

function escapeCell(value: string | number | undefined): string {
  if (value === undefined) return ''
  let text = String(value)
  // Neutralise CSV/formula injection in user-supplied text. Numbers are left
  // alone so negative values like -5 still export as numbers.
  if (typeof value === 'string' && FORMULA_TRIGGERS.test(text)) {
    text = `'${text}`
  }
  // RFC 4180: quote fields containing delimiters, quotes, or line breaks,
  // doubling any embedded quotes.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Serialise rows to RFC 4180 CSV. Columns are the union of all row keys in
 * first-seen order; rows missing a key get an empty cell. Returns an empty
 * string when there are no rows.
 */
export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return ''

  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }

  const lines = [
    columns.map(escapeCell).join(','),
    ...rows.map((row) => columns.map((col) => escapeCell(row[col])).join(',')),
  ]
  return lines.join('\r\n')
}
