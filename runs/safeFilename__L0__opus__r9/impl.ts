// Characters that are illegal or dangerous in filenames on common platforms:
// path separators, Windows-reserved punctuation, and C0/C1 control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g

// Invisible/formatting characters that can disguise a name, e.g. the
// right-to-left override used in "invoice‮fdp.exe" spoofing.
const INVISIBLE_CHARS = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g

// Device names Windows treats specially regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

// Most filesystems cap a name at 255 bytes.
const MAX_BYTES = 255

const FALLBACK_NAME = 'download'

function clean(text: string): string {
  return text
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length
}

// Truncate to at most `maxBytes` UTF-8 bytes without splitting a code point.
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
 * Build a download filename from user-entered text and a file extension.
 *
 * The result contains no path separators, control or invisible characters,
 * cannot be hidden (leading dot) or a Windows device name, has no trailing
 * dots/spaces before the extension, and fits in 255 UTF-8 bytes.
 * Empty or fully-stripped input falls back to "download".
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = clean(extension).replace(/^\.+/, '').replace(/[. ]+$/, '')
  const suffix = ext ? `.${ext}` : ''

  // Dots and spaces are stripped at both ends: a leading dot hides the file
  // (and "." / ".." are directory references); trailing ones are dropped by
  // Windows.
  const trimEnds = (s: string) => s.replace(/^[. ]+/, '').replace(/[. ]+$/, '')

  let base = trimEnds(clean(raw))
  if (!base) base = FALLBACK_NAME

  // Windows reserves device names even with an extension ("CON.pdf"),
  // and checks only the part before the first dot.
  if (WINDOWS_RESERVED.test(base.split('.')[0].trim())) base = `_${base}`

  const budget = Math.max(MAX_BYTES - utf8Length(suffix), 1)
  base = trimEnds(truncateBytes(base, budget)) || FALLBACK_NAME

  return truncateBytes(base + suffix, MAX_BYTES)
}
