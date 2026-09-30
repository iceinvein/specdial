export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  const name = base || 'resume'
  return ext ? `${name}.${ext}` : name
}
