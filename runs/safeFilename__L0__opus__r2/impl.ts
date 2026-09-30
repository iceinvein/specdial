const FALLBACK_BASE = 'download'
const MAX_BYTES = 255

// Characters that are illegal or dangerous in filenames on common platforms:
// path separators, Windows-reserved punctuation, C0/C1 control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g

// Invisible/bidi formatting characters that can disguise the real extension
// (e.g. "invoice‮fdp.exe" renders as "invoiceexe.pdf").
const INVISIBLE_CHARS = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g

// Device names Windows refuses as filenames, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

const encoder = new TextEncoder()

function byteLength(s: string): number {
  return encoder.encode(s).length
}

// Truncate to at most maxBytes of UTF-8 without splitting a code point.
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

// Leading dots would create hidden files or "." / ".." path segments;
// trailing dots and spaces are silently stripped by Windows.
function trimEdges(s: string): string {
  return s.replace(/^[\s.]+|[\s.]+$/g, '')
}

function cleanBase(raw: string): string {
  return trimEdges(
    raw
      .normalize('NFC')
      .replace(INVISIBLE_CHARS, '')
      .replace(UNSAFE_CHARS, '_')
      .replace(/\s+/g, ' ')
      .replace(/_+/g, '_'),
  )
}

function cleanExtension(extension: string): string {
  // Accept "pdf" or ".pdf"; keep only characters that are safe everywhere.
  return extension.normalize('NFC').replace(/[^A-Za-z0-9]/g, '')
}

/**
 * Build a safe download filename from user-entered text and a file extension.
 *
 * - Path separators, reserved punctuation and control characters become "_".
 * - Invisible and bidirectional-override characters are removed.
 * - Leading/trailing dots and whitespace are trimmed; whitespace is collapsed.
 * - Windows device names (CON, NUL, COM1, ...) are prefixed with "_".
 * - An empty result falls back to "download".
 * - The result fits in 255 UTF-8 bytes, truncating the base name, never the extension.
 *
 * safeFilename("report", "pdf") === "report.pdf"
 */
export function safeFilename(raw: string, extension: string): string {
  const ext = cleanExtension(extension)
  const suffix = ext ? `.${ext}` : ''

  let base = cleanBase(raw)
  if (!base) base = FALLBACK_BASE

  // Windows treats "CON.txt" and "con.tar.gz" as the device too.
  const stem = base.split('.')[0].trim()
  if (WINDOWS_RESERVED.test(stem)) base = `_${base}`

  const budget = Math.max(1, MAX_BYTES - byteLength(suffix))
  base = trimEdges(truncateBytes(base, budget)) || FALLBACK_BASE

  return truncateBytes(`${base}${suffix}`, MAX_BYTES)
}
