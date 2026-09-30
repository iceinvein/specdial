const MAX_BYTES = 255
const FALLBACK_BASE = 'download'

// Characters that are invalid on Windows or are path separators anywhere,
// plus C0/C1 control characters and lone UTF-16 surrogates.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g

// Windows device names are reserved regardless of extension (e.g. "CON.pdf").
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

function truncateToBytes(s: string, maxBytes: number): string {
  let out = ''
  let used = 0
  for (const ch of s) {
    const size = byteLength(ch)
    if (used + size > maxBytes) break
    out += ch
    used += size
  }
  return out
}

function cleanExtension(extension: string): string {
  return extension.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 16)
}

function cleanBase(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+/, '') // no hidden files, no "." / ".."
    .replace(/[.\s]+$/, '') // Windows strips trailing dots and spaces
}

/**
 * Builds a filename safe to offer as a download from user-entered text.
 *
 * Path separators, characters reserved on Windows, and control characters are
 * replaced; leading/trailing dots and whitespace are removed; Windows device
 * names are prefixed; and the result is capped at 255 UTF-8 bytes with the
 * extension preserved. Empty input falls back to "download".
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = cleanBase(raw)

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = cleanBase(base.slice(0, -suffix.length))
  }

  if (WINDOWS_RESERVED.test(base)) base = `_${base}`

  base = truncateToBytes(base, MAX_BYTES - byteLength(suffix))
  // Truncation may have exposed trailing dots/spaces again.
  base = base.replace(/[.\s]+$/, '')

  if (!base) base = FALLBACK_BASE

  return base + suffix
}
