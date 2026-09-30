// Characters reserved on Windows/macOS/Linux paths, plus ASCII control characters.
const DISALLOWED = /[\/\\:*?"<>|\x00-\x1f\x7f]/g

const FALLBACK_NAME = 'resume'

export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would produce hidden files or "." / ".." path segments.
    .replace(/^\.+/, '')

  const ext = extension.replace(DISALLOWED, '').trim().replace(/^\.+/, '')

  const base = name || FALLBACK_NAME
  return ext ? `${base}.${ext}` : base
}
