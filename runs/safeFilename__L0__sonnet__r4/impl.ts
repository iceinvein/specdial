const MAX_BASE_LENGTH = 100
const FALLBACK_BASE = 'download'
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    // control chars, path separators, and characters illegal on Windows
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    // no leading/trailing dots or spaces (hidden files, ".." traversal, Windows)
    .replace(/^[.\s]+|[.\s]+$/g, '')

  if (base.length > MAX_BASE_LENGTH) {
    base = base.slice(0, MAX_BASE_LENGTH).replace(/[.\s]+$/, '')
  }

  if (!base || RESERVED_NAMES.test(base)) {
    base = base ? `${base}_` : FALLBACK_BASE
  }

  return ext ? `${base}.${ext}` : base
}
