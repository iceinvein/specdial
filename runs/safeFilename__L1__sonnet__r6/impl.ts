export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]/gu, '')
    .replace(/^\.+/, '')
    .replace(/-{2,}/g, '-')

  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const name = base || 'resume'
  return ext ? `${name}.${ext}` : name
}
