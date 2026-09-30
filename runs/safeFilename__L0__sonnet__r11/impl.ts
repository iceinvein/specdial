const MAX_BASE_LENGTH = 100
const FALLBACK_BASE = 'download'
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^a-zA-Z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    // control characters, path separators, and characters illegal on common filesystems
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    // leading/trailing dots and spaces (hidden files, ".." traversal, Windows trimming)
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/[.\s]+$/g, '')

  if (!base || RESERVED_NAMES.test(base)) {
    base = base ? `_${base}` : FALLBACK_BASE
  }

  return ext ? `${base}.${ext}` : base
}
