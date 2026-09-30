const LINE =
  /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*=([ \t]*(?:"(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`)|[^\n]*?)(?:[ \t]+#[^\n]*)?[ \t]*$/gm

/**
 * Parse the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored.
 * - An optional leading `export ` is allowed.
 * - Unquoted values are trimmed; ` #` starts an inline comment.
 * - Values may be wrapped in single, double or backtick quotes, and quoted
 *   values may span multiple lines. Inside double quotes, `\n`, `\r`, `\t`,
 *   `\"` and `\\` are unescaped; single- and backtick-quoted values are literal.
 * - Lines that aren't `KEY=value` are skipped. Later keys override earlier ones.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const src = text.replace(/\r\n?/g, '\n')

  for (const match of src.matchAll(LINE)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if (value.length >= 2 && (quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\(.)/gs, (_, c: string) =>
          c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
        )
      }
    }

    result[key] = value
  }

  return result
}
