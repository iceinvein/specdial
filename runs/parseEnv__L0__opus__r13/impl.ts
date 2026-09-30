const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/

const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' }

/**
 * Parse the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored, as are lines that
 *   aren't `KEY=value` pairs.
 * - An optional leading `export ` is allowed.
 * - Unquoted values are trimmed and a ` #` starts an inline comment.
 * - Single-quoted values are taken literally.
 * - Double-quoted values support `\n`, `\r`, `\t`, `\"` and `\\` escapes.
 * - Quoted values may span multiple lines.
 * - Later keys override earlier ones.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)

  for (let i = 0; i < lines.length; i++) {
    const match = LINE.exec(lines[i])
    if (!match) continue
    const key = match[1]
    let raw = match[2]
    const quote = raw[0]

    if (quote === '"' || quote === "'") {
      // Accumulate lines until we find the closing quote.
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
      result[key] = quote === '"' ? inner.replace(/\\([nrt"\\])/g, (_, c) => ESCAPES[c]) : inner
    } else {
      result[key] = raw.replace(/(^|\s)#.*$/, '').trim()
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
