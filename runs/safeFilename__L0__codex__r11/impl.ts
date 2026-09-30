const MAX_FILENAME_BYTES = 255
const FALLBACK_NAME = 'download'
const encoder = new TextEncoder()

function sanitize(value: string): string {
  return value
    .trim()
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '_')
    .trim()
    .replace(/[. ]+$/g, '')
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

function isReserved(name: string): boolean {
  const firstPart = name.split('.')[0].replace(/ +$/g, '')
  return /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])$/i.test(firstPart)
}

/**
 * Build a single, cross-platform filename. Invalid characters become underscores,
 * empty names become "download", and an existing matching extension is reused.
 * Extensions may include a leading dot or multiple parts (such as "tar.gz").
 * The result fits within 255 UTF-8 bytes, with room reserved for the extension.
 */
export function safeFilename(raw: string, extension: string): string {
  const safeExtension = sanitize(
    truncate(
      sanitize(extension).replace(/^[. ]+/g, ''),
      MAX_FILENAME_BYTES - FALLBACK_NAME.length - 1,
    ),
  )
  const suffix = safeExtension ? `.${safeExtension}` : ''
  let name = sanitize(raw)

  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = sanitize(name.slice(0, -suffix.length))
  }

  const nameBudget = MAX_FILENAME_BYTES - encoder.encode(suffix).length
  name = sanitize(truncate(name, nameBudget)) || FALLBACK_NAME
  if (isReserved(name)) {
    name = `_${sanitize(truncate(name, nameBudget - 1))}`
  }

  return `${name}${suffix}`
}
