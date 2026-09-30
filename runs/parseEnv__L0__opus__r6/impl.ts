const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*?)\s*$/

export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const match = LINE.exec(line)
    if (!match) continue

    const [, key, raw] = match
    result[key] = parseValue(raw)
  }

  return result
}

function parseValue(raw: string): string {
  const quote = raw[0]
  if (quote === '"' || quote === "'") {
    const end = findClosingQuote(raw, quote)
    if (end !== -1) {
      const inner = raw.slice(1, end)
      return quote === '"' ? unescapeDoubleQuoted(inner) : inner
    }
  }

  // Unquoted: strip an inline comment (" #...") and surrounding whitespace.
  const comment = raw.search(/\s#/)
  return (comment === -1 ? raw : raw.slice(0, comment)).trim()
}

function findClosingQuote(raw: string, quote: string): number {
  for (let i = 1; i < raw.length; i++) {
    if (quote === '"' && raw[i] === '\\') i++
    else if (raw[i] === quote) return i
  }
  return -1
}

function unescapeDoubleQuoted(value: string): string {
  return value.replace(/\\([nrt"\\])/g, (_, ch: string) => {
    switch (ch) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      default: return ch
    }
  })
}
