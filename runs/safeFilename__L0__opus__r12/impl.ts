const FALLBACK_BASE = 'download'
const MAX_BYTES = 255

// Path separators, characters Windows forbids, and control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g
// Bidi controls can visually disguise the real extension (e.g. "txt.exe" shown as "exe.txt").
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g
// Windows device names are reserved regardless of extension ("CON.pdf" is still CON).
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

function truncateToBytes(s: string, maxBytes: number): string {
  let out = ''
  let used = 0
  // Iterate by code point so surrogate pairs are never split.
  for (const ch of s) {
    const size = byteLength(ch)
    if (used + size > maxBytes) break
    out += ch
    used += size
  }
  return out
}

function cleanBase(raw: string): string {
  return raw
    .toWellFormed() // lone surrogates can't be encoded in a filename
    .normalize('NFC')
    .replace(BIDI_CONTROLS, '')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+/, '') // no hidden files, no "..", no leading-dot tricks
    .replace(/[.\s]+$/, '') // Windows strips trailing dots/spaces
}

function cleanExtension(extension: string): string {
  return extension.toWellFormed().normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * Builds a filename that is safe to use for a download on Windows, macOS and
 * Linux from untrusted user input. Never returns a path, a hidden file, an
 * empty name, or a Windows reserved device name, and keeps the result within
 * 255 UTF-8 bytes. The extension is always preserved (unless it contains no
 * usable characters, in which case no extension is added).
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''
  const maxBaseBytes = Math.max(1, MAX_BYTES - byteLength(suffix))
  const safeSuffix = truncateToBytes(suffix, MAX_BYTES - 1)

  let base = cleanBase(raw)
  if (WINDOWS_RESERVED.test(base.split('.')[0].trimEnd())) base = `_${base}`
  base = truncateToBytes(base, maxBaseBytes).replace(/[.\s]+$/, '')
  if (!base) base = truncateToBytes(FALLBACK_BASE, maxBaseBytes)

  return base + safeSuffix
}
