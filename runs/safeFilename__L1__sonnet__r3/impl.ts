export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
  const ext = extension.replace(/^\.+/, '').replace(/[^A-Za-z0-9]/g, '')
  return `${name || 'resume'}${ext ? '.' + ext : ''}`
}
