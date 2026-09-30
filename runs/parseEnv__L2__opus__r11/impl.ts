export function parseEnv(text: string): Record<string, string> {
  // A Map keeps "last occurrence wins" simple, and Object.fromEntries defines
  // own properties, so keys like "__proto__" don't touch the prototype.
  const entries = new Map<string, string>()

  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice('export '.length)

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }

    entries.set(key, value)
  }

  return Object.fromEntries(entries)
}
