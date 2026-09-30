const MAX_BASE_LENGTH = 100
const FALLBACK_BASE = 'download'
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    // control characters, path separators, and characters illegal on common filesystems
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    // no leading/trailing dots or spaces (hidden files, "..", Windows trimming)
    .replace(/^[.\s]+|[.\s]+$/g, '')

  base = Array.from(base).slice(0, MAX_BASE_LENGTH).join('').replace(/[.\s]+$/g, '')

  if (!base || /^_+$/.test(base)) base = FALLBACK_BASE
  if (RESERVED_NAMES.test(base)) base = `_${base}`

  return ext ? `${base}.${ext}` : base
}
