export function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  // Quoted values may span lines; unquoted values end at a comment or newline.
  const assignment = /^[\t ]*(?:export[\t ]+)?([\w.-]+)[\t ]*=[\t ]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\n]*)[\t ]*(?:#.*)?$/gm

  for (const match of text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').matchAll(assignment)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === "'" || quote === '"' || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property so keys such as __proto__ behave like ordinary keys.
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return result
}
