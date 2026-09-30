const MAX_FILENAME_BYTES = 255
const FALLBACK_NAME = 'download'
const RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]|conin\$|conout\$)$/i
const UNSAFE_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g

function trimName(name: string): string {
  return name.replace(/^[\s.]+|[\s.]+$/g, '')
}

function truncateUtf8(value: string, maxBytes: number): string {
  const encoder = new TextEncoder()
  let bytes = 0
  let result = ''

  for (const character of value) {
    bytes += encoder.encode(character).length
    if (bytes > maxBytes) break
    result += character
  }

  return result
}

/** Builds a portable filename, preserving readable text and a sanitized extension. */
export function safeFilename(raw: string, extension: string): string {
  // Allow compound extensions, but reserve enough space for the fallback name.
  const safeExtension = extension.trim()
    .replace(/[^a-zA-Z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .toLowerCase()
    .slice(0, MAX_FILENAME_BYTES - FALLBACK_NAME.length - 1)
    .replace(/\.$/, '')
  const suffix = safeExtension ? `.${safeExtension}` : ''
  let name = raw.normalize('NFC').replace(UNSAFE_CHARACTERS, '_')
    .trim().replace(/[\s.]+$/, '')

  if (suffix && name.toLowerCase().endsWith(suffix)) {
    name = name.slice(0, -suffix.length)
  }

  const maxNameBytes = MAX_FILENAME_BYTES - suffix.length
  name = trimName(truncateUtf8(trimName(name), maxNameBytes)) || FALLBACK_NAME

  // Windows treats device names as reserved even when followed by an extension.
  const stem = name.split('.')[0].replace(/\s+$/, '')
  if (RESERVED_NAME.test(stem)) {
    name = trimName(truncateUtf8(`_${name}`, maxNameBytes))
  }

  return name + suffix
}
