export function safeFilename(raw: string, extension: string): string {
  const name = raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '') || 'resume'
  const normalizedExtension = extension.replace(/^\./, '')

  return `${name}.${normalizedExtension}`
}
