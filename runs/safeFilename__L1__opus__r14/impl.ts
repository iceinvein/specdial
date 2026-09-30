const FALLBACK_NAME = 'resume'

// Characters that are reserved in Windows/POSIX paths, plus control characters.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

function sanitize(text: string): string {
  return text
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function safeFilename(raw: string, extension: string): string {
  // Strip leading dots so names like "..", ".env" can't become traversal or hidden files.
  const name = sanitize(raw).replace(/^\.+/, '') || FALLBACK_NAME
  const ext = sanitize(extension).replace(/^\.+/, '')
  return ext ? `${name}.${ext}` : name
}
