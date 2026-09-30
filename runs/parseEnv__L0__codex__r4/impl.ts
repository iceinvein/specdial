export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  const assignments = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)[ \t]*(?:#.*)?$/gm

  // Remove a file BOM and normalize line endings, including in quoted values.
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  for (const match of normalized.matchAll(assignments)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.length >= 2 && value.at(-1) === quote) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Treat names such as __proto__ as ordinary keys as well.
    Object.defineProperty(values, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return values
}
