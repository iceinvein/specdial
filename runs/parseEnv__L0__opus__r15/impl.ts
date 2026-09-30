const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/

/**
 * Parse the contents of a `.env` file into a key/value object.
 *
 * - Blank lines and lines starting with `#` are ignored.
 * - An optional leading `export ` is allowed.
 * - Values may be unquoted, 'single-quoted' (literal), or "double-quoted"
 *   (supports \n, \r, \t, \", \\ escapes).
 * - For unquoted values, ` #` starts an inline comment.
 * - Lines that don't look like `KEY=value` are skipped.
 * - If a key repeats, the last value wins.
 */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of text.split(/\r?\n|\r/)) {
    const match = LINE.exec(line)
    if (!match) continue
    const [, key, raw] = match
    // defineProperty so a key like `__proto__` is stored as data, not a prototype change.
    Object.defineProperty(result, key, { value: parseValue(raw), enumerable: true, writable: true, configurable: true })
  }

  return result
}

function parseValue(raw: string): string {
  const quote = raw[0]
  if (quote === '"' || quote === "'") {
    const end = findClosingQuote(raw, quote)
    if (end !== -1) {
      const inner = raw.slice(1, end)
      return quote === '"' ? unescapeDouble(inner) : inner
    }
    // Unterminated quote: fall through and treat as unquoted.
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
  return s.replace(/\\(.)/g, (_, c: string) => {
    switch (c) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      default: return c
    }
  })
}
