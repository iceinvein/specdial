export function parseEnv(text: string): Record<string, string> {
  const entries: [string, string][] = []

  for (const line of text.split(/\r\n|\n|\r/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    if (!key) continue

    let value = trimmed.slice(separator + 1).trim()
    const quote = value[0]
    if (
      value.length >= 2 &&
      (quote === '"' || quote === "'") &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1)
    }

    entries.push([key, value])
  }

  return Object.fromEntries(entries)
}
