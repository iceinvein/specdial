// Characters that are invalid on Windows or are path separators anywhere, plus
// ASCII/C1 control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g

// Invisible/format characters that can be used to spoof names (e.g. RLO
// "‮" making "exe.pdf" render as "fdp.exe"), plus zero-width chars.
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁩﻿]/g

// Device names reserved on Windows, regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

// Most filesystems cap a name at 255 bytes.
const MAX_BYTES = 255

const FALLBACK_NAME = 'download'

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

function clean(s: string): string {
  return s
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    // Leading dots would hide the file / form "." or ".."; trailing dots and
    // spaces are silently stripped by Windows.
    .replace(/^[\s.]+|[\s.]+$/g, '')
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

/**
 * Build a filename that is safe to use for a download on common platforms
 * from arbitrary user-entered text and a file extension.
 *
 * - Path separators, Windows-invalid characters and control characters are
 *   replaced with "_"; invisible/bidi-override characters are removed.
 * - Leading/trailing dots and whitespace are trimmed, so the result can never
 *   be "." / ".." or a hidden file.
 * - Windows reserved device names (CON, NUL, COM1, ...) are prefixed with "_".
 * - An empty result falls back to "download".
 * - The full name, including extension, is limited to 255 UTF-8 bytes.
 *
 * The extension may be given with or without a leading dot; it is sanitized
 * the same way. If it is empty after sanitizing, no extension is added.
 */
export function safeFilename(raw: string, extension: string): string {
  let ext = clean(String(extension ?? '')).replace(/\s/g, '')
  // Keep the extension to a sane length so it can't crowd out the name.
  ext = truncateBytes(ext, 32).replace(/\.+$/, '')
  const suffix = ext ? `.${ext}` : ''

  let name = clean(String(raw ?? ''))
  name = truncateBytes(name, MAX_BYTES - byteLength(suffix))
  // Truncation may expose trailing dots/spaces again.
  name = name.replace(/[\s.]+$/, '')

  if (!name) name = FALLBACK_NAME
  if (WINDOWS_RESERVED.test(name.split('.')[0].trim())) name = `_${name}`

  return truncateBytes(name, MAX_BYTES - byteLength(suffix)) + suffix
}
