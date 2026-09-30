const FALLBACK_NAME = 'resume'
const MAX_BASE_LENGTH = 200

// Characters that are invalid in filenames on common platforms, plus control characters.
const DISALLOWED = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

// Device names Windows refuses to use as filenames, regardless of extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

function cleanPart(text: string): string {
  return text
    .replace(DISALLOWED, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function safeFilename(raw: string, extension: string): string {
  // Leading/trailing dots would produce hidden files or names like "..".
  let base = cleanPart(raw).replace(/^\.+|\.+$/g, '').slice(0, MAX_BASE_LENGTH)
  if (base === '' || WINDOWS_RESERVED.test(base)) {
    base = FALLBACK_NAME
  }

  const ext = cleanPart(extension).replace(/^\.+/, '').replace(/\./g, '')
  return ext === '' ? base : `${base}.${ext}`
}
