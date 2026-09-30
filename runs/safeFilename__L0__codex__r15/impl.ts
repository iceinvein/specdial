// Exclude path separators, Windows filename punctuation, and invisible controls.
function sanitize(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, '_')
    .replace(/^[.\s]+|[.\s]+$/gu, '')
}

export function safeFilename(raw: string, extension: string): string {
  let name = sanitize(raw) || 'download'
  const suffix = sanitize(extension)

  if (suffix && !name.toLowerCase().endsWith(`.${suffix.toLowerCase()}`)) {
    name += `.${suffix}`
  }

  // Windows device names remain reserved even when followed by an extension.
  if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])\s*(?:\.|$)/iu.test(name)) {
    name = `_${name}`
  }

  return name
}
