/** Parse dotenv assignments, with later assignments taking precedence. */
export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  // Quoted values may span lines; unquoted values end at the next newline.
  const assignments = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^\n]*)/gm

  for (const match of normalized.matchAll(assignments)) {
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
