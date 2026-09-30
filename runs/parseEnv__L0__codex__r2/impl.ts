export function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  // Quoted values may contain comments or span multiple lines.
  const assignment = /^[\t ]*(?:export[\t ]+)?([\w.-]+)[\t ]*=[\t ]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\n]*)[\t ]*(?:#.*)?$/gm

  for (const match of text.replace(/\r\n?/g, '\n').matchAll(assignment)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define own properties so names such as __proto__ remain ordinary keys.
    Object.defineProperty(values, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return values
}
