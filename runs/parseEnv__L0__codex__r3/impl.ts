export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const assignments = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\n]*)[ \t]*(?:#[^\n]*)?$/gm

  for (const match of normalized.matchAll(assignments)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === "'" || quote === '"' || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property even for keys such as "__proto__".
    Object.defineProperty(values, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return values
}
