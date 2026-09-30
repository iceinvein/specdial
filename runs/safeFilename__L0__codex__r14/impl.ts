export function safeFilename(raw: string, extension: string): string {
  // Keep extensions ASCII and leave enough room for the fallback name.
  const safeExtension = extension
    .trim()
    .replace(/^\.+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 246)
    .replace(/\.+$/, '')
  const suffix = safeExtension ? `.${safeExtension}` : ''

  let name = raw
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')

  if (suffix && name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name = name.slice(0, -suffix.length).replace(/[.\s]+$/g, '')
  }
  name ||= 'download'

  // Windows reserves these names even when followed by an extension.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:[.\s]|$)/i.test(name)) {
    name = `_${name}`
  }

  // Most filesystems limit a filename to 255 bytes. Iterate by code point so
  // truncation preserves Unicode characters rather than splitting surrogates.
  const encoder = new TextEncoder()
  const budget = 255 - suffix.length
  let truncated = ''
  let bytes = 0
  for (const character of name) {
    const size = encoder.encode(character).length
    if (bytes + size > budget) break
    truncated += character
    bytes += size
  }

  return (truncated.replace(/[.\s]+$/g, '') || 'download') + suffix
}
