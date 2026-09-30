const encoder = new TextEncoder()

function truncateUtf8(value: string, maxBytes: number): string {
  let result = ''
  let bytes = 0

  for (const character of value) {
    bytes += encoder.encode(character).length
    if (bytes > maxBytes) break
    result += character
  }

  return result
}

/** Builds a single, cross-platform filename of at most 255 UTF-8 bytes. */
export function safeFilename(raw: string, extension: string): string {
  // Accept a leading dot and compound extensions, but no path syntax.
  const cleanExtension = extension
    .replace(/[^a-zA-Z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 64)
    .replace(/\.+$/g, '')
  const suffix = cleanExtension ? `.${cleanExtension}` : ''

  let name = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '_')
    .replace(/^[\s.]+|[\s.]+$/g, '')

  if (!name) name = 'download'
  // Windows reserves these names even when followed by an extension.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:[ .]|$)/i.test(name)) {
    name = `_${name}`
  }

  name = truncateUtf8(name, 255 - suffix.length).replace(/[\s.]+$/g, '')
  return `${name || 'download'}${suffix}`
}
