const MAX_FILENAME_BYTES = 255
const encoder = new TextEncoder()
const reservedName = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]|conin\$|conout\$)$/i

function truncateBytes(value: string, limit: number): string {
  let result = ''
  let bytes = 0

  for (const character of value) {
    const size = encoder.encode(character).length
    if (bytes + size > limit) break
    result += character
    bytes += size
  }

  return result
}

/**
 * Build a cross-platform filename, replacing unsafe name characters with `_`.
 * Empty names use `download`; extensions allow letters, digits, dots, `_`, and `-`.
 * The extension is appended and the result fits within 255 UTF-8 bytes.
 */
export function safeFilename(raw: string, extension: string): string {
  const safeExtension = truncateBytes(
    extension.trim().replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+|\.+$/g, ''),
    MAX_FILENAME_BYTES - 2,
  ).replace(/\.+$/g, '')
  const suffix = safeExtension ? `.${safeExtension}` : ''
  const nameBudget = MAX_FILENAME_BYTES - suffix.length

  let name = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g, '_')
  name = truncateBytes(name, nameBudget).replace(/[. ]+$/g, '')
  if (!name) name = truncateBytes('download', nameBudget)

  // Windows treats device names as reserved even when followed by an extension.
  if (reservedName.test(name.split('.')[0].trimEnd())) {
    name = truncateBytes(`_${name}`, nameBudget).replace(/[. ]+$/g, '')
  }

  return `${name}${suffix}`
}
