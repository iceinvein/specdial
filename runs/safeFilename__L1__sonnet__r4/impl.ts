export function safeFilename(raw: string, extension: string): string {
  const base =
    raw
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
      .replace(/^\.+/, '') || 'resume'
  const ext = extension.replace(/^\.+/, '')
  return `${base}.${ext}`
}
