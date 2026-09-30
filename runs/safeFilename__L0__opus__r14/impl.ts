const MAX_BYTES = 255
const FALLBACK_BASE = 'download'

// Characters that are illegal or meaningful in filenames on Windows/macOS/Linux.
const RESERVED_CHARS = /[<>:"/\\|?*]/g
// C0/C1 control characters.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g
// Bidi overrides/isolates and zero-width characters. These can make a name
// like "invoice\u202efdp.exe" display as "invoiceexe.pdf".
const INVISIBLE_CHARS = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g
// Device names Windows refuses to use as filenames, with or without extension.
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i
const VALID_EXTENSION = /^[a-z0-9]+$/i

const encoder = new TextEncoder()
const byteLength = (s: string) => encoder.encode(s).length

/**
 * Builds a download filename from user-entered text and a file extension.
 *
 * The result contains no path separators, reserved or control characters,
 * is not a Windows device name, does not start with a dot, and fits in
 * 255 UTF-8 bytes. Empty or fully-stripped input falls back to "download".
 *
 * `extension` is supplied by the application (with or without a leading dot)
 * and must be alphanumeric; anything else throws.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/^\./, '')
  if (!VALID_EXTENSION.test(ext)) {
    throw new TypeError(`Invalid file extension: ${JSON.stringify(extension)}`)
  }
  const suffix = `.${ext}`
  if (byteLength(suffix) >= MAX_BYTES) {
    throw new TypeError(`File extension too long: ${JSON.stringify(extension)}`)
  }

  let base = raw
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLE_CHARS, '')
    .replace(RESERVED_CHARS, '_')

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (base.toLowerCase().trimEnd().endsWith(suffix.toLowerCase())) {
    base = base.trimEnd().slice(0, -suffix.length)
  }

  base = tidy(base)
  base = truncateToBytes(base, MAX_BYTES - byteLength(suffix))
  base = tidy(base)

  if (base === '') base = FALLBACK_BASE
  if (WINDOWS_RESERVED_NAME.test(base)) base = `_${base}`

  return base + suffix
}

// Leading dots make hidden files (or "..") and trailing dots/spaces are
// silently stripped by Windows, so remove both.
function tidy(s: string): string {
  return s.replace(/^[\s.]+/, '').replace(/[\s.]+$/, '')
}

// Truncates on grapheme boundaries so we never split a surrogate pair,
// combining sequence, or emoji.
function truncateToBytes(s: string, maxBytes: number): string {
  if (byteLength(s) <= maxBytes) return s
  let out = ''
  let used = 0
  for (const { segment } of new Intl.Segmenter().segment(s)) {
    const size = byteLength(segment)
    if (used + size > maxBytes) break
    out += segment
    used += size
  }
  return out
}
