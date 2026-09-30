export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  // Quoted values can span lines and contain hashes; unquoted hashes start comments.
  const assignment = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*(?:=[ \t]*|:[ \t]+)('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)[ \t]*(?:#.*)?$/gm

  for (const match of normalized.matchAll(assignment)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property so special names such as __proto__ remain ordinary keys.
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
