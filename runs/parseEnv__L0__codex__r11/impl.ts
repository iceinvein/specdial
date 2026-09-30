export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const assignments = /^[\t ]*(?:export[\t ]+)?([\w.-]+)[\t ]*=[\t ]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)/gm

  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  for (const match of normalized.matchAll(assignments)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property even for keys such as __proto__.
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return result
}
