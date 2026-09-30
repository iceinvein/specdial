export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  // Match quoted values before unquoted ones so embedded comments and newlines
  // remain part of the value. Unquoted values end at a comment or line break.
  const assignment = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\n]*)[ \t]*(?:#.*)?$/gm

  for (const match of text.replace(/\r\n?/g, '\n').matchAll(assignment)) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define an own property even for keys such as "__proto__".
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
