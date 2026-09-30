export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  // Quoted values can contain comments and span multiple lines.
  const assignment = /^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm
  const normalized = text.replace(/\r\n?/g, '\n')

  for (const match of normalized.matchAll(assignment)) {
    const key = match[1]
    let value = (match[2] ?? '').trim()
    const quote = value[0]

    if (
      (quote === '"' || quote === "'" || quote === '`') &&
      value[value.length - 1] === quote
    ) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property even for names such as "__proto__".
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
