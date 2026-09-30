export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const name = base || 'resume'
  return ext ? `${name}.${ext}` : name
}
