const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/

/**
 * Parses the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored.
 * - An optional leading `export ` is stripped.
 * - Keys and unquoted values are trimmed; unquoted values end at ` #` (inline comment).
 * - Single-quoted values are taken literally.
 * - Double-quoted values support `\n`, `\r`, `\t`, `\"` and `\\` escapes.
 * - Lines without `=` or with an invalid key are skipped. Later keys override earlier ones.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawLine of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim().replace(/^export\s+/, '')
    if (!KEY_RE.test(key)) continue

    result[key] = parseValue(line.slice(eq + 1).trim())
  }

  return result
}

function parseValue(raw: string): string {
  const quote = raw[0]

  if (quote === "'" || quote === '"') {
    const end = findClosingQuote(raw, quote)
    if (end !== -1) {
      const inner = raw.slice(1, end)
      return quote === '"' ? unescapeDouble(inner) : inner
    }
    // Unterminated quote: fall through and treat as an unquoted value.
  }

  const comment = raw.search(/\s#/)
  return (comment === -1 ? raw : raw.slice(0, comment)).trim()
}

function findClosingQuote(raw: string, quote: string): number {
  for (let i = 1; i < raw.length; i++) {
    if (quote === '"' && raw[i] === '\\') {
      i++
      continue
    }
    if (raw[i] === quote) return i
  }
  return -1
}

function unescapeDouble(s: string): string {
  return s.replace(/\\(.)/g, (match, ch: string) => {
    switch (ch) {
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 't':
        return '\t'
      case '"':
      case '\\':
        return ch
      default:
        return match
    }
  })
}
