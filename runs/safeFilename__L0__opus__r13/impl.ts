// Most filesystems cap a single path component at 255 bytes.
const MAX_BYTES = 255
const FALLBACK_NAME = 'download'

// Characters that are invalid on Windows or act as path separators anywhere.
const RESERVED_CHARS = /[<>:"/\\|?*]/g
// C0/C1 control characters.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g
// Bidi overrides/isolates and zero-width characters, which can disguise the
// real extension (e.g. "invoice‮fdp.exe" displays as "invoiceexe.pdf").
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤⁦-⁯﻿]/g
// Device names Windows refuses as a file's base name, with or without extension.
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

// Truncates to at most maxBytes of UTF-8 without splitting a code point.
function truncateBytes(s: string, maxBytes: number): string {
  let out = ''
  let bytes = 0
  for (const ch of s) {
    const len = byteLength(ch)
    if (bytes + len > maxBytes) break
    out += ch
    bytes += len
  }
  return out
}

function sanitizeExtension(extension: string): string {
  // Only plain alphanumerics: anything else in an extension is suspicious.
  return extension.normalize('NFKC').replace(/[^A-Za-z0-9]/g, '').toLowerCase().slice(0, 16)
}

function sanitizeBase(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .replace(CONTROL_CHARS, ' ')
    .replace(RESERVED_CHARS, '_')
    .replace(/\s+/g, ' ')
    // Leading dots would make hidden files or "." / ".." traversal names;
    // trailing dots and spaces are silently stripped by Windows.
    .replace(/^[\s.]+/, '')
    .replace(/[\s.]+$/, '')
}

/**
 * Builds a filename that is safe to offer as a download on any common OS
 * from user-entered text and an extension. Path separators, reserved and
 * control characters are neutralised, Windows device names are escaped, and
 * the result fits within 255 UTF-8 bytes. Falls back to "download" when
 * nothing usable remains.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = sanitizeExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  const maxBaseBytes = MAX_BYTES - byteLength(suffix)
  const fit = (s: string) => truncateBytes(s, maxBaseBytes).replace(/[\s.]+$/, '')

  let base = fit(sanitizeBase(raw)) || FALLBACK_NAME
  // Checked after truncation, which can itself produce a reserved name
  // ("con.x" -> "con."  -> "con"); re-fit since the prefix adds a byte.
  if (WINDOWS_RESERVED_NAME.test(base)) base = fit(`_${base}`)

  return base + suffix
}
