const MAX_BYTES = 255
const FALLBACK_NAME = 'download'
// Characters that are invalid on Windows or act as path separators anywhere,
// plus ASCII control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g
// Unicode format/bidi control characters (e.g. RLO) that can disguise the real extension.
const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿]/g
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i

const utf8 = new TextEncoder()

function byteLength(s: string): number {
  return utf8.encode(s).length
}

/** Truncate by whole code points so multi-byte characters are never split. */
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
  return extension
    .normalize('NFC')
    .replace(/^\.+/, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 32)
}

/**
 * Build a filename that is safe to offer as a download on Windows, macOS and Linux
 * from user-entered text and a file extension.
 *
 * Path separators, reserved and control characters are replaced with `_`, leading
 * and trailing dots/whitespace are removed, Windows device names are prefixed with
 * `_`, and the result is kept within 255 UTF-8 bytes. Falls back to `download` if
 * nothing usable remains.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = raw
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()

  // Avoid "report.pdf.pdf" when the user already typed the extension.
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = base.slice(0, -suffix.length)
  }

  const stripDotsAndSpaces = (s: string) => s.replace(/^[\s.]+|[\s.]+$/g, '')

  base = stripDotsAndSpaces(base)
  base = stripDotsAndSpaces(truncateToBytes(base, MAX_BYTES - byteLength(suffix)))

  if (!base || /^_+$/.test(base)) base = FALLBACK_NAME
  if (WINDOWS_RESERVED.test(base)) base = `_${base}`

  return truncateToBytes(base, MAX_BYTES - byteLength(suffix)) + suffix
}
