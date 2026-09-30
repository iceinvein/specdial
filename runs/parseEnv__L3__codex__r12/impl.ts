export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}

  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7)

    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      value.length >= 2 &&
      (value[0] === '"' || value[0] === "'") &&
      value[0] === value[value.length - 1]
    ) {
      value = value.slice(1, -1)
    }

    // Define an own property so keys such as __proto__ are preserved as data.
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
