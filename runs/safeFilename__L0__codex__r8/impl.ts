export function safeFilename(raw: string, extension: string): string {
  // Apply the restrictions shared by Windows, macOS, and Linux. Also replace
  // bidirectional formatting controls, which can disguise a file's extension.
  const sanitize = (value: string): string =>
    value
      .normalize('NFC')
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '_')
      .trim()
      .replace(/^[. ]+|[. ]+$/g, '')

  const encoder = new TextEncoder()
  const truncate = (value: string, byteLimit: number): string => {
    let result = ''
    let bytes = 0
    for (const character of value) {
      const size = encoder.encode(character).length
      if (bytes + size > byteLimit) break
      result += character
      bytes += size
    }
    return result
  }

  let name = sanitize(raw) || 'download'
  // Leave room for at least one four-byte Unicode character in the name.
  const safeExtension = truncate(sanitize(extension), 250).replace(/[. ]+$/g, '')
  const suffix = safeExtension ? `.${safeExtension}` : ''
  const nameByteLimit = 255 - encoder.encode(suffix).length
  name = truncate(name, nameByteLimit).replace(/[. ]+$/g, '')
  // Check after truncation, which can itself produce a reserved device name.
  if (/^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/i.test(name)) {
    name = truncate(`_${name}`, nameByteLimit)
  }
  return `${name || '_'}${suffix}`
}
