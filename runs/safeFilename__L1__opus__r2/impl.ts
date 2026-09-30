const FALLBACK_NAME = 'resume'

// Characters that are reserved in Windows/macOS/Linux paths, plus control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

// Device names that Windows refuses to use as filenames, regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

const MAX_NAME_LENGTH = 200

function clean(value: string): string {
  return value
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '') // no hidden files, no "..", no trailing dots
}

export function safeFilename(raw: string, extension: string): string {
  let name = clean(raw).slice(0, MAX_NAME_LENGTH).replace(/[.-]+$/, '')
  if (!name || WINDOWS_RESERVED.test(name)) {
    name = FALLBACK_NAME
  }

  const ext = clean(extension).replace(/[^A-Za-z0-9]/g, '')
  return ext ? `${name}.${ext}` : name
}
