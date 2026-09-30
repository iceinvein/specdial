const MAX_FILENAME_BYTES = 255
const FALLBACK_NAME = 'download'
const encoder = new TextEncoder()

function sanitize(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g, '_')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '')
}

function truncate(value: string, maxBytes: number): string {
  let result = ''
  let bytes = 0

  for (const character of value) {
    const size = encoder.encode(character).length
    if (bytes + size > maxBytes) break
    result += character
    bytes += size
  }

  return result
}

/** Builds a portable download filename, preserving Unicode and compound extensions. */
export function safeFilename(raw: string, extension: string): string {
  // Reserve enough room for the fallback, even if the extension is very long.
  const safeExtension = sanitize(
    truncate(sanitize(extension), MAX_FILENAME_BYTES - FALLBACK_NAME.length - 1),
  )
  const suffix = safeExtension ? `.${safeExtension}` : ''
  let name = sanitize(raw)

  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = name.slice(0, -suffix.length)
  }

  const nameBudget = MAX_FILENAME_BYTES - encoder.encode(suffix).length
  name = sanitize(truncate(name, nameBudget)) || FALLBACK_NAME

  // Windows reserves these names even when followed by another extension.
  if (/^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)) {
    name = sanitize(truncate(`_${name}`, nameBudget))
  }

  return `${name}${suffix}`
}
