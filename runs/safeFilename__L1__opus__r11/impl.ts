const FALLBACK_NAME = 'resume'
const MAX_NAME_LENGTH = 200

// Characters that are reserved in Windows/macOS/Linux paths, plus control characters.
const DISALLOWED_CHARS = /[\/\\:*?"<>|\u0000-\u001f\u007f]/g

// Device names Windows refuses to use as filenames, regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

export function safeFilename(raw: string, extension: string): string {
  let name = raw
    .replace(DISALLOWED_CHARS, '')
    .trim()
    .replace(/\s+/g, '-')
    // Leading dots would make hidden files or `..`; trailing dots/dashes are awkward on Windows.
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[.-]+$/, '')

  if (name === '' || WINDOWS_RESERVED.test(name)) {
    name = FALLBACK_NAME
  }

  const ext = extension.replace(DISALLOWED_CHARS, '').replace(/\s+/g, '').replace(/^\.+/, '')
  return ext ? `${name}.${ext}` : name
}
