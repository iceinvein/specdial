/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * Supported syntax (a pragmatic subset of dotenv):
 * - `KEY=value` pairs, one per line; whitespace around key and value is trimmed
 * - blank lines and lines starting with `#` are ignored
 * - optional `export ` prefix (`export KEY=value`)
 * - unquoted values end at an inline ` #` comment
 * - single-quoted values are taken literally
 * - double-quoted values expand `\n`, `\r`, `\t`, `\"` and `\\`
 * - quoted values may span multiple lines
 * - LF and CRLF line endings
 *
 * Lines that are not valid assignments are skipped. If a key appears more
 * than once, the last occurrence wins.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue

    const key = match[1]
    let rest = match[2]
    const quote = rest[0]

    if (quote === '"' || quote === "'") {
      // Collect lines until the closing quote, which may be on a later line.
      let body = rest.slice(1)
      let end = findClosingQuote(body, quote)
      let j = i
      while (end === -1 && j + 1 < lines.length) {
        j++
        body += '\n' + lines[j]
        end = findClosingQuote(body, quote)
      }
      if (end === -1) {
        // Unterminated quote: treat the opening line as a plain value.
        result[key] = stripInlineComment(rest)
        continue
      }
      i = j
      const raw = body.slice(0, end)
      result[key] = quote === '"' ? unescapeDoubleQuoted(raw) : raw
    } else {
      result[key] = stripInlineComment(rest)
    }
  }

  return result
}

function findClosingQuote(s: string, quote: string): number {
  for (let i = 0; i < s.length; i++) {
    if (quote === '"' && s[i] === '\\') {
      i++
      continue
    }
    if (s[i] === quote) return i
  }
  return -1
}

function unescapeDoubleQuoted(s: string): string {
  return s.replace(/\\([nrt"\\])/g, (_, c: string) => {
    switch (c) {
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 't':
        return '\t'
      default:
        return c
    }
  })
}

function stripInlineComment(value: string): string {
  const idx = value.search(/\s#/)
  return (idx === -1 ? value : value.slice(0, idx)).trim()
}
