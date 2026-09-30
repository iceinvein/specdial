/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * Supported syntax (a pragmatic subset of dotenv):
 * - `KEY=value` lines; whitespace around the key and unquoted values is trimmed
 * - blank lines and `#` comment lines are ignored, as are lines without `=`
 * - an optional leading `export ` is stripped
 * - unquoted values end at an inline comment (` #...`, i.e. `#` after whitespace)
 * - single-quoted values are literal
 * - double-quoted values expand `\n`, `\r`, `\t`, `\"` and `\\`
 * - quoted values may span multiple lines
 * - later duplicate keys override earlier ones
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

    if (quote === '"' || quote === "'" || quote === '`') {
      // Consume following lines until the closing quote is found.
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
      // No closing quote anywhere: fall through and treat as an unquoted value.
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
  return s.replace(/\\(.)/g, (match, ch: string) => {
    switch (ch) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      case '"': return '"'
      case '\\': return '\\'
      default: return match
    }
  })
}
