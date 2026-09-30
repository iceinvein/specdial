const MAX_BASE_LENGTH = 100
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    // control chars, path separators, and characters illegal on common filesystems
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    // no leading dots (hidden files, "..") and no trailing dots/spaces (Windows)
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')

  base = Array.from(base).slice(0, MAX_BASE_LENGTH).join('').trim()

  if (!base || /^_+$/.test(base)) base = 'download'
  if (RESERVED.test(base)) base = `_${base}`

  return ext ? `${base}.${ext}` : base
}
