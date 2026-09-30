const FALLBACK_NAME = 'download'
const MAX_BYTES = 255

// Characters that are invalid on common filesystems (Windows is the strictest),
// C0/C1 control characters, and invisible/bidi formatting characters that can
// be used to disguise the real extension (e.g. U+202E "RIGHT-TO-LEFT OVERRIDE").
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g

// Device names reserved on Windows, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

// Truncate to at most `max` UTF-8 bytes without splitting a code point.
function truncateBytes(s: string, max: number): string {
  if (byteLength(s) <= max) return s
  let out = ''
  let bytes = 0
  for (const ch of s) {
    const n = byteLength(ch)
    if (bytes + n > max) break
    out += ch
    bytes += n
  }
  return out
}

function clean(s: string): string {
  return s
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(/\s+/g, ' ')
}

// Leading dots would make the file hidden (or be "." / ".."); trailing dots
// and spaces are silently stripped by Windows.
function trimEdges(s: string): string {
  return s.replace(/^[\s.]+/, '').replace(/[\s.]+$/, '')
}

/**
 * Builds a download filename from user-entered text and an extension.
 *
 * The result is a single path segment that is safe on Windows, macOS and
 * Linux: no path separators, reserved characters, control or bidi characters,
 * no reserved device names, no leading/trailing dots or spaces, and at most
 * 255 UTF-8 bytes. The extension is always preserved at the end. Falls back to
 * "download" when nothing usable remains of `raw`.
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = Array.from(
    extension.normalize('NFC').replace(/[^\p{L}\p{N}_-]/gu, ''),
  )
    .slice(0, 16)
    .join('')
  const suffix = ext ? `.${ext}` : ''

  let name = trimEdges(clean(raw))
  if (WINDOWS_RESERVED.test(name)) name = `_${name}`
  name = trimEdges(truncateBytes(name, MAX_BYTES - byteLength(suffix)))
  if (!name) name = FALLBACK_NAME

  return name + suffix
}
