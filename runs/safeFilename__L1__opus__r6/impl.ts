const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200
// Windows reserves these device names regardless of extension.
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .normalize('NFC')
    // Characters not allowed in paths on common filesystems, plus control chars.
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    // Avoid hidden files, "..", and trailing dots/dashes that Windows strips.
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[.\-]+$/, '')

  if (!name || RESERVED_NAMES.test(name)) {
    name = FALLBACK_NAME
  }

  const ext = extension.replace(/^\.+/, '').replace(/[^A-Za-z0-9]/g, '')
  return ext ? `${name}.${ext}` : name
}
