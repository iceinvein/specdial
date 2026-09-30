const invalidCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g
const reservedName = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i
const encoder = new TextEncoder()

function truncateUtf8(value: string, maxBytes: number): string {
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

/** Build a portable filename, using "download" when the name is empty. */
export function safeFilename(raw: string, extension: string): string {
  // Extensions may include a leading dot or multiple parts (e.g. tar.gz).
  // Leave room for the fallback name, separating dot, and reserved-name prefix.
  const cleanExtension = truncateUtf8(
    extension.trim().replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+|\.+$/g, ''),
    245,
  ).replace(/\.+$/g, '')
  const suffix = cleanExtension ? `.${cleanExtension}` : ''

  let name = raw.normalize('NFC').replace(invalidCharacters, '_').trim().replace(/[.\s]+$/g, '')
  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = name.slice(0, -suffix.length)
  }
  name = name.replace(/^\.+|[.\s]+$/g, '') || 'download'

  // Reserve one byte for the prefix needed by Windows device names. Check
  // after truncation too, since truncation can itself produce a device name.
  name = truncateUtf8(name, 255 - suffix.length - 1).replace(/[.\s]+$/g, '') || 'download'
  if (reservedName.test(name)) name = `_${name}`

  return name + suffix
}
