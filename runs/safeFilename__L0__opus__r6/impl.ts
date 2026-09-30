const FALLBACK_NAME = 'download'
// Most filesystems cap a single path component at 255 bytes.
const MAX_BYTES = 255
// Path separators, characters Windows forbids, and control characters.
const UNSAFE_CHARS = /[\/\\:*?"<>|\u0000-\u001f\u007f-\u009f]/g
// Unicode bidi overrides can disguise the real extension (e.g. "evil‮fdp.exe").
const BIDI_CHARS = /[‎‏‪-‮⁦-⁩]/g
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i

const encoder = new TextEncoder()

function clean(text: string): string {
  return text
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '_')
    .replace(BIDI_CHARS, '')
    .replace(/\s+/g, ' ')
}

function truncateToBytes(text: string, maxBytes: number): string {
  let result = ''
  let bytes = 0
  // Iterate by code point so surrogate pairs are never split.
  for (const char of text) {
    const size = encoder.encode(char).length
    if (bytes + size > maxBytes) break
    result += char
    bytes += size
  }
  return result
}

export function safeFilename(raw: string, extension: string): string {
  const ext = clean(extension).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 16)
  const suffix = ext ? `.${ext}` : ''

  // Leading dots would make hidden files or "..", trailing dots/spaces are stripped by Windows.
  let base = clean(raw).trim().replace(/^[.\s]+/, '')
  base = truncateToBytes(base, MAX_BYTES - 1 - encoder.encode(suffix).length) // -1 leaves room for the reserved-name prefix
  base = base.replace(/[.\s]+$/, '')

  if (!base) base = FALLBACK_NAME
  // Windows treats "CON", "CON.txt", etc. as devices regardless of extension.
  if (WINDOWS_RESERVED.test(base.split('.')[0])) base = `_${base}`

  return base + suffix
}
