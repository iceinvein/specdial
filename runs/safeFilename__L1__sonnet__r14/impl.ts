export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const base = name || 'resume'
  return ext ? `${base}.${ext}` : base
}
