export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2]

    const quote = value[0]
    if (quote === '"' || quote === "'") {
      const end = value.indexOf(quote, 1)
      if (end !== -1) {
        value = value.slice(1, end)
        if (quote === '"') {
          value = value.replace(/\\(n|r|t|"|\\)/g, (_, c) =>
            c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c
          )
        }
        result[key] = value
        continue
      }
    }

    // Unquoted: strip inline comment (preceded by whitespace)
    value = value.replace(/\s+#.*$/, '').trim()
    result[key] = value
  }

  return result
}
