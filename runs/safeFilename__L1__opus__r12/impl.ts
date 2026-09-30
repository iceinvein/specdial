const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200

// Characters that are invalid in Windows/POSIX paths, plus control characters.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g
// Device names that Windows refuses to use as filenames, with or without an extension.
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .normalize('NFC')
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would create hidden files or "." / ".." path segments.
    .replace(/^\.+/, '')
    // Trailing dots and dashes are stripped by Windows or look sloppy.
    .replace(/[.-]+$/, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[.-]+$/, '')

  if (name === '') name = FALLBACK_NAME
  if (RESERVED.test(name)) name = `_${name}`

  const ext = extension.replace(DISALLOWED, '').replace(/\s+/g, '').replace(/^\.+/, '')
  return ext ? `${name}.${ext}` : name
}
