export function parseEnv(text: string): Record<string, string> {
  const entries = new Map<string, string>()
  const assignments = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|`[^`]*`|[^\n]*)/gm

  // Normalize line endings, including those inside multiline quoted values.
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  for (const match of normalized.matchAll(assignments)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if (
      value.length >= 2 &&
      (quote === '"' || quote === "'" || quote === '`') &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    } else {
      value = value.split('#', 1)[0].trim()
    }

    entries.set(key, value)
  }

  // Object.fromEntries creates own properties even for keys such as __proto__.
  return Object.fromEntries(entries)
}
