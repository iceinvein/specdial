export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    if (line.startsWith('export ')) {
      const rest = line.slice('export '.length)
      // Keep "export =value" as a line whose key is "export".
      const eq = rest.indexOf('=')
      if (eq === -1 || rest.slice(0, eq).trim() !== '') line = rest
    }
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.length >= 2) {
      const first = value[0]
      if ((first === '"' || first === "'") && value[value.length - 1] === first) {
        value = value.slice(1, -1)
      }
    }
    // defineProperty so a key like "__proto__" becomes an own property.
    Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true })
  }
  return result
}
