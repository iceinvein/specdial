const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)?$/

/**
 * Parse the contents of a `.env` file into a key/value object.
 *
 * Supports blank lines, `#` comments, an optional `export ` prefix,
 * unquoted values (trimmed, with trailing ` #` comments stripped),
 * single-quoted values (literal), and double-quoted values (with `\n`,
 * `\r`, `\t`, `\"` and `\\` escapes, and may span multiple lines).
 * Later keys override earlier ones. Lines that don't match are ignored.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const match = LINE.exec(lines[i])
    if (!match) continue
    const key = match[1]
    let raw = match[2] ?? ''

    const quote = raw[0]
    if (quote === '"' || quote === "'" || quote === '`') {
      // Accumulate following lines until the closing quote is found.
      let end = findClosingQuote(raw, quote)
      while (end === -1 && i + 1 < lines.length) {
        raw += '\n' + lines[++i]
        end = findClosingQuote(raw, quote)
      }
      if (end === -1) {
        // Unterminated quote: treat the rest as the value.
        end = raw.length
      }
      const inner = raw.slice(1, end)
      result[key] = quote === '"' ? unescapeDouble(inner) : inner
    } else {
      const comment = raw.search(/\s#/)
      if (comment !== -1) raw = raw.slice(0, comment)
      result[key] = raw.trim()
    }
  }

  return result
}

function findClosingQuote(s: string, quote: string): number {
  for (let j = 1; j < s.length; j++) {
    if (quote === '"' && s[j] === '\\') {
      j++
      continue
    }
    if (s[j] === quote) return j
  }
  return -1
}

function unescapeDouble(s: string): string {
  return s.replace(/\\([\s\S])/g, (_, c: string) => {
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
