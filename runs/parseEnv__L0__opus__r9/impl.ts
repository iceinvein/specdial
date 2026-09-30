const LINE =
  /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('[^']*'|"(?:\\.|[^"\\])*"|`[^`]*`|[^#\r\n]*?)?[ \t]*(?:#.*)?$/gm

// Parses the contents of a .env file into a key/value object.
// Supports comments, blank lines, `export` prefixes, single/double/backtick
// quoted values (including multi-line), and inline comments after values.
// Later duplicate keys override earlier ones.
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const src = text.replace(/\r\n?/g, '\n')

  for (const match of src.matchAll(LINE)) {
    const key = match[1]
    let value = match[2] ?? ''
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\([nrt"\\])/g, (_, c: string) =>
          c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
        )
      }
    } else {
      value = value.trim()
    }

    Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true })
  }

  return result
}
