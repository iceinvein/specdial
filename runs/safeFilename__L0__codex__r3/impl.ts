const unsafeCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g
const reservedName = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i
const encoder = new TextEncoder()

function clean(value: string): string {
  return value.normalize('NFC').replace(unsafeCharacters, '_').trim().replace(/^\.+|[. ]+$/g, '')
}

// Count bytes without cutting a Unicode code point in half.
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

/** Build a single, cross-platform filename with an optional extension. */
export function safeFilename(raw: string, extension: string): string {
  const ext = truncate(clean(extension), 253).replace(/[. ]+$/g, '')
  const suffix = ext ? `.${ext}` : ''
  let name = clean(raw)

  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = clean(name.slice(0, -suffix.length))
  }

  const availableBytes = 255 - encoder.encode(suffix).length
  name = truncate(name || 'download', availableBytes).replace(/[. ]+$/g, '') || '_'

  // Windows also reserves device names when followed by an extension.
  if (reservedName.test(name.replace(/ +\./g, '.'))) {
    name = truncate(`_${name}`, availableBytes).replace(/[. ]+$/g, '')
  }

  return name + suffix
}
