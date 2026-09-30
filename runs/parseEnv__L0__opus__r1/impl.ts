const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/

/**
 * Parse the contents of a `.env` file into a key/value object.
 *
 * Supported syntax (a pragmatic subset of dotenv):
 * - `KEY=value` pairs, one per line; LF and CRLF line endings
 * - blank lines and `#` comment lines are ignored
 * - optional `export ` prefix
 * - whitespace around keys and unquoted values is trimmed
 * - unquoted values end at ` #` (inline comment)
 * - single-quoted values are taken literally
 * - double-quoted values support `\n`, `\r`, `\t`, `\"` and `\\` escapes
 * - quoted values may span multiple lines
 * - the value is everything after the first `=`
 * - later duplicate keys override earlier ones
 *
 * Lines without `=` or with an invalid key are skipped.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue

    if (/^export\s/.test(line)) line = line.slice(6).trimStart()

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    if (!KEY_RE.test(key)) continue

    let raw = line.slice(eq + 1).trimStart()
    const quote = raw[0]

    if (quote === '"' || quote === "'") {
      // Find the closing quote, pulling in following lines if needed.
      let body = raw.slice(1)
      let end = findClosingQuote(body, quote)
      while (end === -1 && i + 1 < lines.length) {
        body += '\n' + lines[++i]
        end = findClosingQuote(body, quote)
      }
      if (end === -1) {
        // Unterminated quote: treat the rest literally.
        result[key] = raw.trim()
        continue
      }
      const inner = body.slice(0, end)
      result[key] = quote === '"' ? unescapeDouble(inner) : inner
      continue
    }

    const hash = raw.search(/\s#/)
    if (hash !== -1) raw = raw.slice(0, hash)
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
