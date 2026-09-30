const MAX_BYTES = 255
const FALLBACK = 'download'

// Characters that are illegal on Windows or act as path separators anywhere.
const ILLEGAL = /[<>:"/\\|?*]/g
// C0/C1 control characters.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g
// Bidi controls, which can visually disguise the real extension (e.g. "gpj.exe").
const BIDI = /[؜‎‏‪-‮⁦-⁩]/g
// Device names Windows reserves regardless of extension.
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

// Truncate to at most `maxBytes` UTF-8 bytes without splitting a code point.
function truncateBytes(s: string, maxBytes: number): string {
  let out = ''
  let bytes = 0
  for (const ch of s) {
    const n = byteLength(ch)
    if (bytes + n > maxBytes) break
    out += ch
    bytes += n
  }
  return out
}

function cleanExtension(extension: string): string {
  return extension.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 16)
}

/**
 * Build a download filename from user-entered text and a file extension.
 * The result contains no path separators, control characters, or characters
 * illegal on Windows, is not a reserved device name, doesn't start with a dot,
 * and fits in 255 UTF-8 bytes. Falls back to "download" if nothing usable remains.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = raw
    .toWellFormed()
    .normalize('NFC')
    .replace(CONTROL, '')
    .replace(BIDI, '')
    .replace(ILLEGAL, '_')
    .replace(/\s+/g, ' ')
    .trim()

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = base.slice(0, -suffix.length)
  }

  // No hidden files or "."/"..", and Windows strips trailing dots and spaces.
  base = base.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '')

  if (!base) base = FALLBACK

  // Windows treats "CON.txt" (and "CON .txt") as the device too, so check the stem.
  const stem = base.split('.')[0].trimEnd()
  if (RESERVED.test(stem)) base = `_${base}`

  base = truncateBytes(base, MAX_BYTES - byteLength(suffix)).replace(/[.\s]+$/, '')
  if (!base) base = FALLBACK

  return base + suffix
}
