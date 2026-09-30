const unsafeCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g
const reservedName = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:[. ]|$)/i
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

/** Builds a portable filename, with a 255-byte UTF-8 limit and a "download" fallback. */
export function safeFilename(raw: string, extension: string): string {
  // Accept a leading dot and compound extensions, while removing path syntax.
  const cleanExtension = truncateUtf8(
    extension.trim().replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[._-]+|[._-]+$/g, ''),
    253,
  ).replace(/[._-]+$/g, '')
  const suffix = cleanExtension ? `.${cleanExtension}` : ''
  const budget = 255 - encoder.encode(suffix).length

  let name = raw.trim().replace(unsafeCharacters, '_').replace(/^[. ]+|[. ]+$/g, '')
  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = name.slice(0, -suffix.length)
  }

  name = truncateUtf8(name, budget).replace(/[. ]+$/g, '')
  if (!name) name = truncateUtf8('download', budget)
  // Windows device names remain reserved even when followed by an extension.
  if (reservedName.test(name)) name = truncateUtf8(`_${name}`, budget)

  return name + suffix
}
