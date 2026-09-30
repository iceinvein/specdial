const MAX_BASE_LENGTH = 100
const FALLBACK_BASE = 'download'
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')

  let base = raw
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/^[\s.]+|[\s.]+$/g, '')

  if (!base || RESERVED.test(base)) {
    base = base ? `_${base}` : FALLBACK_BASE
  }

  return ext ? `${base}.${ext}` : base
}
