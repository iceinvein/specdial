// Characters that are invalid in filenames on Windows, macOS, or Linux, plus
// ASCII control characters and Unicode bidi controls (which can disguise the
// real extension, e.g. "invoice\u202Efdp.exe").
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g

// Device names reserved by Windows, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

// Most filesystems cap a filename at 255 bytes.
const MAX_BYTES = 255

const MAX_EXT_BYTES = 32

const FALLBACK_NAME = 'download'

function clean(text: string): string {
  return text
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    // Leading dots would create hidden files; trailing dots and spaces are
    // silently stripped by Windows.
    .replace(/^[\s.]+|[\s.]+$/g, '')
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length
}

// Truncates to at most maxBytes of UTF-8 without splitting a code point.
function truncateBytes(text: string, maxBytes: number): string {
  let result = ''
  let bytes = 0
  for (const char of text) {
    const size = utf8Length(char)
    if (bytes + size > maxBytes) break
    result += char
    bytes += size
  }
  return result
}

/**
 * Builds a filename that is safe to use for a download on any major OS from
 * user-entered text and a file extension (with or without a leading dot).
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = truncateBytes(clean(extension).replace(/\s/g, ''), MAX_EXT_BYTES)
  const suffix = ext ? `.${ext}` : ''

  let base = clean(raw)
  if (WINDOWS_RESERVED.test(base.split('.')[0])) base = `_${base}`

  base = clean(truncateBytes(base, MAX_BYTES - utf8Length(suffix)))
  if (!base) base = FALLBACK_NAME

  return base + suffix
}
