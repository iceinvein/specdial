export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')

  const suffix = extension.startsWith('.') ? extension : `.${extension}`
  return `${base || 'resume'}${suffix}`
}
