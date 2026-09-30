const FALLBACK_BASE = 'download'

// Most filesystems cap a single path component at 255 bytes.
const MAX_BYTES = 255

// Characters that are invalid on Windows or act as path separators anywhere.
const RESERVED_CHARS = /[<>:"/\\|?*]/g

// Control characters, plus bidi overrides/isolates that can visually disguise
// an extension (e.g. "invoice‮fdp.exe" renders as "invoiceexe.pdf").
const INVISIBLE_CHARS = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu

// Device names Windows refuses regardless of extension ("CON.pdf" is still CON).
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

/** Truncate to at most `maxBytes` of UTF-8 without splitting a code point. */
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
  return extension
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .replace(RESERVED_CHARS, '')
    .replace(/\s+/g, '')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32)
}

/**
 * Build a download filename from user-entered text and a file extension.
 *
 * The result is safe to use as a single path component on Windows, macOS and
 * Linux: no separators or reserved characters, no traversal ("..") or hidden
 * dotfiles, no reserved device names, and at most 255 UTF-8 bytes. Falls back
 * to "download" when nothing usable remains.
 *
 * safeFilename("report", "pdf")      // "report.pdf"
 * safeFilename("report.pdf", "pdf")  // "report.pdf"  (no doubled extension)
 * safeFilename("../etc/passwd", "")  // "_etc_passwd"
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = raw
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .replace(RESERVED_CHARS, '_')
    .replace(/\s+/g, ' ')

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = base.slice(0, -suffix.length)
  }

  // Leading dots make hidden files or "..": trailing dots/spaces are silently
  // stripped by Windows, which could leave the name ending in a bare ".".
  const trim = (s: string) => s.replace(/^[\s.]+|[\s.]+$/g, '')

  base = trim(base)
  base = trim(truncateBytes(base, MAX_BYTES - byteLength(suffix)))

  if (!base || /^_+$/.test(base)) base = FALLBACK_BASE

  // Windows checks the part before the first dot ("con.backup.pdf" is CON).
  if (WINDOWS_RESERVED_NAMES.test(base.split('.')[0].trim())) {
    base = `_${base}`
    base = truncateBytes(base, MAX_BYTES - byteLength(suffix))
  }

  return base + suffix
}
