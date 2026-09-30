const MAX_BASE_LENGTH = 100
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    // control chars and characters illegal on common filesystems, incl. path separators
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    // no leading/trailing dots or spaces (hidden files, ".." traversal, Windows trimming)
    .replace(/^[.\s]+|[.\s]+$/g, '')

  base = Array.from(base).slice(0, MAX_BASE_LENGTH).join('').replace(/[.\s]+$/, '')

  if (!base || RESERVED.test(base)) base = base ? `_${base}` : 'download'

  return ext ? `${base}.${ext}` : base
}
