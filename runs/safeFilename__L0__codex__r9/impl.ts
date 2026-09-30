const MAX_FILENAME_BYTES = 255
const unsafeCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g
const reservedName = /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/i

function truncateUtf8(value: string, maxBytes: number): string {
  const encoder = new TextEncoder()
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

/**
 * Builds a single filename suitable for Windows, macOS, and Linux.
 * Unsafe characters become underscores; empty names become "download".
 * Extensions may have a leading dot and contain dot-separated ASCII letters
 * and digits (for example, "pdf" or "tar.gz"). Invalid extensions throw.
 */
export function safeFilename(raw: string, extension: string): string {
  const normalizedExtension = extension.trim().replace(/^\./, '')
  if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*$/i.test(normalizedExtension)) {
    throw new TypeError('Extension must contain dot-separated letters and digits')
  }

  const suffix = `.${normalizedExtension}`
  const maxBaseBytes = MAX_FILENAME_BYTES - suffix.length
  if (maxBaseBytes < 1) {
    throw new RangeError('Extension is too long for a safe filename')
  }

  let base = raw.trim().replace(unsafeCharacters, '_').replace(/[. ]+$/, '')
  if (base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = base.slice(0, -suffix.length).replace(/[. ]+$/, '')
  }
  base = truncateUtf8(base || 'download', maxBaseBytes).replace(/[. ]+$/, '')
  base ||= truncateUtf8('download', maxBaseBytes)

  // Check after truncating: shortening a name can itself produce a device name.
  if (reservedName.test(base)) {
    base = `_${truncateUtf8(base, maxBaseBytes - 1)}`.replace(/[. ]+$/, '')
  }

  return `${base}${suffix}`
}
