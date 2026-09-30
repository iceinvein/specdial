const encoder = new TextEncoder()
const reservedName = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?: *\.| *$)/i

function clean(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ud800-\udfff]/gu, '_')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '')
}

function truncate(value: string, maxBytes: number): string {
  let result = ''
  let bytes = 0
  for (const character of value) {
    bytes += encoder.encode(character).length
    if (bytes > maxBytes) break
    result += character
  }
  return result.replace(/[. ]+$/g, '')
}

/** Builds a single filename, limited to 255 UTF-8 bytes, for a download. */
export function safeFilename(raw: string, extension: string): string {
  // Leave room for the fallback name and the separating dot, even for a long extension.
  const safeExtension = truncate(clean(extension), 255 - 'download'.length - 1)
  const suffix = safeExtension ? `.${safeExtension}` : ''
  const maxNameBytes = 255 - encoder.encode(suffix).length
  let name = truncate(clean(raw), maxNameBytes) || 'download'

  // Windows treats these names as devices, including when followed by an extension.
  if (reservedName.test(name)) {
    name = `_${truncate(name, maxNameBytes - 1)}`
  }

  return name + suffix
}
