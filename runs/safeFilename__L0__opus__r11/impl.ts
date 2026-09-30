const MAX_BYTES = 255
const FALLBACK = 'download'
// Characters that are invalid on Windows, plus path separators and control characters on any OS.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g
// Invisible/bidi characters that can disguise the real name (e.g. "gpj.exe" shown as "exe.jpg").
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

const encoder = new TextEncoder()

function truncateToBytes(value: string, maxBytes: number): string {
  let result = ''
  let bytes = 0
  for (const char of value) {
    const size = encoder.encode(char).length
    if (bytes + size > maxBytes) break
    result += char
    bytes += size
  }
  return result
}

function sanitizeExtension(extension: string): string {
  return extension.normalize('NFC').replace(/[^A-Za-z0-9]/g, '').slice(0, 16)
}

/**
 * Builds a filename that is safe to use for a download on Windows, macOS and Linux
 * from untrusted user input and a file extension.
 *
 * - Path separators, reserved characters and control/invisible characters become `_`.
 * - Leading/trailing dots and whitespace are removed, so the result can't be hidden
 *   (`.bashrc`) or refer to a parent directory (`..`).
 * - Windows reserved device names (`CON`, `NUL`, `COM1`, ...) are prefixed with `_`.
 * - The extension is reduced to ASCII letters and digits; an empty extension adds no dot.
 * - The result is at most 255 UTF-8 bytes, truncating the base name, never the extension.
 * - An empty base name falls back to `download`.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = sanitizeExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = raw
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')

  if (!base || /^_+$/.test(base)) base = FALLBACK
  if (WINDOWS_RESERVED.test(base)) base = `_${base}`

  base = truncateToBytes(base, MAX_BYTES - encoder.encode(suffix).length)
  // Truncation may leave a trailing dot or space, which Windows strips silently.
  base = base.replace(/[\s.]+$/, '') || FALLBACK

  return base + suffix
}
