export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  const assignments = /^[^\S\r\n]*(?:export[^\S\r\n]+)?([\w.-]+)[^\S\r\n]*=[^\S\r\n]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)[^\S\r\n]*(?:#.*)?$/gm
  const normalized = text.replace(/\r\n?/g, '\n')
  let match: RegExpExecArray | null

  while ((match = assignments.exec(normalized)) !== null) {
    const key = match[1]
    let value = match[2].trim()
    const quote = value[0]

    if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      }
    }

    // Define data properties so keys such as __proto__ behave like ordinary keys.
    Object.defineProperty(env, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }

  return env
}
