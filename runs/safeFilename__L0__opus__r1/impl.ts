const MAX_BYTES = 255
const FALLBACK = 'download'

// Characters that are invalid in filenames on Windows and/or act as path separators.
const RESERVED_CHARS = /[<>:"/\\|?*]/g
// C0/C1 control characters.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g
// Bidi controls, which can disguise the real extension (e.g. "invoice\u202Efdp.exe").
const BIDI_CHARS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g
// Device names that Windows refuses regardless of extension ("CON.pdf" is still CON).
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

const encoder = new TextEncoder()
const byteLength = (s: string) => encoder.encode(s).length

function sanitizeExtension(extension: string): string {
  return truncateToBytes(extension.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, ''), 32)
}

function trimEdges(s: string): string {
  // Leading dots create hidden files / "." and ".."; trailing dots and spaces are stripped by Windows.
  return s.replace(/^[\s.]+|[\s.]+$/g, '')
}

function truncateToBytes(s: string, maxBytes: number): string {
  let out = ''
  let bytes = 0
  // Iterate by code point so surrogate pairs are never split.
  for (const ch of s) {
    const n = byteLength(ch)
    if (bytes + n > maxBytes) break
    out += ch
    bytes += n
  }
  return out
}

/**
 * Builds a filename that is safe to offer as a download on any common OS
 * from user-entered text and a file extension.
 *
 * safeFilename("report", "pdf") === "report.pdf"
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = sanitizeExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = raw
    .normalize('NFC')
    .replace(BIDI_CHARS, '')
    .replace(CONTROL_CHARS, '')
    .replace(RESERVED_CHARS, '_')
    .replace(/\s+/g, ' ')

  base = trimEdges(base)

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = trimEdges(base.slice(0, -suffix.length))
  }

  if (WINDOWS_RESERVED_NAMES.test(base)) base = `_${base}`

  base = trimEdges(truncateToBytes(base, MAX_BYTES - byteLength(suffix)))

  if (!base) base = FALLBACK

  return base + suffix
}
