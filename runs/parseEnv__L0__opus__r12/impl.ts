/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * Supported syntax:
 * - `KEY=value` pairs, one per line (LF or CRLF line endings)
 * - blank lines and `#` comment lines are ignored
 * - optional `export ` prefix before the key
 * - whitespace around keys and unquoted values is trimmed
 * - unquoted values may end with an inline comment (` # ...`)
 * - single-quoted values are taken literally
 * - double-quoted values support `\n`, `\r`, `\t`, `\"` and `\\` escapes
 * - quoted values may span multiple lines
 * - later duplicate keys override earlier ones
 *
 * Lines without `=` or with an invalid key are skipped.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim().replace(/^export\s+/, '')
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) continue

    let raw = line.slice(eq + 1).trimStart()
    const quote = raw[0]

    if (quote === '"' || quote === "'") {
      // Accumulate lines until the closing quote is found.
      let body = raw.slice(1)
      let end = findClosingQuote(body, quote)
      let j = i
      while (end === -1 && j + 1 < lines.length) {
        j++
        body += '\n' + lines[j]
        end = findClosingQuote(body, quote)
      }
      if (end !== -1) {
        i = j
        const value = body.slice(0, end)
        result[key] = quote === '"' ? unescapeDouble(value) : value
        continue
      }
      // No closing quote: fall through and treat the value as unquoted.
    }

    const comment = raw.search(/\s#/)
    if (comment !== -1) raw = raw.slice(0, comment)
    result[key] = raw.trim()
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

function unescapeDouble(s: string): string {
  return s.replace(/\\([nrt"\\])/g, (_, c: string) => {
    switch (c) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      default: return c
    }
  })
}
