export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim()
    if (line === '' || line[0] === '#') continue

    if (line.startsWith('export ')) line = line.slice('export '.length)

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

    Object.defineProperty(result, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }

  return result
}
