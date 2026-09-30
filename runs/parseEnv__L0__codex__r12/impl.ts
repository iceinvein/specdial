export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  const assignments = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*?('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm

  // Normalize line endings before parsing, including inside quoted values.
  const normalized = text.replace(/\r\n?/g, '\n')
  for (const match of normalized.matchAll(assignments)) {
    const key = match[1]
    let value = (match[2] ?? '').trim()
    const quote = value[0]

    if (quote === "'" || quote === '"' || quote === '`') {
      if (value[value.length - 1] === quote && value.length > 1) {
        value = value.slice(1, -1)
      }
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property so special names cannot alter the object's prototype.
    Object.defineProperty(env, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }

  return env
}
