const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200
// Device names Windows refuses to use as a filename, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .normalize('NFC')
    // Keep only letters, digits, whitespace, and a few punctuation marks; this
    // drops path separators, control characters, and characters Windows rejects.
    .replace(/[^\p{L}\p{M}\p{N}\s._-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    // Leading dots make hidden files or ".."; trailing dots/spaces are stripped by Windows.
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[.-]+$/, '')

  if (!name) name = FALLBACK_NAME
  if (WINDOWS_RESERVED.test(name)) name = `${name}-file`

  const ext = extension.replace(/[^\p{L}\p{N}]/gu, '')
  return ext ? `${name}.${ext}` : name
}
