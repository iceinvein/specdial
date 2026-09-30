const encoder = new TextEncoder()
const maxFilenameBytes = 255
const fallbackName = 'download'

function cleanPart(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/gu, '')
}

function truncateBytes(value: string, limit: number): string {
  let result = ''
  let bytes = 0
  for (const character of value) {
    bytes += encoder.encode(character).length
    if (bytes > limit) break
    result += character
  }
  return result
}

/**
 * Builds a portable filename, preserving readable text and replacing unsafe
 * characters with underscores. An empty name becomes "download"; an empty
 * extension is omitted. The result fits within 255 UTF-8 bytes.
 */
export function safeFilename(raw: string, extension: string): string {
  // Reserve enough room for the fallback even when the extension is very long.
  const safeExtension = cleanPart(truncateBytes(
    cleanPart(extension).replace(/\s/gu, '_'),
    maxFilenameBytes - fallbackName.length - 1,
  ))
  const suffix = safeExtension ? `.${safeExtension}` : ''
  const nameLimit = maxFilenameBytes - encoder.encode(suffix).length
  let name = cleanPart(truncateBytes(cleanPart(raw), nameLimit)) || fallbackName

  // Windows reserves these names even when they have a file extension.
  const stem = name.split('.')[0].trimEnd()
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]|conin\$|conout\$)$/iu.test(stem)) {
    name = `_${cleanPart(truncateBytes(name, nameLimit - 1))}`
  }

  return `${name}${suffix}`
}
