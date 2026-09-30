const MAX_BASE_LENGTH = 100
const FALLBACK_BASE = 'download'
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    // Leading/trailing dots and spaces are unsafe (hidden files, "..", Windows)
    .replace(/^[.\s]+|[.\s]+$/g, '')

  base = Array.from(base).slice(0, MAX_BASE_LENGTH).join('').trim()
  base = base.replace(/[.\s]+$/g, '')

  if (!base || RESERVED.test(base)) {
    base = base ? `${base}_` : FALLBACK_BASE
  }

  return ext ? `${base}.${ext}` : base
}
