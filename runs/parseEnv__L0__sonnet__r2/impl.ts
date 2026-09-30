export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim()
    if (!key) continue
    let value = line.slice(eq + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.length > 1 && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"')
      }
    } else {
      value = value.replace(/\s+#.*$/, '')
    }
    result[key] = value
  }
  return result
}
