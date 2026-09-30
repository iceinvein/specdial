const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/

/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored.
 * - An optional leading `export ` is allowed.
 * - Unquoted values are trimmed; ` #` starts an inline comment.
 * - Single-quoted values are taken literally.
 * - Double-quoted values support `\n`, `\r`, `\t`, `\"` and `\\` escapes
 *   and may span multiple lines.
 * - Later keys override earlier ones. Lines that don't parse are skipped.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.replace(/^﻿/, '').split(/\r?\n|\r/)

  for (let i = 0; i < lines.length; i++) {
    const match = LINE.exec(lines[i])
    if (!match) continue
    const key = match[1]
    let raw = match[2]
    const quote = raw[0]

    if (quote === '"' || quote === "'" || quote === '`') {
      // Find the closing quote, allowing values to span lines.
      let end = findClosingQuote(raw, quote)
      while (end === -1 && i + 1 < lines.length) {
        raw += '\n' + lines[++i]
        end = findClosingQuote(raw, quote)
      }
      if (end === -1) {
        // Unterminated quote: treat the rest of the line as the value.
        result[key] = match[2].trim()
        continue
      }
      const inner = raw.slice(1, end)
      result[key] = quote === '"' ? unescapeDouble(inner) : inner
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

function unescapeDouble(s: string): string {
  return s.replace(/\\(.)/g, (_, c: string) => {
    switch (c) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      default: return c
    }
  })
}
