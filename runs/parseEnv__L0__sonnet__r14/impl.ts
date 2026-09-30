export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([^=\s]+)\s*=\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    let value = match[2]
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.indexOf(quote, 1) !== -1) {
      const end = value.indexOf(quote, 1)
      value = value.slice(1, end)
      if (quote === '"') value = value.replace(/\\n/g, '\n')
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }
    result[key] = value
  }
  return result
}
