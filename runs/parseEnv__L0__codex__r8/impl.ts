export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  // Quoted values may contain comments, equals signs, and newlines.
  const assignment = /^[\t ]*(?:export[\t ]+)?([\w.-]+)[\t ]*=[\t ]*('(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|[^\n]*)/gm
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  for (const match of normalized.matchAll(assignment)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    } else {
      value = value.split('#', 1)[0].trim()
    }

    // Define an own property so names such as __proto__ are ordinary keys.
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
