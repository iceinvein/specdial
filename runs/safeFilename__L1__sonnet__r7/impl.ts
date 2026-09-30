export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const base = name || 'resume'
  return ext ? `${base}.${ext}` : base
}
