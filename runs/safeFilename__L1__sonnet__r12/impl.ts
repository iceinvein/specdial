export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(/[^\p{L}\p{N}\s_.-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const base = name || 'resume'
  return ext ? `${base}.${ext}` : base
}
