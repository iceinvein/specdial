const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/

const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' }

// Parses .env file contents. Supports blank lines, `#` comments, an optional
// `export` prefix, single/double/backtick-quoted values (double quotes expand
// \n, \r, \t, \" and \\; quoted values may span lines), and trailing `#`
// comments after unquoted values. Later duplicate keys override earlier ones.
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/)

  for (let i = 0; i < lines.length; i++) {
    const match = LINE.exec(lines[i])
    if (!match) continue
    const key = match[1]
    let raw = match[2]
    const quote = raw[0]

    if (quote === '"' || quote === "'" || quote === '`') {
      // Keep consuming lines until we find the closing quote.
      const start = i
      let end = findClosingQuote(raw, quote)
      while (end === -1 && i + 1 < lines.length) {
        raw += '\n' + lines[++i]
        end = findClosingQuote(raw, quote)
      }
      if (end === -1) {
        // Unterminated quote: treat the rest of the line as the literal value.
        i = start
        result[key] = match[2]
        continue
      }
      const inner = raw.slice(1, end)
      result[key] = quote === '"' ? inner.replace(/\\(.)/g, (m, c) => ESCAPES[c] ?? m) : inner
    } else {
      result[key] = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '')
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
