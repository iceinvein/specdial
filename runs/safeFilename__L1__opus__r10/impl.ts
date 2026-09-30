const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200

// Characters that are unsafe in file paths on common platforms, plus control characters.
const DISALLOWED = /[\/\\:*?"<>|\u0000-\u001f\u007f]/g

// Device names Windows refuses as filenames, with or without an extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would make the file hidden or form a `..` traversal segment.
    .replace(/^[.\-]+/, '')
    .replace(/[.\-]+$/, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[.\-]+$/, '')

  if (name === '' || WINDOWS_RESERVED.test(name)) {
    name = FALLBACK_NAME
  }

  const ext = extension.replace(/[^A-Za-z0-9]/g, '')
  return ext === '' ? name : `${name}.${ext}`
}
