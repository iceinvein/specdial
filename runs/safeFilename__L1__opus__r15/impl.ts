// Characters rejected by Windows/macOS/Linux filesystems, plus control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200

export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(UNSAFE_CHARS, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would hide the file or allow "..", trailing dots are stripped by Windows.
    .replace(/^\.+|\.+$/g, '')
    .slice(0, MAX_NAME_LENGTH)

  const ext = extension.replace(UNSAFE_CHARS, '').trim().replace(/^\.+/, '')

  const base = name || FALLBACK_NAME
  return ext ? `${base}.${ext}` : base
}
